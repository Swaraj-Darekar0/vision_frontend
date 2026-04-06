import * as FileSystem from 'expo-file-system/legacy';
import { AUDIO_CONSTANTS } from './audioConstants';

export interface DecodedAudio {
  pcm: Float32Array;
  sampleRate: number;
  durationSeconds: number;
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let bufferLength = base64.length * 0.75;

  if (base64[base64.length - 1] === '=') bufferLength -= 1;
  if (base64[base64.length - 2] === '=') bufferLength -= 1;

  const bytes = new Uint8Array(bufferLength);
  let encoded1 = 0;
  let encoded2 = 0;
  let encoded3 = 0;
  let encoded4 = 0;
  let byteIndex = 0;

  for (let index = 0; index < base64.length; index += 4) {
    encoded1 = chars.indexOf(base64[index]);
    encoded2 = chars.indexOf(base64[index + 1]);
    encoded3 = chars.indexOf(base64[index + 2]);
    encoded4 = chars.indexOf(base64[index + 3]);

    bytes[byteIndex++] = (encoded1 << 2) | (encoded2 >> 4);

    if (encoded3 !== 64) {
      bytes[byteIndex++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    }
    if (encoded4 !== 64) {
      bytes[byteIndex++] = ((encoded3 & 3) << 6) | encoded4;
    }
  }

  return bytes.buffer;
}

function mixToMono(channelData: Float32Array[]): Float32Array {
  if (channelData.length === 0) return new Float32Array(0);
  if (channelData.length === 1) return new Float32Array(channelData[0]);

  const frameCount = channelData[0].length;
  const mono = new Float32Array(frameCount);

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    let sum = 0;
    for (let channelIndex = 0; channelIndex < channelData.length; channelIndex += 1) {
      sum += channelData[channelIndex][frameIndex] ?? 0;
    }
    mono[frameIndex] = sum / channelData.length;
  }

  return mono;
}

function resampleLinear(
  source: Float32Array,
  sourceRate: number,
  targetRate: number,
): Float32Array {
  if (source.length === 0 || sourceRate <= 0 || sourceRate === targetRate) {
    return source;
  }

  const targetLength = Math.max(1, Math.round((source.length * targetRate) / sourceRate));
  const target = new Float32Array(targetLength);
  const scale = sourceRate / targetRate;

  for (let index = 0; index < targetLength; index += 1) {
    const sourcePosition = index * scale;
    const leftIndex = Math.floor(sourcePosition);
    const rightIndex = Math.min(source.length - 1, leftIndex + 1);
    const fraction = sourcePosition - leftIndex;
    const left = source[leftIndex] ?? 0;
    const right = source[rightIndex] ?? left;
    target[index] = left + (right - left) * fraction;
  }

  return target;
}

export async function decodeAudioFile(uri: string): Promise<DecodedAudio> {
  const audioApiModule = await import('react-native-audio-api');
  const { AudioContext } = audioApiModule;

  const normalizedUri = uri.startsWith('file://') ? uri : `file://${uri}`;
  const base64 = await FileSystem.readAsStringAsync(normalizedUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const arrayBuffer = base64ToArrayBuffer(base64);

  const context = new AudioContext();

  try {
    const buffer = await context.decodeAudioData(arrayBuffer);
    const channels: Float32Array[] = [];

    for (let index = 0; index < buffer.numberOfChannels; index += 1) {
      channels.push(buffer.getChannelData(index));
    }

    const mono = mixToMono(channels);
    const pcm = resampleLinear(mono, buffer.sampleRate, AUDIO_CONSTANTS.SAMPLE_RATE);

    return {
      pcm,
      sampleRate: AUDIO_CONSTANTS.SAMPLE_RATE,
      durationSeconds: pcm.length / AUDIO_CONSTANTS.SAMPLE_RATE,
    };
  } finally {
    await context.close?.();
  }
}
