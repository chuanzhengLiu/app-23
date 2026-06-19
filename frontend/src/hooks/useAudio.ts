import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

export interface LoopRegion {
  start: number;
  end: number;
}

interface UseAudioProps {
  src: string;
  id: string; // Used for persistence key
}

export const useAudio = ({ src, id }: UseAudioProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Persist Volume (Global)
  const [volume, setVolume] = useLocalStorage<number>('audio-volume', 1.0);
  // Persist playback rate (Global) - intensive listening speed control
  const [playbackRate, setPlaybackRate] = useLocalStorage<number>('audio-rate', 1.0);

  // AB loop region for intensive listening. null = no loop.
  const [loopRegion, setLoopRegionState] = useState<LoopRegion | null>(null);
  const loopRegionRef = useRef<LoopRegion | null>(null);
  // Debounce loop-jump so timeupdate firing right at the boundary doesn't cause flicker.
  const lastLoopJumpRef = useRef<number>(0);
  // Small lead time so the loop wraps slightly before the exact end, avoiding
  // boundary jitter (e.g. timeupdate fires past `end` repeatedly while seeking).
  const LOOP_LEAD_TIME = 0.05; // seconds
  const LOOP_JUMP_COOLDOWN_MS = 250;

  // Ref to track if we need to save progress when ID changes
  const progressRef = useRef(0);

  useEffect(() => {
    // When ID changes, we need to load the saved time for the NEW ID.
    // The previous ID's progress is saved continuously or on pause, 
    // but strict isolation means we define usage: `progress-${id}`.
    
    // Reset transient state
    setPlaying(false);
    setError(null);
    setLoading(false);

    // Switching to a new audio source: drop any AB loop region from the previous
    // lesson so it doesn't accidentally jump around in the new audio.
    setLoopRegionState(null);
    loopRegionRef.current = null;
    lastLoopJumpRef.current = 0;

    // Cleanup old audio
    if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
    }

    if (!src) return;

    const audio = new Audio(src);
    audioRef.current = audio;
    audio.volume = volume; // Apply global volume
    audio.playbackRate = playbackRate; // Apply persisted playback rate
    setLoading(true);

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
      // Resume if valid and not finished
      if (savedTime > 0 && savedTime < audio.duration - 2) { 
         audio.currentTime = savedTime;
         setCurrentTime(savedTime);
      }
    };

    const setAudioTime = () => {
      const curr = audio.currentTime;

      // Intensive listening: AB loop. Wrap a little BEFORE `end` (LOOP_LEAD_TIME)
      // so the boundary doesn't flicker when timeupdate fires multiple times
      // very close to end. A short cooldown also prevents double-jumps if the
      // browser fires timeupdate again right after we re-seek to start.
      const region = loopRegionRef.current;
      if (region && region.end > region.start) {
        const threshold = Math.max(region.start + 0.01, region.end - LOOP_LEAD_TIME);
        const now = Date.now();
        if (curr >= threshold && now - lastLoopJumpRef.current > LOOP_JUMP_COOLDOWN_MS) {
          lastLoopJumpRef.current = now;
          audio.currentTime = region.start;
          setCurrentTime(region.start);
          progressRef.current = region.start;
          return;
        }
        // While in the cooldown window after a jump, ignore timeupdate values
        // that are still past the end (rare but happens on some browsers).
        if (curr >= region.end && now - lastLoopJumpRef.current <= LOOP_JUMP_COOLDOWN_MS) {
          return;
        }
      }

      setCurrentTime(curr);
      progressRef.current = curr;
      
      // Save periodically (e.g. every 2 seconds is handled by the UI/event loop naturally via timeupdate)
      // Writing to localStorage on every frame (timeupdate fires frequently) is bad. 
      // Let's debounce or just save on pause/destruct. 
      // Actually, standard practice for simple apps: save on pause/unmount is better for performance, 
      // but riskier if crash. Let's do a simple check to save every ~5s or just on pause.
      // For this app, let's stick to saving on UNMOUNT or ID CHANGE (cleanup) + PAUSE.
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

  // Handle Playback Rate Changes
  useEffect(() => {
    if (audioRef.current) {
        audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Keep loopRegion ref in sync so the timeupdate listener (registered once per src/id)
  // can read the latest value without needing to re-bind.
  useEffect(() => {
    loopRegionRef.current = loopRegion;
  }, [loopRegion]);

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

  const changePlaybackRate = useCallback((rate: number) => {
      // Clamp to reasonable bounds matching intensive listening presets (0.5x ~ 1.5x)
      const clamped = Math.max(0.5, Math.min(1.5, rate));
      setPlaybackRate(clamped);
  }, [setPlaybackRate]);

  const setLoopRegion = useCallback((region: LoopRegion | null) => {
      // Reset cooldown so the first wrap after a (re)set works immediately.
      lastLoopJumpRef.current = 0;
      if (!region) {
          setLoopRegionState(null);
          return;
      }
      const start = Math.max(0, region.start);
      const end = Math.max(start + 0.05, region.end);
      setLoopRegionState({ start, end });
      // If currently outside region, jump to start so loop kicks in immediately.
      const audio = audioRef.current;
      if (audio && (audio.currentTime < start || audio.currentTime >= end)) {
          audio.currentTime = start;
          setCurrentTime(start);
      }
  }, []);

  const clearLoopRegion = useCallback(() => {
      lastLoopJumpRef.current = 0;
      setLoopRegionState(null);
  }, []);

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
    changePlaybackRate,
    loopRegion,
    setLoopRegion,
    clearLoopRegion,
  };
};
