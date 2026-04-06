import { NativeModules, Platform } from 'react-native';

export interface NativeTranscodedAudioResult {
  uri: string;
  mimeType: string;
  fileName: string;
}

interface DeviceAudioTranscoderModuleShape {
  transcodeForTranscription(uri: string): Promise<NativeTranscodedAudioResult>;
}

function getNativeModule(): DeviceAudioTranscoderModuleShape | null {
  if (Platform.OS !== 'android') {
    return null;
  }

  return (NativeModules.DeviceAudioTranscoder as DeviceAudioTranscoderModuleShape | undefined) ?? null;
}

export function isDeviceAudioTranscoderAvailable(): boolean {
  return getNativeModule() != null;
}

export async function transcodeAudioForTranscription(
  uri: string,
): Promise<NativeTranscodedAudioResult> {
  const module = getNativeModule();

  if (module == null) {
    throw new Error(
      'Device audio transcoder module is unavailable. Rebuild the Android app after installing the native changes.'
    );
  }

  return module.transcodeForTranscription(uri);
}
