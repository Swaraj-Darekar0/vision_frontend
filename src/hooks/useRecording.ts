import { useRef, useState, useCallback, useEffect } from 'react';
import { CameraView, CameraType } from 'expo-camera';

export type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped';

export function useRecording() {
  const cameraRef    = useRef<CameraView>(null);
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);

  const [state,          setState]   = useState<RecordingState>('idle');
  const [videoUri,       setUri]     = useState<string | null>(null);
  const [elapsedSeconds, setElapsed] = useState(0);
  const [facing,         setFacing]  = useState<CameraType>('front');

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
  };
  
  const stopTimer = () => {
    if (timerRef.current) { 
      clearInterval(timerRef.current); 
      timerRef.current = null; 
    }
  };

  const startRecording = useCallback(async () => {
    if (!cameraRef.current) return;
    setElapsed(0);
    setState('recording');
    startTimer();
    try {
      const video = await cameraRef.current.recordAsync({
        maxDuration: 3600,
      });
      if (video?.uri) setUri(video.uri);
    } catch (error) {
      console.error('Recording error:', error);
      setState('idle');
      stopTimer();
    }
  }, []);

  const stopRecording = useCallback(() => {
    cameraRef.current?.stopRecording();
    stopTimer();
    setState('stopped');
  }, []);

  const pauseRecording  = useCallback(() => { 
    stopTimer(); 
    setState('paused'); 
  }, []);

  const resumeRecording = useCallback(() => { 
    setState('recording'); 
    startTimer(); 
  }, []);

  const flipCamera = useCallback(() => {
    setFacing((f) => f === 'front' ? 'back' : 'front');
  }, []);

  useEffect(() => {
    return () => stopTimer();
  }, []);

  return { 
    cameraRef, state, videoUri, elapsedSeconds, facing,
    startRecording, stopRecording, pauseRecording, resumeRecording, flipCamera 
  };
}
