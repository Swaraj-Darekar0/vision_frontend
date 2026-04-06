import { DEVICE_PIPELINE_CONFIG, DEVICE_PIPELINE_VERSION } from '../config/devicePipelineConfig';
import { LandmarkFrame, LandmarkPoint, PoseLandmarkPayload } from '../../types/pose';
import { clamp01, mean, std } from '../shared/math';
import { DevicePoseJson } from '../types';

const LANDMARK = {
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
  nose: 0,
} as const;

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface FrameMetrics {
  shoulder_alignment: number;
  spine_straightness: number;
  posture_openness: number;
  gesture_score: number;
  amplitude_score: number;
  symmetry_score: number;
  stillness_score: number;
  noseZ: number;
  hipMidX: number;
  leftWristY: number;
}

const poseConfig = DEVICE_PIPELINE_CONFIG.pose;

function getPoint(landmarks: LandmarkPoint[], index: number): LandmarkPoint | null {
  return landmarks[index] ?? null;
}

function isVisible(point: LandmarkPoint | null): point is LandmarkPoint {
  return !!point && (point.visibility ?? 0) >= poseConfig.minVisibilityThreshold;
}

function toVec(point: LandmarkPoint): Vec3 {
  return { x: point.x, y: point.y, z: point.z };
}

function midpoint(a: Vec3, b: Vec3): Vec3 {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2,
  };
}

function subtract(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z,
  };
}

function scale(a: Vec3, divisor: number): Vec3 {
  return {
    x: a.x / divisor,
    y: a.y / divisor,
    z: a.z / divisor,
  };
}

function distance(a: Vec3, b: Vec3): number {
  return Math.sqrt(((a.x - b.x) ** 2) + ((a.y - b.y) ** 2) + ((a.z - b.z) ** 2));
}

function norm(a: Vec3): number {
  return Math.sqrt((a.x ** 2) + (a.y ** 2) + (a.z ** 2));
}

function dot(a: Vec3, b: Vec3): number {
  return (a.x * b.x) + (a.y * b.y) + (a.z * b.z);
}

function clampUnit(value: number): number {
  return Math.min(Math.max(value, -1), 1);
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: (a.y * b.z) - (a.z * b.y),
    y: (a.z * b.x) - (a.x * b.z),
    z: (a.x * b.y) - (a.y * b.x),
  };
}

function normalizeFrame(frame: LandmarkFrame): LandmarkPoint[] | null {
  const leftHip = getPoint(frame.landmarks, LANDMARK.leftHip);
  const rightHip = getPoint(frame.landmarks, LANDMARK.rightHip);
  const leftShoulder = getPoint(frame.landmarks, LANDMARK.leftShoulder);
  const rightShoulder = getPoint(frame.landmarks, LANDMARK.rightShoulder);

  if (!isVisible(leftHip) || !isVisible(rightHip) || !isVisible(leftShoulder) || !isVisible(rightShoulder)) {
    return null;
  }

  const hipMid = midpoint(toVec(leftHip), toVec(rightHip));
  const shoulderMid = midpoint(toVec(leftShoulder), toVec(rightShoulder));
  const torsoLength = distance(shoulderMid, hipMid);

  if (torsoLength <= 0) {
    return null;
  }

  return frame.landmarks.map((point) => {
    const translated = subtract(toVec(point), hipMid);
    const normalized = scale(translated, torsoLength);
    return {
      ...point,
      x: normalized.x,
      y: normalized.y,
      z: normalized.z,
    };
  });
}

function computeStaticMetrics(landmarks: LandmarkPoint[]): FrameMetrics | null {
  const leftShoulder = getPoint(landmarks, LANDMARK.leftShoulder);
  const rightShoulder = getPoint(landmarks, LANDMARK.rightShoulder);
  const leftWrist = getPoint(landmarks, LANDMARK.leftWrist);
  const rightWrist = getPoint(landmarks, LANDMARK.rightWrist);
  const leftElbow = getPoint(landmarks, LANDMARK.leftElbow);
  const rightElbow = getPoint(landmarks, LANDMARK.rightElbow);
  const leftHip = getPoint(landmarks, LANDMARK.leftHip);
  const rightHip = getPoint(landmarks, LANDMARK.rightHip);
  const nose = getPoint(landmarks, LANDMARK.nose);

  if (!leftShoulder || !rightShoulder || !leftWrist || !rightWrist || !leftElbow || !rightElbow || !leftHip || !rightHip || !nose) {
    return null;
  }

  const leftShoulderVec = toVec(leftShoulder);
  const rightShoulderVec = toVec(rightShoulder);
  const leftWristVec = toVec(leftWrist);
  const rightWristVec = toVec(rightWrist);
  const leftElbowVec = toVec(leftElbow);
  const rightElbowVec = toVec(rightElbow);
  const leftHipVec = toVec(leftHip);
  const rightHipVec = toVec(rightHip);

  const shoulderMid = midpoint(leftShoulderVec, rightShoulderVec);
  const hipMid = midpoint(leftHipVec, rightHipVec);
  const spineVec = subtract(shoulderMid, hipMid);
  const spineNorm = norm(spineVec);

  if (spineNorm <= 0) {
    return null;
  }

  const shoulderAlignment = clamp01(1 - Math.abs(leftShoulder.y - rightShoulder.y));
  const vertical = { x: 0, y: -1, z: 0 };
  const angle = Math.acos(clampUnit(dot(spineVec, vertical) / spineNorm));
  const spineStraightness = clamp01(1 - (angle / poseConfig.spineStraightnessThreshold));

  const postureOpenness = clamp01(
    Math.abs(leftShoulder.x - rightShoulder.x) / poseConfig.postureOpennessMaxWidth
  );

  const leftHandDist = distance(leftWristVec, leftHipVec);
  const rightHandDist = distance(rightWristVec, rightHipVec);
  const gestureScore = clamp01(((leftHandDist + rightHandDist) / 2) / poseConfig.gestureDistanceThreshold);

  const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
  const leftAmp = Math.max(0, shoulderY - leftWrist.y);
  const rightAmp = Math.max(0, shoulderY - rightWrist.y);
  const amplitudeScore = clamp01(Math.max(leftAmp, rightAmp) / poseConfig.optimalHandAmplitude);

  const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
  const leftDist = Math.abs(leftWrist.x - shoulderMidX);
  const rightDist = Math.abs(rightWrist.x - shoulderMidX);
  const symmetryScore = clamp01(1 - Math.abs(leftDist - rightDist));

  const joints = [leftElbowVec, rightElbowVec, leftWristVec, rightWristVec];
  const distances = joints.map((joint) => {
    const crossProduct = cross(spineVec, subtract(joint, hipMid));
    return norm(crossProduct) / spineNorm;
  });
  const stillnessScore = clamp01(1 - (mean(distances) / poseConfig.stillnessDistanceThreshold));

  return {
    shoulder_alignment: shoulderAlignment,
    spine_straightness: spineStraightness,
    posture_openness: postureOpenness,
    gesture_score: gestureScore,
    amplitude_score: amplitudeScore,
    symmetry_score: symmetryScore,
    stillness_score: stillnessScore,
    noseZ: nose.z,
    hipMidX: hipMid.x,
    leftWristY: leftWrist.y,
  };
}

function splitIntoWindows(frames: LandmarkFrame[]): LandmarkFrame[][] {
  const windows = new Map<number, LandmarkFrame[]>();

  for (const frame of frames) {
    const index = Math.floor(frame.timestamp / poseConfig.windowSizeSeconds);
    const current = windows.get(index) ?? [];
    current.push(frame);
    windows.set(index, current);
  }

  return Array.from(windows.values());
}

function averageMetric<T extends Record<string, number>>(values: T[], key: keyof T): number {
  return mean(values.map((entry) => entry[key] ?? 0));
}

export function buildPoseJson(payload: PoseLandmarkPayload): DevicePoseJson {
  const windows = splitIntoWindows(payload.frames);

  const windowMetrics = windows
    .map((windowFrames) => {
      const frameMetrics = windowFrames
        .map((frame) => normalizeFrame(frame))
        .filter((landmarks): landmarks is LandmarkPoint[] => landmarks != null)
        .map((landmarks) => computeStaticMetrics(landmarks))
        .filter((metrics): metrics is FrameMetrics => metrics != null);

      if (frameMetrics.length === 0) {
        return null;
      }

      const noseZValues = frameMetrics.map((metrics) => metrics.noseZ);
      const hipMidXValues = frameMetrics.map((metrics) => metrics.hipMidX);
      const leftWristDiffs = frameMetrics
        .map((metrics) => metrics.leftWristY)
        .slice(1)
        .map((value, index) => value - frameMetrics[index].leftWristY);

      const headStability = clamp01(1 - (std(noseZValues) / poseConfig.headStabilityThreshold));
      const hipStd = std(hipMidXValues);
      const bodySway = hipStd < poseConfig.swayDeadZone
        ? 1
        : clamp01(1 - (hipStd / poseConfig.bodySwayThreshold));
      const fidgetScore = clamp01(std(leftWristDiffs) / poseConfig.fidgetThreshold);

      return {
        shoulder_alignment: mean(frameMetrics.map((metrics) => metrics.shoulder_alignment)),
        spine_straightness: mean(frameMetrics.map((metrics) => metrics.spine_straightness)),
        posture_openness: mean(frameMetrics.map((metrics) => metrics.posture_openness)),
        head_stability: headStability,
        body_sway: bodySway,
        gesture_score: mean(frameMetrics.map((metrics) => metrics.gesture_score)),
        amplitude_score: mean(frameMetrics.map((metrics) => metrics.amplitude_score)),
        symmetry_score: mean(frameMetrics.map((metrics) => metrics.symmetry_score)),
        fidget_score: fidgetScore,
        stillness_score: mean(frameMetrics.map((metrics) => metrics.stillness_score)),
      };
    })
    .filter((window): window is NonNullable<typeof window> => window != null);

  const postureMetrics = {
    shoulder_alignment: averageMetric(windowMetrics, 'shoulder_alignment'),
    spine_straightness: averageMetric(windowMetrics, 'spine_straightness'),
    posture_openness: averageMetric(windowMetrics, 'posture_openness'),
    head_stability: averageMetric(windowMetrics, 'head_stability'),
    body_sway: averageMetric(windowMetrics, 'body_sway'),
    gesture_score: averageMetric(windowMetrics, 'gesture_score'),
    amplitude_score: averageMetric(windowMetrics, 'amplitude_score'),
    symmetry_score: averageMetric(windowMetrics, 'symmetry_score'),
    fidget_score: averageMetric(windowMetrics, 'fidget_score'),
    stillness_score: averageMetric(windowMetrics, 'stillness_score'),
  };

  const postureStabilityIndex = clamp01(
    (0.30 * postureMetrics.shoulder_alignment) +
    (0.25 * postureMetrics.spine_straightness) +
    (0.20 * postureMetrics.head_stability) +
    (0.15 * postureMetrics.body_sway) +
    (0.10 * postureMetrics.symmetry_score)
  );

  const gazeStability = postureMetrics.head_stability;
  const movementVarianceNormalized = clamp01(1 - postureMetrics.stillness_score);

  const derivedPoseAttributes = {
    posture_stability_index: postureStabilityIndex,
    pose_confidence: clamp01(
      (0.40 * postureStabilityIndex) +
      (0.30 * postureMetrics.posture_openness) +
      (0.20 * gazeStability) +
      (0.10 * postureMetrics.symmetry_score)
    ),
    pose_nervousness: clamp01(
      (0.35 * (1 - postureMetrics.head_stability)) +
      (0.30 * (1 - postureMetrics.body_sway)) +
      (0.20 * postureMetrics.fidget_score) +
      (0.15 * movementVarianceNormalized)
    ),
    pose_engagement: clamp01(
      (0.40 * postureMetrics.gesture_score) +
      (0.30 * postureMetrics.amplitude_score) +
      (0.30 * postureMetrics.posture_openness)
    ),
    movement_variance_normalized: movementVarianceNormalized,
    gaze_stability: gazeStability,
  };

  return {
    session_metadata: {
      session_id: payload.session_id,
      pipeline: DEVICE_PIPELINE_VERSION.pose,
      formula_version: DEVICE_PIPELINE_VERSION.formula,
    },
    posture_metrics: postureMetrics,
    derived_pose_attributes: derivedPoseAttributes,
  };
}
