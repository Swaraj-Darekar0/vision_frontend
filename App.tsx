import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Animated, Image, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DefaultTheme, NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { useFonts } from 'expo-font';

import AppNavigator from './src/navigation/AppNavigator';
import { GradientCanvas } from './src/components/GradientCanvas';
import { GradientProvider, useGradient } from './src/context/GradientContext';
import { useAuthStore } from './src/store/authStore';
import { RootStackParamList } from './src/types/navigation';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// Configure notifications behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: 'transparent',
    card: 'transparent',
    border: 'transparent',
  },
};

function GradientNavigationBridge({
  navigationRef,
}: {
  navigationRef: React.RefObject<NavigationContainerRef<RootStackParamList> | null>;
}) {
  const { transitionToRoute } = useGradient();

  const handleReady = useCallback(() => {
    const routeName = navigationRef.current?.getCurrentRoute()?.name;
    if (routeName) {
      transitionToRoute(routeName, true);
    }
  }, [navigationRef, transitionToRoute]);

  const handleStateChange = useCallback(() => {
    const routeName = navigationRef.current?.getCurrentRoute()?.name;
    if (routeName) {
      transitionToRoute(routeName);
    }
  }, [navigationRef, transitionToRoute]);

  return (
    <View style={styles.container}>
      <GradientCanvas />
      <NavigationContainer
        ref={navigationRef}
        theme={navigationTheme}
        onReady={handleReady}
        onStateChange={handleStateChange}
      >
        <AppNavigator />
        <StatusBar style="light" />
      </NavigationContainer>
    </View>
  );
}

const APP_LOGO = require('./assets/images/logo2.png');
const STARTUP_FADE_DURATION_MS = 360;
const STARTUP_HOLD_DELAY_MS = 140;

function StartupOverlay({
  opacity,
}: {
  opacity: Animated.Value;
}) {
  return (
    <Animated.View pointerEvents="none" style={[styles.startupOverlay, { opacity }]}>
      <View style={styles.startupBackdrop}>
        <Image source={APP_LOGO} style={styles.startupLogo} resizeMode="contain" />
      </View>
    </Animated.View>
  );
}

function RootAppShell({
  navigationRef,
  fontsLoaded,
}: {
  navigationRef: React.RefObject<NavigationContainerRef<RootStackParamList> | null>;
  fontsLoaded: boolean;
}) {
  const initialize = useAuthStore((state) => state.initialize);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const shouldShowWelcome = useAuthStore((state) => state.shouldShowWelcome);
  const {
    prepareStartupRouteMorph,
    startPreparedStartupMorph,
    markStartupReady,
    completeStartupPhase,
  } = useGradient();

  const startupOpacity = useRef(new Animated.Value(1)).current;
  const hasInitializedAuthRef = useRef(false);
  const startupPreparedRef = useRef(false);
  const startupRevealRef = useRef(false);
  const hasHiddenSplashRef = useRef(false);
  const [isStartupOverlayVisible, setIsStartupOverlayVisible] = useState(true);

  const shouldPrepareWelcomeStartup = useMemo(
    () => isAuthenticated && shouldShowWelcome,
    [isAuthenticated, shouldShowWelcome],
  );

  useEffect(() => {
    if (hasInitializedAuthRef.current) {
      return;
    }

    hasInitializedAuthRef.current = true;
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!fontsLoaded || isLoading || startupPreparedRef.current) {
      return;
    }

    if (shouldPrepareWelcomeStartup) {
      prepareStartupRouteMorph('Welcome');
    } else {
      markStartupReady();
    }

    startupPreparedRef.current = true;
  }, [
    fontsLoaded,
    isLoading,
    markStartupReady,
    prepareStartupRouteMorph,
    shouldPrepareWelcomeStartup,
  ]);

  const isStartupReady = fontsLoaded && !isLoading && startupPreparedRef.current;

  useEffect(() => {
    if (!fontsLoaded || hasHiddenSplashRef.current) {
      return;
    }

    hasHiddenSplashRef.current = true;
    SplashScreen.hideAsync().catch((error) => {
      console.warn('[App] Failed to hide splash screen:', error);
    });
  }, [fontsLoaded]);

  useEffect(() => {
    if (!isStartupReady || startupRevealRef.current) {
      return;
    }

    startupRevealRef.current = true;

    const revealTimer = setTimeout(() => {
      if (shouldPrepareWelcomeStartup) {
        startPreparedStartupMorph();
      }

      Animated.timing(startupOpacity, {
        toValue: 0,
        duration: STARTUP_FADE_DURATION_MS,
        useNativeDriver: true,
      }).start(() => {
        setIsStartupOverlayVisible(false);
        completeStartupPhase();
      });
    }, STARTUP_HOLD_DELAY_MS);

    return () => clearTimeout(revealTimer);
  }, [
    completeStartupPhase,
    isStartupReady,
    shouldPrepareWelcomeStartup,
    startPreparedStartupMorph,
    startupOpacity,
  ]);

  return (
    <View style={styles.container}>
      <GradientNavigationBridge navigationRef={navigationRef} />
      {isStartupOverlayVisible ? <StartupOverlay opacity={startupOpacity} /> : null}
    </View>
  );
}

export default function App() {
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  const [fontsLoaded] = useFonts({
    'Grift-Bold': require('./assets/fonts/Grift-Bold.otf'),
    'Grift-Black': require('./assets/fonts/Grift-Black.otf'),
    'Garnetta-Exfontceb7': require('./assets/fonts/Garnetta-Exfontceb7.otf'),
  });

  useEffect(() => {
    // Request notification permissions
    const setupNotifications = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('[App] Notification permissions not granted');
      }
    };

    setupNotifications();

    // Handle notification response (tapping notification)
    const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      const sessionId = response.notification.request.content.data?.sessionId as string | undefined;
      if (sessionId && navigationRef.current) {
        navigationRef.current.navigate('SessionDetail', { sessionId });
      }
    });

    return () => {
      responseListener.remove();
    };
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <QueryClientProvider client={queryClient}>
        <GradientProvider>
          <RootAppShell navigationRef={navigationRef} fontsLoaded={fontsLoaded} />
        </GradientProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#050505',
  },
  startupOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
  },
  startupBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
  },
  startupLogo: {
    width: 164,
    height: 164,
    opacity: 0.96,
  },
});
