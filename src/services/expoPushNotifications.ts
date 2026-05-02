import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

import apiClient from '../api/client';
import { ENDPOINTS } from '../api/endpoints';

const PUSH_TOKEN_KEY = 'vision_expo_push_token';
const DEVICE_ID_KEY = 'vision_push_device_id';

type ExpoConstants = typeof Constants & {
  easConfig?: {
    projectId?: string;
  };
};

function getProjectId() {
  const constants = Constants as ExpoConstants;
  return constants.easConfig?.projectId ?? constants.expoConfig?.extra?.eas?.projectId;
}

function getErrorMessage(error: unknown) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as {
      response?: {
        status?: number;
        data?: unknown;
      };
      message?: string;
    }).response;
    const message = (error as { message?: string }).message ?? 'Unknown request error';
    return `[${response?.status ?? 'no-status'}] ${message} ${JSON.stringify(response?.data ?? {})}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

async function getDeviceId() {
  const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (existing) {
    return existing;
  }

  const next = `device_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  await SecureStore.setItemAsync(DEVICE_ID_KEY, next);
  return next;
}

async function ensurePermission() {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted || existing.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted || requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

async function getExpoPushToken() {
  const projectId = getProjectId();
  if (!projectId) {
    console.warn('[PushNotifications] No EAS projectId detected. Falling back to implicit Expo project resolution.');
  }
  const response = projectId
    ? await Notifications.getExpoPushTokenAsync({ projectId })
    : await Notifications.getExpoPushTokenAsync();

  return response.data;
}

export async function registerExpoPushTokenForUser(userId: string) {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return;
  }

  try {
    console.log(`[PushNotifications] Starting token registration for user ${userId}`);
    const hasPermission = await ensurePermission();
    if (!hasPermission) {
      console.warn('[PushNotifications] Notification permission was not granted.');
      return;
    }

    const expoPushToken = await getExpoPushToken();
    console.log(`[PushNotifications] Expo push token acquired: ${expoPushToken}`);
    await SecureStore.setItemAsync(PUSH_TOKEN_KEY, expoPushToken);

    const payload = {
      user_id: userId,
      expo_push_token: expoPushToken,
      platform: Platform.OS,
      device_id: await getDeviceId(),
      app_version: Constants.expoConfig?.version ?? null,
    };

    console.log('[PushNotifications] Sending registration payload to backend.', payload);
    const response = await apiClient.post(ENDPOINTS.notificationsRegisterToken, payload);
    console.log('[PushNotifications] Backend token registration succeeded.', response.data);
  } catch (error) {
    console.warn('[PushNotifications] Token registration skipped:', getErrorMessage(error));
  }
}

export async function unregisterExpoPushTokenForUser(userId: string) {
  try {
    const expoPushToken = await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
    const deviceId = await getDeviceId();
    if (!expoPushToken && !deviceId) {
      return;
    }

    const response = await apiClient.post(ENDPOINTS.notificationsUnregisterToken, {
      user_id: userId,
      expo_push_token: expoPushToken,
      device_id: deviceId,
    });
    console.log('[PushNotifications] Backend token unregistration succeeded.', response.data);
    await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
  } catch (error) {
    console.warn('[PushNotifications] Token unregister skipped:', getErrorMessage(error));
  }
}
