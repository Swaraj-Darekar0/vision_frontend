// src/utils/shareCard.ts

import { RefObject } from 'react';
import { View } from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

export async function captureAndShareCard(
  cardRef: RefObject<ViewShot>,
  topicTitle: string,
): Promise<void> {
  if (!cardRef.current || !cardRef.current.capture) {
    throw new Error('Card ref not ready or capture not available');
  }

  // Capture the off-screen card as PNG
  const uri = await cardRef.current.capture();

  // Copy to a shareable path with a clean filename
  const filename = `speaking-session-${Date.now()}.png`;
  const destUri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.copyAsync({ from: uri, to: destUri });

  // Check if sharing is available (always true on physical devices)
  const available = await Sharing.isAvailableAsync();
  if (!available) throw new Error('Sharing not available on this device');

  await Sharing.shareAsync(destUri, {
    mimeType: 'image/png',
    dialogTitle: `My ${topicTitle} session — SpeakingCoach`,
    UTI: 'public.png',
  });

  // Cleanup cache after share sheet closes
  setTimeout(() => {
    FileSystem.deleteAsync(destUri, { idempotent: true }).catch(() => {});
  }, 10_000);
}
