import { PoseLandmarkPayload } from './pose';

export type RootStackParamList = {
  Login:             undefined;
  Signup:            undefined;
  Dashboard:         undefined;
  Recording:         { topicTitle: string; minDurationSeconds?: number };
  Processing:        { 
    landmarkPayload: PoseLandmarkPayload;
    audioUri: string;
    localVideoUri: string | null;
  };
  Results:           undefined;
  SessionHistory:    undefined;
  SessionDetail:     { sessionId: string };
};
