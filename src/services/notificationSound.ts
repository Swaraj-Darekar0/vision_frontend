import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export const VISION_NOTIFICATION_SOUND = 'pop_soound_effect.mp3';
export const REPORT_READY_CHANNEL_ID = 'vision-report-ready-pop-v1';
let shouldUseCustomSound = true;

export function getVisionNotificationSound() {
  return shouldUseCustomSound ? VISION_NOTIFICATION_SOUND : true;
}

export function markVisionNotificationSoundUnavailable(error: unknown) {
  shouldUseCustomSound = false;
  console.warn('[Notifications] Custom pop sound unavailable in this native build. Falling back to the system notification sound.', error);
}

export async function ensureVisionNotificationChannel(channelId: string, name: string) {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(channelId, {
    name,
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: shouldUseCustomSound ? VISION_NOTIFICATION_SOUND : undefined,
    vibrationPattern: [0, 180, 120, 180],
  });
}
