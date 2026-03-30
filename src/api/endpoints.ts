// src/api/endpoints.ts
export const BASE_URL = 'http://192.168.0.102:5000';

export const ENDPOINTS = {
  analyzeFullVideo: `${BASE_URL}/analyze/full`,
  analyzePoseOnly:  `${BASE_URL}/pose/analyze`,
  analyzeAudioOnly: `${BASE_URL}/audio/analyze`,
  evaluate:         `${BASE_URL}/evaluate`,
  authSignup:       `${BASE_URL}/auth/signup`,
  authLogin:        `${BASE_URL}/auth/login`,
  jobStatus:        (jobId: string) => `${BASE_URL}/analyze/status/${jobId}`,
} as const;
