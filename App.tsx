import React, { useCallback, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Notifications from 'expo-notifications';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';

import AppNavigator from './src/navigation/AppNavigator';
import { drainOfflineQueue } from './src/utils/queueDrain';
import { OFFLINE_QUEUE } from './src/theme/constants';
import { RootStackParamList } from './src/types/navigation';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// Configure notifications behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Register background task for offline queue draining
TaskManager.defineTask(OFFLINE_QUEUE.BACKGROUND_TASK_NAME, async () => {
  try {
    await drainOfflineQueue();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('[BackgroundTask] Queue drain failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export default function App() {
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  useEffect(() => {
    // 1. Register background fetch
    const registerBackgroundFetch = async () => {
      try {
        const isRegistered = await TaskManager.isTaskRegisteredAsync(OFFLINE_QUEUE.BACKGROUND_TASK_NAME);
        if (!isRegistered) {
          await BackgroundFetch.registerTaskAsync(OFFLINE_QUEUE.BACKGROUND_TASK_NAME, {
            minimumInterval: 15 * 60, // 15 minutes
            stopOnTerminate: false,
            startOnBoot: true,
          });
        }
      } catch (err) {
        console.warn('[App] BackgroundFetch registration failed:', err);
      }
    };

    // 2. Request notification permissions
    const setupNotifications = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('[App] Notification permissions not granted');
      }
    };

    registerBackgroundFetch();
    setupNotifications();

    // 3. Handle notification response (tapping notification)
    const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      const sessionId = response.notification.request.content.data?.sessionId;
      if (sessionId && navigationRef.current) {
        navigationRef.current.navigate('SessionDetail', { sessionId });
      }
    });

    return () => {
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer ref={navigationRef}>
          <AppNavigator />
          <StatusBar style="light" />
        </NavigationContainer>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
});
