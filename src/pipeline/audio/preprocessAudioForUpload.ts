import { isDeviceAudioTranscoderAvailable, transcodeAudioForTranscription } from '../../native/deviceAudioTranscoder';
import { PreparedSessionAnalysisBundle } from '../types';

interface PreprocessedAudioResult {
  transcriptionAudioUri: string;
  transcriptionMediaName: string;
  transcriptionMediaMimeType: string;
  generatedArtifact?: boolean;
}

function inferMimeType(uri: string): string {
  const normalized = uri.toLowerCase();

  if (normalized.endsWith('.webm')) return 'audio/webm';
  if (normalized.endsWith('.opus')) return 'audio/opus';
  if (normalized.endsWith('.mp3')) return 'audio/mpeg';
  if (normalized.endsWith('.wav')) return 'audio/wav';
  if (normalized.endsWith('.m4a')) return 'audio/mp4';
  if (normalized.endsWith('.mp4')) return 'video/mp4';

  return 'audio/mp4';
}

function inferName(uri: string): string {
  const filename = uri.split('/').pop();
  return filename && filename.length > 0 ? filename : 'session-audio.m4a';
}

export async function preprocessAudioForUpload(audioUri: string): Promise<PreprocessedAudioResult> {
  if (isDeviceAudioTranscoderAvailable()) {
    try {
      console.log('[DevicePipeline] Speech audio extraction started', {
        sourceAudioUri: audioUri,
        targetFormat: 'm4a',
      });
      const startedAtMs = Date.now();
      const transcoded = await transcodeAudioForTranscription(audioUri);
      console.log('[DevicePipeline] Speech audio extraction completed', {
        sourceAudioUri: audioUri,
        outputAudioUri: transcoded.uri,
        outputFileName: transcoded.fileName,
        outputMimeType: transcoded.mimeType,
        elapsedMs: Date.now() - startedAtMs,
      });
      return {
        transcriptionAudioUri: transcoded.uri,
        transcriptionMediaName: transcoded.fileName,
        transcriptionMediaMimeType: transcoded.mimeType,
        generatedArtifact: true,
      };
    } catch (error) {
      console.warn('[DevicePipeline] Speech audio extraction failed, falling back to original media', {
        audioUri,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  console.log('[DevicePipeline] Speech audio extraction skipped or fallback selected', {
    sourceAudioUri: audioUri,
    selectedMimeType: inferMimeType(audioUri),
    generatedArtifact: false,
  });

  return {
    transcriptionAudioUri: audioUri,
    transcriptionMediaName: inferName(audioUri),
    transcriptionMediaMimeType: inferMimeType(audioUri),
    generatedArtifact: false,
  };
}

export function getPreparedBundleAudioMeta(bundle: PreparedSessionAnalysisBundle) {
  return {
    name: bundle.transcriptionMediaName,
    type: bundle.transcriptionMediaMimeType,
    uri: bundle.transcriptionAudioUri,
  };
}
