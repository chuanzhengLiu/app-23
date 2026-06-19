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
  id: string;          // Unique id: `${lessonId}_${time}` so the same sentence is not duplicated
  lessonId: string;
  lessonTitle: string;
  text: string;
  start: number;       // Start time in seconds
  end: number;         // End time in seconds
  createdAt: number;
}

const STORE_PREFIX = 'lesson_';
const SENTENCE_PREFIX = 'sentence_';

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
  
  // Convert Blobs to URLs
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

export const saveSentence = async (sentence: SavedSentence) => {
    await set(SENTENCE_PREFIX + sentence.id, sentence);
};

export const deleteSentence = async (id: string) => {
    await del(SENTENCE_PREFIX + id);
};

export const loadSentences = async (): Promise<SavedSentence[]> => {
    const allKeys = await keys();
    const sentenceKeys = allKeys.filter(k => typeof k === 'string' && k.startsWith(SENTENCE_PREFIX));
    const sentences = await Promise.all(sentenceKeys.map(k => get<SavedSentence>(k)));
    return sentences
        .filter((s): s is SavedSentence => !!s)
        .sort((a, b) => b.createdAt - a.createdAt);
};
