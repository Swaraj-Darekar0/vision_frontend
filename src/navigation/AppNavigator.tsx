import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { RootStackParamList } from '../types/navigation';

// Screens
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import DashboardScreen from '../screens/DashboardScreen';
import RecordingScreen from '../screens/RecordingScreen';
import ProcessingScreen from '../screens/ProcessingScreen';
import ResultsScreen from '../screens/ResultsScreen';
import SessionHistoryScreen from '../screens/SessionHistoryScreen';
import SessionDetailScreen from '../screens/SessionDetailScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  const { isAuthenticated, isLoading, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, []);

  if (isLoading) {
    return null; // Or a proper SplashScreen component
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen name="Recording" component={RecordingScreen} />
          <Stack.Screen name="Processing" component={ProcessingScreen} />
          <Stack.Screen name="Results" component={ResultsScreen} />
          <Stack.Screen name="SessionHistory" component={SessionHistoryScreen} />
          <Stack.Screen name="SessionDetail" component={SessionDetailScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
