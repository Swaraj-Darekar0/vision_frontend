import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client';
import { ENDPOINTS } from '../api/endpoints';
import { UserProfile } from '../types/database';
import { supabase } from '../api/supabase';
import { clearAllSessions } from '../cache/sessionCache';
import { CACHE_KEYS } from '../cache/cacheKeys';
import { useStreakStore } from './streakStore';

interface User extends UserProfile {
  email: string;
}

interface AuthStore {
  user:            User | null;
  isAuthenticated: boolean;
  isLoading:       boolean;
  initialize:      () => Promise<void>;
  login:           (email: string, password: string) => Promise<void>;
  signup:          (email: string, password: string) => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
  logout:          () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null, isAuthenticated: false, isLoading: true,

  initialize: async () => {
    try {
      const token   = await SecureStore.getItemAsync('auth_token');
      const userRaw = await SecureStore.getItemAsync('auth_user');
      if (token && userRaw) {
        set({ user: JSON.parse(userRaw), isAuthenticated: true });
      }
    } catch (error) {
      console.error('[AuthStore] Initialization failed:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    // 1. Authenticate with Flask Backend
    const { data } = await apiClient.post(ENDPOINTS.authLogin, { email, password });
    
    if (!data.access_token) {
      throw new Error('No access token received from backend');
    }

    // 2. Save token
    await SecureStore.setItemAsync('auth_token', data.access_token);

    // 3. Fetch User ID and Profile from Supabase using the token
    const { data: { user: sbUser }, error: sbError } = await supabase.auth.getUser(data.access_token);
    
    if (sbError || !sbUser) {
      throw new Error(sbError?.message || 'Failed to fetch user from Supabase');
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', sbUser.id)
      .single();

    const combinedUser = {
      ...(profile || {}),
      id: sbUser.id,
      email: sbUser.email!,
    } as User;

    // 4. Save combined user data
    await SecureStore.setItemAsync('auth_user', JSON.stringify(combinedUser));
    
    set({ user: combinedUser, isAuthenticated: true });
  },

  signup: async (email, password) => {
    // 1. Register with Flask Backend
    const { data } = await apiClient.post(ENDPOINTS.authSignup, { email, password });
    
    if (!data.access_token) {
      throw new Error('No access token received from backend during signup');
    }

    await SecureStore.setItemAsync('auth_token', data.access_token);

    // 2. Fetch User ID from Supabase
    const { data: { user: sbUser }, error: sbError } = await supabase.auth.getUser(data.access_token);
    
    if (sbError || !sbUser) {
      throw new Error(sbError?.message || 'Failed to fetch user from Supabase after signup');
    }

    // 3. Construct user object (profile might not exist yet if trigger is slow)
    const newUser = {
      id: sbUser.id,
      email: sbUser.email!,
      display_name: '',
      speaking_goals: [],
      updated_at: new Date().toISOString(),
    };

    await SecureStore.setItemAsync('auth_user', JSON.stringify(newUser));
    
    set({ user: newUser, isAuthenticated: true });
  },

  updateDisplayName: async (name: string) => {
    const { user } = get();
    if (!user) throw new Error('No user logged in');

    // Update Supabase
    // We use onConflict to ensure it treats it as an update if the ID exists
    const { error } = await supabase
      .from('user_profiles')
      .upsert(
        { 
          id: user.id, 
          display_name: name,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'id' }
      );

    if (error) {
      console.error('[AuthStore] updateDisplayName failed:', error);
      throw new Error(error.message);
    }

    // Update local state
    const updatedUser = { ...user, display_name: name };
    await SecureStore.setItemAsync('auth_user', JSON.stringify(updatedUser));
    set({ user: updatedUser });
  },

  logout: async () => {
    const { user } = get();
    if (user?.id) {
      // 1. Clear all session history from AsyncStorage — BEFORE clearing the token
      await clearAllSessions(user.id);
      
      // 2. Clear the offline queue too
      await AsyncStorage.removeItem(CACHE_KEYS.OFFLINE_QUEUE);
      
      // 3. Clear streak store in-memory state
      useStreakStore.getState().reset();
    }

    // 4. Clear auth tokens from SecureStore
    await SecureStore.deleteItemAsync('auth_token');
    await SecureStore.deleteItemAsync('auth_user');
    await supabase.auth.signOut();
    
    set({ user: null, isAuthenticated: false });
  },
}));
