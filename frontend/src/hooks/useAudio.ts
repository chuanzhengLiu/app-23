import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

interface UseAudioProps {
  src: string;
  id: string;
}

interface LoopRange {
  start: number;
  end: number;
}

interface PendingAction {
  seekTo?: number;
  loopRange?: LoopRange;
  play?: boolean;
}

export const useAudio = ({ src, id }: UseAudioProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [loopRange, setLoopRangeState] = useState<LoopRange | null>(null);
  const [isReady, setIsReady] = useState(false);
  
  const [volume, setVolume] = useLocalStorage<number>('audio-volume', 1.0);
  
  const progressRef = useRef(0);
  const loopRangeRef = useRef<LoopRange | null>(null);
  const playbackRateRef = useRef(1);
  const pendingActionRef = useRef<PendingAction | null>(null);

  const executePendingAction = useCallback((audio: HTMLAudioElement) => {
    const action = pendingActionRef.current;
    if (!action) return;
    pendingActionRef.current = null;

    if (action.seekTo !== undefined) {
      audio.currentTime = action.seekTo;
      setCurrentTime(action.seekTo);
    }
    if (action.loopRange) {
      loopRangeRef.current = action.loopRange;
      setLoopRangeState(action.loopRange);
    }
    if (action.play) {
      audio.play().catch(err => console.error("Delayed play failed:", err));
    }
  }, []);

  const playFrom = useCallback((time: number, range?: LoopRange) => {
    const audio = audioRef.current;
    if (!audio || !src || error) return;

    if (audio.readyState >= 2 && !loading) {
      if (range) {
        loopRangeRef.current = range;
        setLoopRangeState(range);
      }
      audio.currentTime = time;
      setCurrentTime(time);
      audio.play().catch(err => console.error("Play failed:", err));
    } else {
      pendingActionRef.current = { seekTo: time, loopRange: range, play: true };
      setLoading(true);
    }
  }, [src, error, loading]);

  const clearLoop = useCallback(() => {
    loopRangeRef.current = null;
    setLoopRangeState(null);
  }, []);

  const setLoop = useCallback((start: number, end: number) => {
    const clampedStart = Math.max(0, start);
    const clampedEnd = Math.min(duration || Infinity, end);
    if (clampedStart >= clampedEnd) return;
    const range = { start: clampedStart, end: clampedEnd };
    loopRangeRef.current = range;
    setLoopRangeState(range);
  }, [duration]);

  const setPlaybackRate = useCallback((rate: number) => {
    const clamped = Math.max(0.5, Math.min(1.5, rate));
    playbackRateRef.current = clamped;
    setPlaybackRateState(clamped);
    if (audioRef.current) {
      audioRef.current.playbackRate = clamped;
    }
  }, []);

  useEffect(() => {
    setPlaying(false);
    setError(null);
    setLoading(false);
    setIsReady(false);
    clearLoop();
    pendingActionRef.current = null;
    
    if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
    }

    if (!src) return;

    const audio = new Audio(src);
    audioRef.current = audio;
    audio.volume = volume;
    audio.playbackRate = playbackRateRef.current;
    setLoading(true);
    
    let savedTime = 0;
    try {
        const saved = window.localStorage.getItem(`progress-${id}`);
        if (saved) savedTime = parseFloat(saved);
    } catch (e) { console.warn("Failed to read saved progress", e); }

    const setAudioData = () => {
      setDuration(audio.duration);
      setLoading(false);
      setIsReady(true);
      
      if (pendingActionRef.current) {
        executePendingAction(audio);
      } else if (savedTime > 0 && savedTime < audio.duration - 2) { 
         audio.currentTime = savedTime;
         setCurrentTime(savedTime);
      }
    };

    const setAudioTime = () => {
      const curr = audio.currentTime;
      setCurrentTime(curr);
      progressRef.current = curr;
      
      const loop = loopRangeRef.current;
      if (loop && curr >= loop.end) {
        audio.currentTime = loop.start;
        setCurrentTime(loop.start);
      }
    };

    const onEnded = () => {
      const loop = loopRangeRef.current;
      if (loop) {
        audio.currentTime = loop.start;
        setCurrentTime(loop.start);
        audio.play().catch(() => {});
      } else {
        setPlaying(false);
        setCurrentTime(0);
        try {
          window.localStorage.removeItem(`progress-${id}`);
        } catch (e) {}
      }
    };

    const onError = (e: Event) => {
      console.warn("Audio error event:", e);
      setLoading(false);
      setIsReady(false);
      setPlaying(false);
      pendingActionRef.current = null;
      
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
        try {
            window.localStorage.setItem(`progress-${id}`, audio.currentTime.toString());
        } catch (e) {}
    };

    const onPlay = () => {
        setPlaying(true);
    };

    audio.addEventListener('loadedmetadata', setAudioData);
    audio.addEventListener('canplay', () => {
      setLoading(false);
      setIsReady(true);
      if (pendingActionRef.current) {
        executePendingAction(audio);
      }
    });
    audio.addEventListener('timeupdate', setAudioTime);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('play', onPlay);

    return () => {
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
  }, [src, id, clearLoop, executePendingAction]);

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
    if (audio.readyState === 0) {
      pendingActionRef.current = { ...pendingActionRef.current, seekTo: time };
      return;
    }
    
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const changeVolume = (val: number) => {
      const clamped = Math.max(0, Math.min(1, val));
      setVolume(clamped);
  };

  return {
    audioRef,
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
    setLoop,
    clearLoop,
    isReady,
    playFrom,
  };
};
