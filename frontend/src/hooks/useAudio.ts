import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

interface LoopRange {
  start: number;
  end: number;
}

interface PendingAction {
  seekTime?: number;
  loopStart?: number;
  loopEnd?: number;
  autoPlay?: boolean;
}

interface UseAudioProps {
  src: string;
  id: string;
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
  const playbackRateRef = useRef(1.0);
  const pendingActionRef = useRef<PendingAction | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const isReadyRef = useRef(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    loopRangeRef.current = loopRange;
  }, [loopRange]);

  useEffect(() => {
    playbackRateRef.current = playbackRate;
  }, [playbackRate]);

  const executePendingAction = useCallback(async (audio: HTMLAudioElement) => {
    const pending = pendingActionRef.current;
    if (!pending) return;
    pendingActionRef.current = null;
    
    if (pending.loopStart !== undefined && pending.loopEnd !== undefined) {
      const safeStart = Math.max(0, pending.loopStart);
      const safeEnd = Math.min(audio.duration || Infinity, pending.loopEnd);
      if (safeEnd > safeStart) {
        setLoopRangeState({ start: safeStart, end: safeEnd });
        loopRangeRef.current = { start: safeStart, end: safeEnd };
      }
    }

    if (pending.seekTime !== undefined) {
      const targetTime = Math.max(0, Math.min((audio.duration || Infinity) - 0.1, pending.seekTime));
      audio.currentTime = targetTime;
      setCurrentTime(targetTime);
    }

    if (pending.autoPlay) {
      try {
        await audio.play();
      } catch (err) {
        console.warn("Auto-play failed:", err);
      }
    }
  }, []);

  useEffect(() => {
    setPlaying(false);
    setError(null);
    setLoading(false);
    setIsReady(false);
    isReadyRef.current = false;
    
    if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
    }

    if (!src) return;

    const audio = new Audio(src);
    audioRef.current = audio;
    currentAudioRef.current = audio;
    audio.volume = volume;
    audio.playbackRate = playbackRateRef.current;
    setLoading(true);
    setLoopRangeState(null);
    setPlaybackRateState(1.0);
    
    let savedTime = 0;
    try {
        const saved = window.localStorage.getItem(`progress-${id}`);
        if (saved) savedTime = parseFloat(saved);
    } catch (e) { console.warn("Failed to read saved progress", e); }

    const setAudioData = async () => {
      setDuration(audio.duration);
      setLoading(false);
      setIsReady(true);
      isReadyRef.current = true;

      if (pendingActionRef.current) {
        await executePendingAction(audio);
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
      
      const loop = loopRangeRef.current;
      if (loop && curr >= loop.end) {
        audio.currentTime = loop.start;
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
      setIsReady(false);
      isReadyRef.current = false;
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
  }, [src, id, executePendingAction]);

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
    const clamped = Math.max(0.5, Math.min(1.5, rate));
    setPlaybackRateState(clamped);
    if (audioRef.current) {
      audioRef.current.playbackRate = clamped;
    }
  }, []);

  const setLoopRange = useCallback((start: number, end: number) => {
    const safeStart = Math.max(0, start);
    const safeEnd = Math.min(duration || Infinity, end);
    if (safeEnd > safeStart) {
      setLoopRangeState({ start: safeStart, end: safeEnd });
      loopRangeRef.current = { start: safeStart, end: safeEnd };
      if (audioRef.current && isReadyRef.current) {
        audioRef.current.currentTime = safeStart;
      }
    }
  }, [duration]);

  const clearLoopRange = useCallback(() => {
    setLoopRangeState(null);
    loopRangeRef.current = null;
  }, []);

  const playRangeWhenReady = useCallback((start: number, end: number, autoPlay = true) => {
    const action: PendingAction = {
      seekTime: start,
      loopStart: start,
      loopEnd: end,
      autoPlay,
    };
    pendingActionRef.current = action;

    const audio = currentAudioRef.current;
    if (audio && isReadyRef.current && audio.src && !error) {
      executePendingAction(audio);
    }
  }, [executePendingAction, error]);

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
    isReady,
    playbackRate,
    setPlaybackRate,
    loopRange,
    setLoopRange,
    clearLoopRange,
    playRangeWhenReady,
    audioRef,
  };
};
