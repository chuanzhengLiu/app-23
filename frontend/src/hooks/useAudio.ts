import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

interface UseAudioProps {
  src: string;
  id: string;
}

export interface LoopRange {
  start: number;
  end: number;
}

export const useAudio = ({ src, id }: UseAudioProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [playbackRate, setPlaybackRateState] = useState(1.0);
  const [loopRange, setLoopRangeState] = useState<LoopRange | null>(null);
  
  const [volume, setVolume] = useLocalStorage<number>('audio-volume', 1.0);
  
  const progressRef = useRef(0);
  const loopRangeRef = useRef<LoopRange | null>(null);
  const pendingSeekRef = useRef<{ time: number; range?: LoopRange | null } | null>(null);

  useEffect(() => {
    loopRangeRef.current = loopRange;
  }, [loopRange]);

  useEffect(() => {
    // When ID changes, we need to load the saved time for the NEW ID.
    // The previous ID's progress is saved continuously or on pause, 
    // but strict isolation means we define usage: `progress-${id}`.
    
    // Reset transient state
    setPlaying(false);
    setError(null);
    setLoading(false);
    
    // Cleanup old audio
    if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
    }

    if (!src) return;

    const audio = new Audio(src);
    audioRef.current = audio;
    audio.volume = volume;
    audio.playbackRate = playbackRate;
    setLoading(true);
    setLoopRangeState(null);

    // Retrieve saved time just once per ID change
    // We cannot use useLocalStorage hook directly here because the key is dynamic 
    // and hooks cannot be called conditionally or in loops/callbacks easily if the key swaps.
    // Instead, we read localStorage manually for the dynamic ID or rely on the parent to pass valid initial state?
    // Actually, reading localStorage manually in useEffect is safe for this dynamic key behavior.
    
    let savedTime = 0;
    try {
        const saved = window.localStorage.getItem(`progress-${id}`);
        if (saved) savedTime = parseFloat(saved);
        // Safety check: ignore completed or near-completed (e.g. > 95%)? 
        // For listening apps, usually we want to resume unless it was literally finished.
    } catch (e) { console.warn("Failed to read saved progress", e); }

    const setAudioData = () => {
      setDuration(audio.duration);
      setLoading(false);

      if (pendingSeekRef.current) {
        const { time, range } = pendingSeekRef.current;
        pendingSeekRef.current = null;
        const safeTime = Math.max(0, Math.min(time, audio.duration - 0.1));
        audio.currentTime = safeTime;
        setCurrentTime(safeTime);
        if (range) {
          setLoopRangeState(range);
          loopRangeRef.current = range;
        }
        return;
      }

      if (savedTime > 0 && savedTime < audio.duration - 2) { 
         audio.currentTime = savedTime;
         setCurrentTime(savedTime);
      }
    };

    const setAudioTime = () => {
      const curr = audio.currentTime;
      setCurrentTime(curr);
      progressRef.current = curr;
      
      const range = loopRangeRef.current;
      if (range && curr >= range.end) {
        audio.currentTime = range.start;
      }
    };

    const onEnded = () => {
      setPlaying(false);
      setCurrentTime(0);
      try {
        window.localStorage.removeItem(`progress-${id}`);
      } catch (e) {}
    };

    const onError = (e: Event) => {
      console.warn("Audio error event:", e);
      setLoading(false);
      setPlaying(false);
      
      const errCode = audio.error?.code;
      const errMsg = audio.error?.message;
      
      if (errCode === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
          setError("Sources not supported / 404");
      } else if (errCode === MediaError.MEDIA_ERR_DECODE) {
          setError("Decode error");
      } else if (errCode === MediaError.MEDIA_ERR_NETWORK) {
          setError("Network error");
      } else {
          setError(`Error ${errCode}: ${errMsg}`);
      }
    };

    const onPause = () => {
        setPlaying(false);
        // Save progress on pause
        try {
            window.localStorage.setItem(`progress-${id}`, audio.currentTime.toString());
        } catch (e) {}
    };

    const onPlay = () => {
        setPlaying(true);
    };

    audio.addEventListener('loadedmetadata', setAudioData);
    audio.addEventListener('timeupdate', setAudioTime);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('play', onPlay);

    return () => {
      // Cleanup: Save progress for the OLD id before we switch or unmount
      if (audio.currentTime > 0) {
          try {
             window.localStorage.setItem(`progress-${id}`, audio.currentTime.toString());
          } catch (e) {}
      }
      
      audio.pause();
      audio.removeEventListener('loadedmetadata', setAudioData);
      audio.removeEventListener('timeupdate', setAudioTime);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('play', onPlay);
      audio.src = "";
    };
  }, [src, id]); // Re-run when source or ID changes

  // Handle Volume Changes
  useEffect(() => {
    if (audioRef.current) {
        audioRef.current.volume = volume;
    }
  }, [volume]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio || !src || error) return;

    if (playing) {
      audio.pause();
    } else {
      try {
        await audio.play();
      } catch (err) {
        console.error("Playback failed:", err);
      }
    }
  };

  const seek = (time: number) => {
    const audio = audioRef.current;
    if (!audio || !src || error) return;
    if (audio.readyState === 0) return; 
    
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const changeVolume = (val: number) => {
      const clamped = Math.max(0, Math.min(1, val));
      setVolume(clamped);
  };

  const setPlaybackRate = useCallback((rate: number) => {
    setPlaybackRateState(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }, []);

  const setLoopRange = useCallback((range: LoopRange | null) => {
    setLoopRangeState(range);
  }, []);

  const waitForReady = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      const audio = audioRef.current;
      if (!audio || !src) {
        resolve();
        return;
      }
      if (audio.readyState >= 1 && !isNaN(audio.duration)) {
        resolve();
        return;
      }
      const handleReady = () => {
        audio.removeEventListener('loadedmetadata', handleReady);
        resolve();
      };
      audio.addEventListener('loadedmetadata', handleReady);
    });
  }, [src]);

  const seekAndLoop = useCallback(async (time: number, range?: LoopRange | null) => {
    const audio = audioRef.current;
    if (!audio || !src) return;

    if (audio.readyState < 1 || isNaN(audio.duration)) {
      pendingSeekRef.current = { time, range };
      return;
    }

    const safeTime = Math.max(0, Math.min(time, audio.duration - 0.1));
    audio.currentTime = safeTime;
    setCurrentTime(safeTime);
    if (range) {
      setLoopRangeState(range);
      loopRangeRef.current = range;
    }
  }, [src]);

  return {
    playing,
    currentTime,
    duration,
    togglePlay,
    seek,
    volume,
    changeVolume,
    error,
    loading,
    playbackRate,
    setPlaybackRate,
    loopRange,
    setLoopRange,
    waitForReady,
    seekAndLoop,
    audioRef,
  };
};
