// src/api/endpoints.ts
export const BASE_URL ='https://vision-backend-wbi4.onrender.com';

export const ENDPOINTS = {
  analyzeFullVideo: `${BASE_URL}/analyze/full`,
  analyzePoseOnly:  `${BASE_URL}/pose/analyze`,
  analyzeAudioOnly: `${BASE_URL}/audio/analyze`,
  evaluate:         `${BASE_URL}/evaluate`,
  authSignup:       `${BASE_URL}/auth/signup`,
  authLogin:        `${BASE_URL}/auth/login`,
  subscriptionProfile: `${BASE_URL}/subscription/profile`,
  planCurrent:      `${BASE_URL}/plan/current`,
  planGenerate:     `${BASE_URL}/plan/generate`,
  planMarkComplete: `${BASE_URL}/plan/mark-complete`,
  planWeeklyReview: `${BASE_URL}/plan/weekly-review`,
  planReviewShown:  `${BASE_URL}/plan/review-shown`,
  subscriptionCreate: `${BASE_URL}/subscription/create`,
  subscriptionVerify: `${BASE_URL}/subscription/verify`,
  subscriptionCancel: `${BASE_URL}/subscription/cancel`,
  subscriptionStatus: `${BASE_URL}/subscription/status`,
  notificationsRegisterToken: `${BASE_URL}/notifications/register-token`,
  notificationsUnregisterToken: `${BASE_URL}/notifications/unregister-token`,
  jobStatus:        (jobId: string) => `${BASE_URL}/analyze/status/${jobId}`,
} as const;
