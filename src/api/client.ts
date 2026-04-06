import axios from 'axios';
import { BASE_URL } from './endpoints';
import { getActiveAccessToken, handleUnauthorizedSession, refreshAccessToken } from './authSession';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 360_000,  // 6 minutes: Render cold start + large video analysis
  headers: { 'Accept': 'application/json' },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await getActiveAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const requestUrl = String(originalRequest?.url ?? '');
    const isAuthRequest =
      requestUrl.includes('/auth/login') || requestUrl.includes('/auth/signup');

    if (status === 401 && originalRequest && !originalRequest._retry && !isAuthRequest) {
      originalRequest._retry = true;

      const nextToken = await refreshAccessToken();
      if (nextToken) {
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${nextToken}`;
        return apiClient(originalRequest);
      }

      await handleUnauthorizedSession();
    }

    return Promise.reject(error);
  },
);

export default apiClient;
