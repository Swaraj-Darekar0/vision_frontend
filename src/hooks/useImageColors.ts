import { useEffect, useState } from 'react';
import { Asset } from 'expo-asset';
import { getColors, ImageColorsResult } from 'react-native-image-colors';

import { GradientPalette } from '../constants/gradients';

const BLACK = '#000000';
const paletteCache = new Map<string, GradientPalette>();

function normalizeHexPair(value: string) {
  return value.length === 1 ? `${value}${value}` : value;
}

function parseColor(input: string, fallback = BLACK) {
  const source = input?.trim?.() || fallback;

  if (source.startsWith('#')) {
    const raw = source.slice(1);
    const hex = raw.length === 3
      ? `${normalizeHexPair(raw[0])}${normalizeHexPair(raw[1])}${normalizeHexPair(raw[2])}`
      : raw.slice(0, 6);

    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
    };
  }

  const match = source.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (match) {
    return {
      r: Number(match[1]),
      g: Number(match[2]),
      b: Number(match[3]),
    };
  }

  return parseColor(fallback, BLACK);
}

function toHex({ r, g, b }: { r: number; g: number; b: number }) {
  const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
  const channel = (value: number) => clamp(value).toString(16).padStart(2, '0');
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

function mixColors(source: string, target: string, amount: number) {
  const from = parseColor(source);
  const to = parseColor(target);

  return toHex({
    r: from.r + (to.r - from.r) * amount,
    g: from.g + (to.g - from.g) * amount,
    b: from.b + (to.b - from.b) * amount,
  });
}

function colorDistance(first: string, second: string) {
  const a = parseColor(first);
  const b = parseColor(second);

  return Math.sqrt(
    Math.pow(a.r - b.r, 2) +
    Math.pow(a.g - b.g, 2) +
    Math.pow(a.b - b.b, 2),
  );
}

function uniqueColors(colors: string[]) {
  const deduped: string[] = [];

  colors.forEach((color) => {
    const normalized = toHex(parseColor(color));
    if (!deduped.includes(normalized)) {
      deduped.push(normalized);
    }
  });

  return deduped;
}

function selectPaletteSources(result: ImageColorsResult, fallback: GradientPalette): GradientPalette {
  if (result.platform === 'android' || result.platform === 'web') {
    return [
      result.darkMuted || result.muted || result.dominant || fallback[0],
      result.vibrant || result.lightVibrant || result.dominant || fallback[1],
      result.dominant || result.darkVibrant || result.muted || fallback[2],
    ];
  }

  return [
    result.background || fallback[0],
    result.primary || result.secondary || fallback[1],
    result.detail || result.secondary || result.background || fallback[2],
  ];
}

function buildGradientPalette(result: ImageColorsResult, fallback: GradientPalette): GradientPalette {
  const picked = uniqueColors([...selectPaletteSources(result, fallback), ...fallback]);
  const baseSource = picked[0] || fallback[0];
  const accentSource = picked.find((color) => colorDistance(color, baseSource) > 26) || fallback[1];
  const depthSource = picked.find((color) => colorDistance(color, accentSource) > 18) || fallback[2];

  return [
    mixColors(baseSource, '#060606', 0.18),
    mixColors(accentSource, '#101010', 0.12),
    mixColors(depthSource, '#000000', 0.74),
  ];
}

export async function extractImageGradientPalette(
  source: number,
  fallback: GradientPalette,
): Promise<GradientPalette> {
  const asset = Asset.fromModule(source);
  await asset.downloadAsync();

  const uri = asset.localUri ?? asset.uri;
  const cacheKey = uri || String(source);

  const cached = paletteCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const result = await getColors(uri, {
    fallback: fallback[0],
    cache: true,
    key: cacheKey,
    quality: 'high',
  });

  const palette = buildGradientPalette(result, fallback);
  paletteCache.set(cacheKey, palette);

  return palette;
}

export function useImageGradientPalette(source: number, fallback: GradientPalette) {
  const [palette, setPalette] = useState<GradientPalette>(fallback);

  useEffect(() => {
    let mounted = true;

    extractImageGradientPalette(source, fallback)
      .then((resolvedPalette) => {
        if (mounted) {
          setPalette(resolvedPalette);
        }
      })
      .catch((error) => {
        console.warn('[Gradient] Failed to extract image palette', error);
      });

    return () => {
      mounted = false;
    };
  }, [fallback, source]);

  return palette;
}
