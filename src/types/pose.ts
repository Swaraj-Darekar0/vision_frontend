export interface LandmarkPoint {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

/**
 * Each frame preserves the backend's fixed MediaPipe-style 33-landmark order.
 */
export interface LandmarkFrame {
  timestamp: number;
  landmarks: LandmarkPoint[];
}

export interface PoseLandmarkPayload {
  session_id: string;
  user_id: string;
  fps_achieved: number;
  total_frames: number;
  duration_seconds: number;
  frames: LandmarkFrame[];
}
