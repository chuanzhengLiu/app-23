import { useState, useCallback, useEffect } from 'react';
import { LoopRange } from './useAudio';
import { LrcLine } from '../utils/lrcParser';
import {
  FavoriteSentence,
  saveFavoriteSentence,
  loadFavoriteSentences,
  deleteFavoriteSentence,
  getLineEndTime,
} from '../utils/sentenceFavorites';

export const PLAYBACK_RATES = [0.5, 0.75, 1.0, 1.25, 1.5] as const;

export type IntensiveMode = 'off' | 'ab-loop' | 'sentence-loop';

interface UseIntensiveListeningProps {
  lessonId: string;
  lessonTitle: string;
  lines: LrcLine[];
  setLoopRange: (range: LoopRange | null) => void;
  setPlaybackRate: (rate: number) => void;
  seek: (time: number) => void;
  seekAndLoop?: (time: number, range?: LoopRange | null) => Promise<void>;
}

export const useIntensiveListening = ({
  lessonId,
  lessonTitle,
  lines,
  setLoopRange,
  setPlaybackRate,
  seek,
  seekAndLoop,
}: UseIntensiveListeningProps) => {
  const [isIntensiveMode, setIsIntensiveMode] = useState(false);
  const [mode, setMode] = useState<IntensiveMode>('off');
  const [abPointA, setAbPointA] = useState<number | null>(null);
  const [abPointB, setAbPointB] = useState<number | null>(null);
  const [selectedLineIndex, setSelectedLineIndex] = useState<number | null>(null);
  const [favoriteSentences, setFavoriteSentences] = useState<FavoriteSentence[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);

  useEffect(() => {
    loadFavoriteSentences().then(setFavoriteSentences);
  }, []);

  useEffect(() => {
    setAbPointA(null);
    setAbPointB(null);
    setSelectedLineIndex(null);
    setLoopRange(null);
  }, [lessonId, setLoopRange]);

  const toggleIntensiveMode = useCallback(() => {
    setIsIntensiveMode(prev => {
      if (prev) {
        setMode('off');
        setAbPointA(null);
        setAbPointB(null);
        setSelectedLineIndex(null);
        setLoopRange(null);
        setPlaybackRate(1.0);
      }
      return !prev;
    });
  }, [setLoopRange, setPlaybackRate]);

  const clearAllLoop = useCallback(() => {
    setAbPointA(null);
    setAbPointB(null);
    setSelectedLineIndex(null);
    setLoopRange(null);
    setMode('off');
  }, [setLoopRange]);

  const setRangePoint = useCallback((time: number) => {
    if (selectedLineIndex !== null) {
      clearAllLoop();
    }
    if (abPointA === null) {
      setAbPointA(time);
      setAbPointB(null);
      setLoopRange(null);
      setMode('ab-loop');
    } else if (abPointB === null) {
      if (time > abPointA) {
        setAbPointB(time);
        setLoopRange({ start: abPointA, end: time });
        setMode('ab-loop');
      } else {
        setAbPointA(time);
        setAbPointB(null);
        setLoopRange(null);
      }
    } else {
      setAbPointA(time);
      setAbPointB(null);
      setLoopRange(null);
    }
  }, [abPointA, abPointB, selectedLineIndex, setLoopRange, clearAllLoop]);

  const selectLine = useCallback((index: number) => {
    const line = lines[index];
    if (!line) return;

    if (!isIntensiveMode) {
      seek(line.time);
      return;
    }

    const endTime = getLineEndTime(lines, index);
    setSelectedLineIndex(index);
    setAbPointA(null);
    setAbPointB(null);
    setLoopRange({ start: line.time, end: endTime });
    setMode('sentence-loop');
    seek(line.time);
  }, [lines, isIntensiveMode, setLoopRange, seek]);

  const playFavoriteSentence = useCallback(async (sentence: FavoriteSentence) => {
    setIsIntensiveMode(true);
    setSelectedLineIndex(null);
    setAbPointA(null);
    setAbPointB(null);
    if (seekAndLoop) {
      await seekAndLoop(sentence.startTime, { start: sentence.startTime, end: sentence.endTime });
    }
  }, [seekAndLoop]);

  const changePlaybackRate = useCallback((rate: number) => {
    if (PLAYBACK_RATES.includes(rate as typeof PLAYBACK_RATES[number])) {
      setPlaybackRate(rate);
    }
  }, [setPlaybackRate]);

  const toggleSentenceFavorite = useCallback(async (index: number) => {
    const line = lines[index];
    if (!line) return;

    const existing = favoriteSentences.find(
      s => s.lessonId === lessonId && s.lineIndex === index
    );

    if (existing) {
      await deleteFavoriteSentence(existing.id);
      setFavoriteSentences(prev => prev.filter(s => s.id !== existing.id));
    } else {
      const endTime = getLineEndTime(lines, index);
      const saved = await saveFavoriteSentence({
        lessonId,
        lessonTitle,
        lineIndex: index,
        text: line.text,
        startTime: line.time,
        endTime,
      });
      setFavoriteSentences(prev => [saved, ...prev]);
    }
  }, [lines, lessonId, lessonTitle, favoriteSentences]);

  const isSentenceFavorited = useCallback((index: number) => {
    return favoriteSentences.some(
      s => s.lessonId === lessonId && s.lineIndex === index
    );
  }, [favoriteSentences, lessonId]);

  const removeFavoriteSentence = useCallback(async (id: string) => {
    await deleteFavoriteSentence(id);
    setFavoriteSentences(prev => prev.filter(s => s.id !== id));
  }, []);

  return {
    isIntensiveMode,
    toggleIntensiveMode,
    mode,
    abPointA,
    abPointB,
    setRangePoint,
    clearAllLoop,
    selectedLineIndex,
    selectLine,
    playbackRates: PLAYBACK_RATES,
    changePlaybackRate,
    favoriteSentences,
    toggleSentenceFavorite,
    isSentenceFavorited,
    removeFavoriteSentence,
    showFavorites,
    setShowFavorites,
    playFavoriteSentence,
  };
};
