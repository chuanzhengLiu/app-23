import { useState, useEffect, useCallback } from 'react';
import { saveSentence, loadSavedSentences, deleteSentence, isSentenceSaved, SavedSentence } from '../utils/db';

export const useSentenceFavorites = () => {
  const [sentences, setSentences] = useState<SavedSentence[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const saved = await loadSavedSentences();
      setSentences(saved.sort((a, b) => b.createdAt - a.createdAt));
    } catch (e) {
      console.warn('Failed to load saved sentences:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addSentence = useCallback(async (sentence: { lessonId: string; lessonTitle: string; text: string; time: number; endTime?: number }) => {
    try {
      await saveSentence(sentence);
      await refresh();
    } catch (e) {
      console.warn('Failed to save sentence:', e);
    }
  }, [refresh]);

  const removeSentence = useCallback(async (sentenceId: string) => {
    try {
      await deleteSentence(sentenceId);
      await refresh();
    } catch (e) {
      console.warn('Failed to delete sentence:', e);
    }
  }, [refresh]);

  const checkSentenceSaved = useCallback(async (lessonId: string, time: number, text: string): Promise<boolean> => {
    try {
      return await isSentenceSaved(lessonId, time, text);
    } catch (e) {
      return false;
    }
  }, []);

  const isSentenceInList = useCallback((lessonId: string, time: number, text: string) => {
    return sentences.some(
      s => s.lessonId === lessonId && Math.abs(s.time - time) < 0.5 && s.text === text
    );
  }, [sentences]);

  return {
    sentences,
    loading,
    addSentence,
    removeSentence,
    checkSentenceSaved,
    isSentenceInList,
    refresh,
  };
};
