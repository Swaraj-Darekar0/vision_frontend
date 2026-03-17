import { Video } from 'react-native-compressor';
import * as FileSystem from 'expo-file-system/legacy';

export interface CompressionResult {
  uri:            string;
  fileSizeMB:     number;
  originalSizeMB: number;
}

export async function compressVideoFor480p(
  sourceUri: string,
  onProgress?: (percent: number) => void,
): Promise<CompressionResult> {
  const orig = await FileSystem.getInfoAsync(sourceUri);
  const originalSizeMB = orig.exists ? (orig as any).size / 1_048_576 : 0;

  const compressedUri = await Video.compress(
    sourceUri,
    {
      compressionMethod: 'manual',
      maxSize:   480,         // Shorter dimension cap in pixels
      bitrate:   1_000_000,  // 1 Mbps
      frameRate: 30,
    },
    (progress) => onProgress?.(Math.round(progress * 100)),
  );

  const info = await FileSystem.getInfoAsync(compressedUri);
  const fileSizeMB = info.exists ? (info as any).size / 1_048_576 : 0;

  console.log(
    `[Compress] ${originalSizeMB.toFixed(1)}MB → ${fileSizeMB.toFixed(1)}MB ` +
    `(${((1 - fileSizeMB / originalSizeMB) * 100).toFixed(0)}% reduction)`
  );

  return { uri: compressedUri, fileSizeMB, originalSizeMB };
}
