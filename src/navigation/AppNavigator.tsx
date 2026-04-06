import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { RootStackParamList } from '../types/navigation';

// Screens
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import DashboardScreen from '../screens/DashboardScreen';
import DiagnosticEntryScreen from '../screens/DiagnosticEntryScreen';
import PostAssessmentScreen from '../screens/PostAssessmentScreen';
import PersonalizationOnboardingScreen from '../screens/PersonalizationOnboardingScreen';
import PaywallScreen from '../screens/PaywallScreen';
import WeeklyReviewScreen from '../screens/WeeklyReviewScreen';
import RecordingScreen from '../screens/RecordingScreen';
import ProcessingScreen from '../screens/ProcessingScreen';
import ResultsScreen from '../screens/ResultsScreen';
import SessionHistoryScreen from '../screens/SessionHistoryScreen';
import SessionDetailScreen from '../screens/SessionDetailScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  const { isAuthenticated, isLoading, shouldShowWelcome } = useAuthStore();

  if (isLoading) {
    return null; // Or a proper SplashScreen component
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
        animation: 'fade',
        animationDuration: 200,
      }}
    >
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
        </>
      ) : (
        <>
          {shouldShowWelcome && <Stack.Screen name="Welcome" component={WelcomeScreen} />}
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen name="DiagnosticEntry" component={DiagnosticEntryScreen} />
          <Stack.Screen name="PostAssessment" component={PostAssessmentScreen} />
          <Stack.Screen name="PersonalizationOnboarding" component={PersonalizationOnboardingScreen} />
          <Stack.Screen name="Paywall" component={PaywallScreen} />
          <Stack.Screen name="WeeklyReview" component={WeeklyReviewScreen} />
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
