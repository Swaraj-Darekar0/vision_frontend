import * as FileSystem from 'expo-file-system/legacy';
import { PoseLandmarkPayload } from '../types/pose';

const EXTRA_DIR_NAME = 'EXTRA';
const DEBUG_FILE_NAME = 'raw_pose_capture_payload_latest.json';

export async function saveDebugPosePayload(
  payload: PoseLandmarkPayload
): Promise<string | null> {
  if (!FileSystem.documentDirectory) {
    return null;
  }

  const extraDir = `${FileSystem.documentDirectory}${EXTRA_DIR_NAME}/`;
  const debugFilePath = `${extraDir}${DEBUG_FILE_NAME}`;

  const info = await FileSystem.getInfoAsync(extraDir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(extraDir, { intermediates: true });
  }

  await FileSystem.writeAsStringAsync(
    debugFilePath,
    JSON.stringify(payload, null, 2)
  );

  return debugFilePath;
}
