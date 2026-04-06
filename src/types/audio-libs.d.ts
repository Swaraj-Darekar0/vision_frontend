declare module 'react-native-audio-api' {
  export class AudioContext {
    decodeAudioData(data: ArrayBuffer): Promise<{
      numberOfChannels: number;
      sampleRate: number;
      getChannelData(index: number): Float32Array;
    }>;
    close?(): Promise<void>;
  }
}

declare module 'meyda' {
  const Meyda: {
    bufferSize?: number;
    sampleRate?: number;
    numberOfMFCCCoefficients?: number;
    extract(
      features: string[] | string,
      signal: Float32Array,
    ): null | {
      rms?: number;
    };
  };

  export default Meyda;
}

declare module 'react-native-pitch-detector' {
  const PitchDetector: {
    findPitch(
      frame: Float32Array,
      sampleRate: number,
    ): Promise<{
      frequency: number;
      probability?: number;
    }>;
  };

  export default PitchDetector;
}
