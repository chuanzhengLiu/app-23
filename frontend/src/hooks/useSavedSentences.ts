import { useState, useEffect, useCallback } from 'react';
import { get, set } from 'idb-keyval';

export interface SavedSentence {
  id: string;
  lessonId: string;
  lessonTitle: string;
  text: string;
  startTime: number;
  endTime: number;
  savedAt: number;
}

const STORE_KEY = 'saved-sentences';

export const useSavedSentences = () => {
  const [sentences, setSentences] = useState<SavedSentence[]>([]);

  useEffect(() => {
    const loadSentences = async () => {
      try {
        const stored = await get<SavedSentence[]>(STORE_KEY);
        if (stored) {
          setSentences(stored);
        }
      } catch (e) {
        console.warn('Failed to load saved sentences:', e);
      }
    };
    loadSentences();
  }, []);

  const saveSentences = useCallback(async (updated: SavedSentence[]) => {
    setSentences(updated);
    try {
      await set(STORE_KEY, updated);
    } catch (e) {
      console.warn('Failed to save sentences:', e);
    }
  }, []);

  const addSentence = useCallback((sentence: Omit<SavedSentence, 'id' | 'savedAt'>) => {
    const newSentence: SavedSentence = {
      ...sentence,
      id: `sent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      savedAt: Date.now(),
    };
    saveSentences([newSentence, ...sentences.filter(s => 
      !(s.lessonId === sentence.lessonId && s.startTime === sentence.startTime)
    )]);
    return newSentence;
  }, [sentences, saveSentences]);

  const removeSentence = useCallback((id: string) => {
    saveSentences(sentences.filter(s => s.id !== id));
  }, [sentences, saveSentences]);

  const isSentenceSaved = useCallback((lessonId: string, startTime: number) => {
    return sentences.some(s => s.lessonId === lessonId && s.startTime === startTime);
  }, [sentences]);

  const getSentencesByLesson = useCallback((lessonId: string) => {
    return sentences.filter(s => s.lessonId === lessonId);
  }, [sentences]);

  return {
    sentences,
    addSentence,
    removeSentence,
    isSentenceSaved,
    getSentencesByLesson,
  };
};
