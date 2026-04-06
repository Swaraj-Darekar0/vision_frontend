import { useCallback } from 'react';
import type { NavigationProp } from '@react-navigation/native';

import { useGradient } from '../context/GradientContext';
import type { RootStackParamList } from '../types/navigation';

export function useGradientTransition() {
  const {
    isTransitioning,
    resetToAuthState,
    startAuthToWelcomeTransition,
  } = useGradient();

  const handleSignIn = useCallback(
    (navigation: NavigationProp<RootStackParamList>) => {
      if (isTransitioning) {
        return;
      }

      startAuthToWelcomeTransition(() => {
        navigation.navigate('Welcome');
      });
    },
    [isTransitioning, startAuthToWelcomeTransition],
  );

  const handleSignOut = useCallback(
    (navigation: NavigationProp<RootStackParamList>) => {
      resetToAuthState();
      navigation.navigate('Login');
    },
    [resetToAuthState],
  );

  const ensureAuthState = useCallback(() => {
    resetToAuthState();
  }, [resetToAuthState]);

  return {
    ensureAuthState,
    handleSignIn,
    handleSignOut,
    isTransitioning,
  };
}
