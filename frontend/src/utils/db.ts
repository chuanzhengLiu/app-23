import { get, set, keys, del } from 'idb-keyval';

export interface SavedLesson {
  id: string;
  title: string;
  category: string;
  audioFile: Blob;
  lrcFile?: Blob;
  createdAt: number;
}

export interface SavedSentence {
  id: string;
  lessonId: string;
  lessonTitle: string;
  text: string;
  time: number;
  endTime?: number;
  createdAt: number;
}

const STORE_PREFIX = 'lesson_';
const SENTENCE_KEY = 'saved_sentences';

export const saveLocalLesson = async (lesson: { id: string; title: string; category: string }, audio: File, lrc?: File) => {
  const data: SavedLesson = {
    id: lesson.id,
    title: lesson.title,
    category: lesson.category,
    audioFile: audio,
    lrcFile: lrc,
    createdAt: Date.now(),
  };
  await set(STORE_PREFIX + lesson.id, data);
};

export const loadLocalLessons = async () => {
  const allKeys = await keys();
  const lessonKeys = allKeys.filter(k => typeof k === 'string' && k.startsWith(STORE_PREFIX));
  
  const lessons = await Promise.all(lessonKeys.map(k => get<SavedLesson>(k)));
  
  return lessons.filter((l): l is SavedLesson => !!l).map(l => ({
    id: l.id,
    title: l.title,
    category: l.category,
    audioUrl: URL.createObjectURL(l.audioFile),
    lrcUrl: l.lrcFile ? URL.createObjectURL(l.lrcFile) : undefined,
    keywords: ['local']
  }));
};

export const deleteLocalLesson = async (id: string) => {
    await del(STORE_PREFIX + id);
};

export const saveSentence = async (sentence: Omit<SavedSentence, 'id' | 'createdAt'>) => {
  const sentences = await loadSavedSentences();
  const exists = sentences.some(
    s => s.lessonId === sentence.lessonId && Math.abs(s.time - sentence.time) < 0.5 && s.text === sentence.text
  );
  if (exists) return;
  
  const newSentence: SavedSentence = {
    ...sentence,
    id: `sentence-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: Date.now(),
  };
  sentences.push(newSentence);
  await set(SENTENCE_KEY, sentences);
};

export const loadSavedSentences = async (): Promise<SavedSentence[]> => {
  const sentences = await get<SavedSentence[]>(SENTENCE_KEY);
  return sentences || [];
};

export const deleteSentence = async (sentenceId: string) => {
  const sentences = await loadSavedSentences();
  const filtered = sentences.filter(s => s.id !== sentenceId);
  await set(SENTENCE_KEY, filtered);
};

export const isSentenceSaved = async (lessonId: string, time: number, text: string): Promise<boolean> => {
  const sentences = await loadSavedSentences();
  return sentences.some(
    s => s.lessonId === lessonId && Math.abs(s.time - time) < 0.5 && s.text === text
  );
};
