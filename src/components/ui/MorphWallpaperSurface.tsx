import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  ImageSourcePropType,
  LayoutChangeEvent,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Asset } from 'expo-asset';
import {
  Canvas,
  Fill,
  ImageShader,
  Shader,
  Skia,
  useImage,
} from '@shopify/react-native-skia';
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { radius } from '../../theme';

const CARD_WALLPAPER = require('../../../assets/images/bg.png');
const resolvedImageUriCache = new Map<string | number, string | null>();
const resolvingImageUriCache = new Map<string | number, Promise<string | null>>();

async function resolveImageUri(source: ImageSourcePropType): Promise<string | null> {
  if (typeof source === 'number') {
    if (resolvedImageUriCache.has(source)) {
      return resolvedImageUriCache.get(source) ?? null;
    }

    const existingPromise = resolvingImageUriCache.get(source);
    if (existingPromise) {
      return existingPromise;
    }

    const asset = Asset.fromModule(source);
    const immediateUri = asset.localUri ?? asset.uri ?? null;
    if (immediateUri) {
      resolvedImageUriCache.set(source, immediateUri);
      return immediateUri;
    }

    const promise = asset.downloadAsync()
      .then(() => {
        const uri = asset.localUri ?? asset.uri ?? null;
        resolvedImageUriCache.set(source, uri);
        resolvingImageUriCache.delete(source);
        return uri;
      })
      .catch((error) => {
        resolvingImageUriCache.delete(source);
        throw error;
      });

    resolvingImageUriCache.set(source, promise);
    return promise;
  }

  if (typeof source === 'object' && source && 'uri' in source && typeof source.uri === 'string') {
    return source.uri;
  }

  return null;
}

const CARD_MORPH_SHADER_SOURCE = `
uniform shader image;
uniform float progress;
uniform float2 resolution;
uniform float seed;
uniform float2 distortOrigin;
uniform float pullStrength;
uniform float swirlStrength;
uniform float diffusionStrength;
uniform float grainStrength;
uniform float2 flowBias;

float hash21(float2 p) {
  p = fract(p * float2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float gold_noise(float2 xy, float seedValue) {
  return fract(tan(distance(xy * 1.61803398875, xy) * seedValue) * xy.x);
}

float noise(float2 p) {
  float2 i = floor(p);
  float2 f = fract(p);

  float a = hash21(i);
  float b = hash21(i + float2(1.0, 0.0));
  float c = hash21(i + float2(0.0, 1.0));
  float d = hash21(i + float2(1.0, 1.0));

  float2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

half4 main(float2 xy) {
  float2 uv = xy / resolution;
  float2 fromOrigin = uv - distortOrigin;
  float dist = length(fromOrigin);
  float radial = max(0.0, 1.0 - dist * 1.65);

  float n1 = noise((uv + distortOrigin * 0.37 + seed * 0.0017) * 7.5);
  float n2 = noise((uv * 12.0) + seed * 0.0031);
  float swirl = (n2 - 0.5) * 0.14 * swirlStrength * progress;
  float pull = (0.04 + n1 * 0.05) * pullStrength * radial * progress;

  float2 direction = normalize(fromOrigin + float2(0.0001, 0.0001));
  float2 tangent = normalize(float2(-direction.y, direction.x));
  float2 dynamicUV = uv + direction * pull + tangent * swirl + flowBias * 0.045 * progress;

  float shimmer = (gold_noise(dynamicUV * 3.7 + seed * 0.013, seed + 4.0) - 0.5) * 0.018 * progress;
  dynamicUV += shimmer;
  dynamicUV = clamp(dynamicUV, float2(0.0), float2(1.0));

  half4 sampled = image.eval(dynamicUV * resolution);
  float3 ambientBase = sampled.rgb * (1.0 - progress * 0.38 * diffusionStrength);
  float3 ambientTint = float3(0.08, 0.08, 0.08);
  float3 ambient = mix(
    ambientBase,
    ambientBase * 0.74 + ambientTint,
    clamp(progress * 0.62 * diffusionStrength, 0.0, 1.0)
  );

  float fog = smoothstep(0.0, 1.0, progress) * (0.03 + radial * 0.05);
  ambient += fog * float3(0.015, 0.015, 0.015);

  float grain = (hash21(xy * 0.71 + seed * 17.0) - 0.5) * 0.028 * grainStrength * progress;
  ambient += grain;
  ambient = clamp(ambient, 0.0, 1.0);

  return half4(ambient, sampled.a);
}
`;

const CARD_MORPH_EFFECT = Skia.RuntimeEffect.Make(CARD_MORPH_SHADER_SOURCE);

if (!CARD_MORPH_EFFECT) {
  throw new Error('Failed to compile card morph runtime effect.');
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

interface MorphWallpaperSurfaceProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  imageSource?: ImageSourcePropType;
  borderless?: boolean;
  isActive?: boolean;
}

export const MorphWallpaperSurface: React.FC<MorphWallpaperSurfaceProps> = ({
  children,
  style,
  contentStyle,
  imageSource = CARD_WALLPAPER,
  borderless = false,
  isActive = true,
}) => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const image = useImage(imageUri ?? undefined);
  const progress = useSharedValue(0);
  const seed = useSharedValue(randomBetween(1, 1000));
  const originX = useSharedValue(randomBetween(0.08, 0.92));
  const originY = useSharedValue(randomBetween(0.08, 0.92));
  const pullStrength = useSharedValue(randomBetween(0.95, 1.15));
  const swirlStrength = useSharedValue(randomBetween(0.9, 1.14));
  const diffusionStrength = useSharedValue(randomBetween(0.92, 1.12));
  const grainStrength = useSharedValue(randomBetween(0.88, 1.02));
  const flowBiasX = useSharedValue(randomBetween(-0.12, 0.12));
  const flowBiasY = useSharedValue(randomBetween(-0.1, 0.1));
  const wasActiveRef = useRef(false);

  useEffect(() => {
    resolveImageUri(imageSource)
      .then((uri) => {
        setImageUri(uri);
      })
      .catch((error) => {
        console.warn('[MorphWallpaperSurface] Failed to load card wallpaper:', error);
      });
  }, [imageSource]);

  const triggerMorph = useCallback(() => {
    seed.value = randomBetween(1, 1000);
    originX.value = randomBetween(0.08, 0.92);
    originY.value = randomBetween(0.08, 0.92);
    pullStrength.value = randomBetween(0.95, 1.15);
    swirlStrength.value = randomBetween(0.9, 1.14);
    diffusionStrength.value = randomBetween(0.92, 1.12);
    grainStrength.value = randomBetween(0.88, 1.02);
    flowBiasX.value = randomBetween(-0.12, 0.12);
    flowBiasY.value = randomBetween(-0.1, 0.1);
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: 950,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
    });
  }, [
    diffusionStrength,
    flowBiasX,
    flowBiasY,
    grainStrength,
    originX,
    originY,
    progress,
    pullStrength,
    seed,
    swirlStrength,
  ]);

  const uniforms = useDerivedValue(() => ({
    progress: progress.value,
    resolution: [size.width || 1, size.height || 1],
    seed: seed.value,
    distortOrigin: [originX.value, originY.value],
    pullStrength: pullStrength.value,
    swirlStrength: swirlStrength.value,
    diffusionStrength: diffusionStrength.value,
    grainStrength: grainStrength.value,
    flowBias: [flowBiasX.value, flowBiasY.value],
  }));

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width !== size.width || height !== size.height) {
      setSize({ width, height });
    }
  };

  const canRenderShader = useMemo(
    () => Boolean(image && size.width > 0 && size.height > 0),
    [image, size.height, size.width],
  );
  const isReady = Boolean(imageUri && size.width > 0 && size.height > 0);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (isActive && !wasActiveRef.current) {
      triggerMorph();
    }

    wasActiveRef.current = isActive;
  }, [isActive, isReady, triggerMorph]);

  return (
    <View style={[styles.shadowShell, style]}>
      <View style={[styles.surface, borderless ? styles.surfaceBorderless : null]} onLayout={handleLayout}>
        {!canRenderShader ? (
          <Image source={imageSource} resizeMode="cover" style={styles.backgroundImage} />
        ) : null}

        {canRenderShader ? (
          <Canvas style={StyleSheet.absoluteFill}>
            <Fill>
              <Shader source={CARD_MORPH_EFFECT} uniforms={uniforms}>
                <ImageShader
                  image={image!}
                  fit="cover"
                  x={0}
                  y={0}
                  width={size.width}
                  height={size.height}
                  tx="clamp"
                  ty="clamp"
                />
              </Shader>
            </Fill>
          </Canvas>
        ) : null}

        <View style={styles.tint} />
        <View style={styles.topHighlight} />
        <View style={styles.leftSheen} />
        <View style={styles.rightSheen} />

        <View style={[styles.content, contentStyle]}>{children}</View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  shadowShell: {
    borderRadius: radius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
  },
  surface: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: '#e8dcc6',
    flex: 1,
  },
  surfaceBorderless: {
    borderWidth: 0,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,248,232,0.08)',
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.34)',
  },
  leftSheen: {
    position: 'absolute',
    left: 0,
    top: 14,
    bottom: 14,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  rightSheen: {
    position: 'absolute',
    right: 0,
    top: 14,
    bottom: 14,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  content: {
    flex: 1,
  },
});
