import React from 'react';
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import {
  Canvas,
  Fill,
  ImageShader,
  Shader,
  Skia,
  useImage,
} from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';

import { useGradient } from '../context/GradientContext';

const ATMOSPHERE_SHADER_SOURCE = `
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
  float3 ambientBase = sampled.rgb * (1.0 - progress * 0.45 * diffusionStrength);
  float3 ambientTint = float3(0.09, 0.1, 0.12);
  float3 ambient = mix(
    ambientBase,
    ambientBase * 0.58 + ambientTint,
    clamp(progress * 0.85 * diffusionStrength, 0.0, 1.0)
  );

  float fog = smoothstep(0.0, 1.0, progress) * (0.06 + radial * 0.08);
  ambient += fog * float3(0.03, 0.025, 0.045);

  float grain = (hash21(xy * 0.71 + seed * 17.0) - 0.5) * 0.04 * grainStrength * progress;
  ambient += grain;
  ambient = clamp(ambient, 0.0, 1.0);

  return half4(ambient, sampled.a);
}
`;

const ATMOSPHERE_EFFECT = Skia.RuntimeEffect.Make(ATMOSPHERE_SHADER_SOURCE);

if (!ATMOSPHERE_EFFECT) {
  throw new Error('Failed to compile atmosphere runtime effect.');
}

export const GradientCanvas: React.FC = () => {
  const { width, height } = useWindowDimensions();
  const {
    imageSource,
    imageUri,
    originX,
    originY,
    progress,
    seed,
    pullStrength,
    swirlStrength,
    diffusionStrength,
    grainStrength,
    flowBiasX,
    flowBiasY,
  } = useGradient();
  const image = useImage(imageUri ?? undefined);

  const uniforms = useDerivedValue(
    () => ({
      progress: progress.value,
      resolution: [width, height],
      seed: seed.value,
      distortOrigin: [originX.value, originY.value],
      pullStrength: pullStrength.value,
      swirlStrength: swirlStrength.value,
      diffusionStrength: diffusionStrength.value,
      grainStrength: grainStrength.value,
      flowBias: [flowBiasX.value, flowBiasY.value],
    }),
    [
      diffusionStrength,
      flowBiasX,
      flowBiasY,
      grainStrength,
      height,
      originX,
      originY,
      progress,
      pullStrength,
      seed,
      swirlStrength,
      width,
    ],
  );

  return (
    <View pointerEvents="none" style={styles.layer}>
      {!image ? <Image source={imageSource} resizeMode="cover" style={styles.baseImage} /> : null}

      {image ? (
        <Canvas style={StyleSheet.absoluteFill}>
          <Fill>
            <Shader source={ATMOSPHERE_EFFECT} uniforms={uniforms}>
              <ImageShader
                image={image}
                fit="cover"
                x={0}
                y={0}
                width={width}
                height={height}
                tx="clamp"
                ty="clamp"
              />
            </Shader>
          </Fill>
        </Canvas>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
  },
  baseImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
});
