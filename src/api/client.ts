import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { BASE_URL } from './endpoints';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 360_000,  // 6 minutes: Render cold start + large video analysis
  headers: { 'Accept': 'application/json' },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default apiClient;
