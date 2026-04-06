import * as SecureStore from 'expo-secure-store';
import { supabase } from './supabase';

type UnauthorizedHandler = () => Promise<void> | void;

const AUTH_TOKEN_KEY = 'auth_token';
let unauthorizedHandler: UnauthorizedHandler | null = null;

async function persistAccessToken(token: string | null) {
  if (token) {
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
    return;
  }

  await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
}

export async function syncStoredAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  await persistAccessToken(session?.access_token ?? null);
  return session;
}

export async function persistSessionAccessToken(token: string | null) {
  await persistAccessToken(token);
}

export async function applyBackendSession(accessToken: string, refreshToken: string) {
  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    throw new Error(error.message);
  }

  await persistAccessToken(data.session?.access_token ?? accessToken);
  return data.session;
}

export async function getActiveAccessToken() {
  const session = await syncStoredAccessToken();
  return session?.access_token ?? null;
}

export async function refreshAccessToken() {
  const { data, error } = await supabase.auth.refreshSession();

  if (error || !data.session?.access_token) {
    await persistAccessToken(null);
    return null;
  }

  await persistAccessToken(data.session.access_token);
  return data.session.access_token;
}

export function registerUnauthorizedHandler(handler: UnauthorizedHandler) {
  unauthorizedHandler = handler;
}

export async function handleUnauthorizedSession() {
  if (!unauthorizedHandler) return;
  await unauthorizedHandler();
}
