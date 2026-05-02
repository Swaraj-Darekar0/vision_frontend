import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Asset } from 'expo-asset';
import { ImageSourcePropType } from 'react-native';
import {
  Easing,
  SharedValue,
  runOnJS,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { AUTH_WALLPAPER_IMAGE } from '../constants/gradients';
import { RootStackParamList } from '../types/navigation';

type TransitionPhase = 'auth' | 'morphing' | 'ambient';
type StartupState = 'blocked' | 'ready' | 'first-morph-pending' | 'normal';

type MajorRouteName =
  | 'Welcome'
  | 'Dashboard'
  | 'Profile'
  | 'SessionHistory'
  | 'SessionDetail'
  | 'Results'
  | 'WeeklyReview';

type RouteMorphProfile = {
  pullStrength: number;
  swirlStrength: number;
  diffusionStrength: number;
  grainStrength: number;
  flowBiasX: number;
  flowBiasY: number;
};

const ROUTE_MORPH_DURATION_MS = 950;

const MAJOR_ROUTES = new Set<MajorRouteName>([
  'Welcome',
  'Dashboard',
  'Profile',
  'SessionHistory',
  'SessionDetail',
  'Results',
  'WeeklyReview',
]);

const ROUTE_PROFILE_RANGES: Record<MajorRouteName, {
  pull: [number, number];
  swirl: [number, number];
  diffusion: [number, number];
  grain: [number, number];
  flowX: [number, number];
  flowY: [number, number];
}> = {
  Welcome: {
    pull: [1.02, 1.14],
    swirl: [0.98, 1.12],
    diffusion: [1.04, 1.12],
    grain: [0.94, 1.02],
    flowX: [-0.06, 0.06],
    flowY: [-0.05, 0.08],
  },
  Dashboard: {
    pull: [0.92, 1.03],
    swirl: [0.82, 0.94],
    diffusion: [0.98, 1.08],
    grain: [0.88, 0.98],
    flowX: [-0.12, 0.12],
    flowY: [-0.08, 0.08],
  },
  Profile: {
    pull: [0.98, 1.12],
    swirl: [0.94, 1.1],
    diffusion: [1.02, 1.14],
    grain: [0.9, 1.0],
    flowX: [-0.08, 0.1],
    flowY: [-0.02, 0.12],
  },
  SessionHistory: {
    pull: [1.06, 1.2],
    swirl: [1.02, 1.18],
    diffusion: [1.0, 1.12],
    grain: [0.96, 1.04],
    flowX: [0.04, 0.16],
    flowY: [-0.06, 0.04],
  },
  SessionDetail: {
    pull: [1.08, 1.24],
    swirl: [1.06, 1.22],
    diffusion: [1.03, 1.15],
    grain: [0.96, 1.06],
    flowX: [-0.16, -0.04],
    flowY: [-0.04, 0.08],
  },
  Results: {
    pull: [1.12, 1.28],
    swirl: [1.1, 1.26],
    diffusion: [1.18, 1.32],
    grain: [0.92, 1.0],
    flowX: [-0.1, 0.1],
    flowY: [0.02, 0.16],
  },
  WeeklyReview: {
    pull: [1.08, 1.22],
    swirl: [1.08, 1.22],
    diffusion: [1.16, 1.28],
    grain: [0.94, 1.02],
    flowX: [-0.08, 0.08],
    flowY: [0.04, 0.14],
  },
};

function randomInRange([min, max]: [number, number]) {
  return min + Math.random() * (max - min);
}

function isMajorRoute(routeName: string): routeName is MajorRouteName {
  return MAJOR_ROUTES.has(routeName as MajorRouteName);
}

function buildMorphProfile(routeName: MajorRouteName): RouteMorphProfile {
  const ranges = ROUTE_PROFILE_RANGES[routeName];

  return {
    pullStrength: randomInRange(ranges.pull),
    swirlStrength: randomInRange(ranges.swirl),
    diffusionStrength: randomInRange(ranges.diffusion),
    grainStrength: randomInRange(ranges.grain),
    flowBiasX: randomInRange(ranges.flowX),
    flowBiasY: randomInRange(ranges.flowY),
  };
}

export interface GradientContextValue {
  progress: SharedValue<number>;
  seed: SharedValue<number>;
  originX: SharedValue<number>;
  originY: SharedValue<number>;
  pullStrength: SharedValue<number>;
  swirlStrength: SharedValue<number>;
  diffusionStrength: SharedValue<number>;
  grainStrength: SharedValue<number>;
  flowBiasX: SharedValue<number>;
  flowBiasY: SharedValue<number>;
  imageSource: ImageSourcePropType;
  imageUri: string | null;
  phase: TransitionPhase;
  startupState: StartupState;
  isTransitioning: boolean;
  setImageUri: (source: string | number) => void;
  startAuthToWelcomeTransition: (onNavigate: () => void) => void;
  prepareStartupRouteMorph: (routeName: MajorRouteName) => void;
  startPreparedStartupMorph: () => void;
  markStartupReady: () => void;
  completeStartupPhase: () => void;
  resetToAuthState: () => void;
  transitionToRoute: (routeName: keyof RootStackParamList | string, initial?: boolean) => void;
}

const GradientContext = createContext<GradientContextValue | null>(null);

export const GradientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const progress = useSharedValue(0);
  const seed = useSharedValue(1);
  const originX = useSharedValue(0.5);
  const originY = useSharedValue(0.48);
  const pullStrength = useSharedValue(1);
  const swirlStrength = useSharedValue(1);
  const diffusionStrength = useSharedValue(1);
  const grainStrength = useSharedValue(1);
  const flowBiasX = useSharedValue(0);
  const flowBiasY = useSharedValue(0);

  const [imageSource, setImageSource] = useState<ImageSourcePropType>(AUTH_WALLPAPER_IMAGE);
  const [imageUri, setImageUriState] = useState<string | null>(null);
  const [phase, setPhase] = useState<TransitionPhase>('auth');
  const [startupState, setStartupState] = useState<StartupState>('blocked');
  const [isTransitioning, setIsTransitioning] = useState(false);

  const isTransitioningRef = useRef(false);
  const currentRouteRef = useRef<string | null>(null);
  const pendingRouteRef = useRef<string | null>(null);
  const preparedStartupRouteRef = useRef<MajorRouteName | null>(null);

  const resolveImageUri = useCallback(async (source: string | number) => {
    if (typeof source === 'number') {
      const asset = Asset.fromModule(source);
      await asset.downloadAsync();
      return asset.localUri ?? asset.uri;
    }

    return source;
  }, []);

  const setImageUri = useCallback(
    (source: string | number) => {
      setImageSource(typeof source === 'number' ? source : { uri: source });
      resolveImageUri(source)
        .then((uri) => {
          if (uri) {
            setImageUriState(uri);
          }
        })
        .catch((error) => {
          console.warn('[Gradient] Failed to resolve wallpaper image:', error);
        });
    },
    [resolveImageUri],
  );

  useEffect(() => {
    setImageUri(AUTH_WALLPAPER_IMAGE);
  }, [setImageUri]);

  const applyMorphProfile = useCallback((profile: RouteMorphProfile) => {
    pullStrength.value = profile.pullStrength;
    swirlStrength.value = profile.swirlStrength;
    diffusionStrength.value = profile.diffusionStrength;
    grainStrength.value = profile.grainStrength;
    flowBiasX.value = profile.flowBiasX;
    flowBiasY.value = profile.flowBiasY;
  }, [diffusionStrength, flowBiasX, flowBiasY, grainStrength, pullStrength, swirlStrength]);

  const finalizeMorphOnJS = useCallback(() => {
    setPhase('ambient');
    setIsTransitioning(false);
    isTransitioningRef.current = false;
    setStartupState('normal');

    if (pendingRouteRef.current) {
      currentRouteRef.current = pendingRouteRef.current;
    }

    pendingRouteRef.current = null;
  }, []);

  const resetToAuthState = useCallback(() => {
    isTransitioningRef.current = false;
    pendingRouteRef.current = null;
    preparedStartupRouteRef.current = null;
    currentRouteRef.current = 'Login';

    setIsTransitioning(false);
    setPhase('auth');
    setStartupState('blocked');
    progress.value = 0;
    pullStrength.value = 1;
    swirlStrength.value = 1;
    diffusionStrength.value = 1;
    grainStrength.value = 1;
    flowBiasX.value = 0;
    flowBiasY.value = 0;
  }, [diffusionStrength, flowBiasX, flowBiasY, grainStrength, progress, pullStrength, swirlStrength]);

  const markStartupReady = useCallback(() => {
    setStartupState((current) => (current === 'blocked' ? 'ready' : current));
  }, []);

  const completeStartupPhase = useCallback(() => {
    setStartupState('normal');
  }, []);

  const beginMorphForRoute = useCallback(
    (routeName: MajorRouteName, onNavigate?: () => void) => {
      if (isTransitioningRef.current) {
        return;
      }

      const profile = buildMorphProfile(routeName);
      seed.value = Math.random() * 1000 + 1;
      originX.value = 0.05 + Math.random() * 0.9;
      originY.value = 0.05 + Math.random() * 0.9;
      applyMorphProfile(profile);

      pendingRouteRef.current = routeName;
      isTransitioningRef.current = true;
      setIsTransitioning(true);
      setPhase('morphing');
      progress.value = 0;

      progress.value = withTiming(
        1,
        {
          duration: ROUTE_MORPH_DURATION_MS,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
        },
        (finished) => {
          if (finished) {
            runOnJS(finalizeMorphOnJS)();
          }
        },
      );

      if (onNavigate) {
        onNavigate();
      }
    },
    [applyMorphProfile, finalizeMorphOnJS, originX, originY, progress, seed],
  );

  const startAuthToWelcomeTransition = useCallback(
    (onNavigate: () => void) => {
      beginMorphForRoute('Welcome', onNavigate);
    },
    [beginMorphForRoute],
  );

  const prepareStartupRouteMorph = useCallback(
    (routeName: MajorRouteName) => {
      preparedStartupRouteRef.current = routeName;
      currentRouteRef.current = routeName;
      pendingRouteRef.current = null;
      isTransitioningRef.current = false;

      const profile = buildMorphProfile(routeName);
      applyMorphProfile(profile);
      seed.value = Math.random() * 1000 + 1;
      originX.value = 0.05 + Math.random() * 0.9;
      originY.value = 0.05 + Math.random() * 0.9;
      progress.value = 0;

      setPhase('auth');
      setIsTransitioning(false);
      setStartupState('first-morph-pending');
    },
    [applyMorphProfile, originX, originY, progress, seed],
  );

  const startPreparedStartupMorph = useCallback(() => {
    const routeName = preparedStartupRouteRef.current;
    if (!routeName || isTransitioningRef.current) {
      return;
    }

    preparedStartupRouteRef.current = null;
    pendingRouteRef.current = routeName;
    isTransitioningRef.current = true;
    setIsTransitioning(true);
    setPhase('morphing');

    progress.value = 0;
    progress.value = withTiming(
      1,
      {
        duration: ROUTE_MORPH_DURATION_MS,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
      },
      (finished) => {
        if (finished) {
          runOnJS(finalizeMorphOnJS)();
        }
      },
    );
  }, [finalizeMorphOnJS, progress]);

  const transitionToRoute = useCallback(
    (routeName: keyof RootStackParamList | string, initial = false) => {
      if (routeName === 'Login' || routeName === 'Signup') {
        currentRouteRef.current = routeName;
        resetToAuthState();
        return;
      }

      if (!isMajorRoute(routeName)) {
        currentRouteRef.current = routeName;
        return;
      }

      if (preparedStartupRouteRef.current === routeName) {
        currentRouteRef.current = routeName;
        return;
      }

      if (pendingRouteRef.current === routeName) {
        currentRouteRef.current = routeName;
        return;
      }

      if (initial) {
        currentRouteRef.current = routeName;
        const initialProfile = buildMorphProfile(routeName);
        applyMorphProfile(initialProfile);
        seed.value = Math.random() * 1000 + 1;
        originX.value = 0.05 + Math.random() * 0.9;
        originY.value = 0.05 + Math.random() * 0.9;
        progress.value = routeName === 'Welcome' ? 1 : 1;
        setPhase('ambient');
        return;
      }

      if (currentRouteRef.current === routeName || isTransitioningRef.current) {
        return;
      }

      beginMorphForRoute(routeName);
    },
    [applyMorphProfile, beginMorphForRoute, originX, originY, progress, resetToAuthState, seed],
  );

  const value = useMemo(
    () => ({
      progress,
      seed,
      originX,
      originY,
      pullStrength,
      swirlStrength,
      diffusionStrength,
      grainStrength,
      flowBiasX,
      flowBiasY,
      imageSource,
      imageUri,
      phase,
      startupState,
      isTransitioning,
      setImageUri,
      startAuthToWelcomeTransition,
      prepareStartupRouteMorph,
      startPreparedStartupMorph,
      markStartupReady,
      completeStartupPhase,
      resetToAuthState,
      transitionToRoute,
    }),
    [
      diffusionStrength,
      flowBiasX,
      flowBiasY,
      grainStrength,
      imageSource,
      imageUri,
      isTransitioning,
      completeStartupPhase,
      originX,
      originY,
      phase,
      progress,
      pullStrength,
      markStartupReady,
      prepareStartupRouteMorph,
      resetToAuthState,
      seed,
      setImageUri,
      startPreparedStartupMorph,
      startAuthToWelcomeTransition,
      startupState,
      swirlStrength,
      transitionToRoute,
    ],
  );

  return <GradientContext.Provider value={value}>{children}</GradientContext.Provider>;
};

export function useGradient() {
  const context = useContext(GradientContext);
  if (!context) {
    throw new Error('useGradient must be used within a GradientProvider');
  }

  return context;
}
