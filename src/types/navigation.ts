export type RootStackParamList = {
  Login:             undefined;
  Signup:            undefined;
  Dashboard:         undefined;
  Recording:         { topicTitle: string; minDurationSeconds?: number };
  Processing:        { videoUri: string };
  Results:           undefined;
  SessionHistory:    undefined;
  SessionDetail:     { sessionId: string };
};
