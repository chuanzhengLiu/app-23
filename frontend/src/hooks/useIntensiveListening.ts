import { useState, useCallback } from 'react';

export const SPEED_PRESETS = [0.5, 0.75, 1.0, 1.25, 1.5];

interface UseIntensiveListeningProps {
  currentTime: number;
  setLoopRange: (start: number, end: number) => void;
  clearLoopRange: () => void;
  setPlaybackRate: (rate: number) => void;
  seek: (time: number) => void;
}

export const useIntensiveListening = ({
  currentTime,
  setLoopRange,
  clearLoopRange,
  setPlaybackRate,
  seek,
}: UseIntensiveListeningProps) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [pointA, setPointA] = useState<number | null>(null);
  const [pointB, setPointB] = useState<number | null>(null);
  const [selectedLineIndex, setSelectedLineIndex] = useState<number | null>(null);
  const [activeSpeed, setActiveSpeed] = useState(1.0);

  const enableMode = useCallback(() => {
    setIsEnabled(true);
  }, []);

  const disableMode = useCallback(() => {
    setIsEnabled(false);
    setPointA(null);
    setPointB(null);
    setSelectedLineIndex(null);
    clearLoopRange();
    setPlaybackRate(1.0);
    setActiveSpeed(1.0);
  }, [clearLoopRange, setPlaybackRate]);

  const setPointAHere = useCallback(() => {
    setPointA(currentTime);
    setSelectedLineIndex(null);
    if (pointB !== null && pointB > currentTime) {
      setLoopRange(currentTime, pointB);
    } else {
      clearLoopRange();
      setPointB(null);
    }
  }, [currentTime, pointB, setLoopRange, clearLoopRange]);

  const setPointBHere = useCallback(() => {
    setPointB(currentTime);
    setSelectedLineIndex(null);
    if (pointA !== null && currentTime > pointA) {
      setLoopRange(pointA, currentTime);
    }
  }, [currentTime, pointA, setLoopRange]);

  const clearABPoints = useCallback(() => {
    setPointA(null);
    setPointB(null);
    clearLoopRange();
  }, [clearLoopRange]);

  const loopLine = useCallback((startTime: number, endTime: number, index: number) => {
    if (!isEnabled) return;
    setSelectedLineIndex(index);
    setPointA(null);
    setPointB(null);
    setLoopRange(startTime, endTime);
    seek(startTime);
  }, [isEnabled, setLoopRange, seek]);

  const clearLineLoop = useCallback(() => {
    setSelectedLineIndex(null);
    clearLoopRange();
  }, [clearLoopRange]);

  const changeSpeed = useCallback((speed: number) => {
    const clamped = SPEED_PRESETS.includes(speed) ? speed : 1.0;
    setActiveSpeed(clamped);
    setPlaybackRate(clamped);
  }, [setPlaybackRate]);

  const hasLoop = pointA !== null && pointB !== null && pointB > pointA;

  return {
    isEnabled,
    enableMode,
    disableMode,
    pointA,
    pointB,
    setPointAHere,
    setPointBHere,
    clearABPoints,
    selectedLineIndex,
    loopLine,
    clearLineLoop,
    activeSpeed,
    changeSpeed,
    hasLoop,
  };
};
