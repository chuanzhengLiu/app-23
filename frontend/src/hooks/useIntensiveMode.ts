import { useState, useCallback } from 'react';
import { LrcLine } from '../utils/lrcParser';

export const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5] as const;
export type PlaybackRate = typeof PLAYBACK_RATES[number];

interface IntensiveModeState {
  enabled: boolean;
  pointA: number | null;
  pointB: number | null;
  selectedLineIndex: number | null;
}

export const useIntensiveMode = () => {
  const [state, setState] = useState<IntensiveModeState>({
    enabled: false,
    pointA: null,
    pointB: null,
    selectedLineIndex: null,
  });

  const enableMode = useCallback(() => {
    setState(prev => ({
      ...prev,
      enabled: true,
    }));
  }, []);

  const disableMode = useCallback(() => {
    setState({
      enabled: false,
      pointA: null,
      pointB: null,
      selectedLineIndex: null,
    });
  }, []);

  const toggleMode = useCallback(() => {
    setState(prev => ({
      ...prev,
      enabled: !prev.enabled,
      pointA: null,
      pointB: null,
      selectedLineIndex: null,
    }));
  }, []);

  const setRange = useCallback((start: number, end: number, lineIndex?: number) => {
    setState(prev => ({
      ...prev,
      enabled: true,
      pointA: start,
      pointB: end,
      selectedLineIndex: lineIndex ?? null,
    }));
  }, []);

  const setPointA = useCallback((time: number) => {
    setState(prev => ({
      ...prev,
      pointA: time,
      pointB: null,
      selectedLineIndex: null,
    }));
  }, []);

  const setPointB = useCallback((time: number) => {
    setState(prev => {
      if (prev.pointA === null) return prev;
      const start = Math.min(prev.pointA, time);
      const end = Math.max(prev.pointA, time);
      if (end - start < 0.3) return prev;
      return {
        ...prev,
        pointB: end,
        pointA: start,
        selectedLineIndex: null,
      };
    });
  }, []);

  const setCurrentAsPointA = useCallback((currentTime: number) => {
    setPointA(currentTime);
  }, [setPointA]);

  const setCurrentAsPointB = useCallback((currentTime: number) => {
    setPointB(currentTime);
  }, [setPointB]);

  const selectLine = useCallback((index: number, lines: LrcLine[]) => {
    if (index < 0 || index >= lines.length) return;
    const line = lines[index];
    const nextLine = lines[index + 1];
    const start = line.time;
    const end = nextLine ? nextLine.time : start + 5;
    
    setState(prev => ({
      ...prev,
      enabled: true,
      selectedLineIndex: index,
      pointA: start,
      pointB: end,
    }));
  }, []);

  const clearSelection = useCallback(() => {
    setState(prev => ({
      ...prev,
      pointA: null,
      pointB: null,
      selectedLineIndex: null,
    }));
  }, []);

  const getLoopRange = useCallback((): { start: number; end: number } | null => {
    if (state.pointA !== null && state.pointB !== null) {
      return { start: state.pointA, end: state.pointB };
    }
    return null;
  }, [state.pointA, state.pointB]);

  const findLineIndexByTime = useCallback((time: number, lines: LrcLine[]): number => {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const nextLine = lines[i + 1];
      if (time >= line.time && (!nextLine || time < nextLine.time)) {
        return i;
      }
    }
    return lines.length - 1;
  }, []);

  const isABSet = state.pointA !== null && state.pointB !== null;
  const isWaitingForB = state.pointA !== null && state.pointB === null;

  return {
    enabled: state.enabled,
    pointA: state.pointA,
    pointB: state.pointB,
    selectedLineIndex: state.selectedLineIndex,
    isABSet,
    isWaitingForB,
    toggleMode,
    enableMode,
    disableMode,
    setRange,
    setPointA,
    setPointB,
    setCurrentAsPointA,
    setCurrentAsPointB,
    selectLine,
    clearSelection,
    getLoopRange,
    findLineIndexByTime,
  };
};
