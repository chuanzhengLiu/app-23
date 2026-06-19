import { get, set, del } from 'idb-keyval';
import { LrcLine } from './lrcParser';

export interface FavoriteSentence {
  id: string;
  lessonId: string;
  lessonTitle: string;
  lineIndex: number;
  text: string;
  startTime: number;
  endTime: number;
  createdAt: number;
}

const STORE_PREFIX = 'sentence_fav_';
const INDEX_KEY = 'sentence_fav_index';

export const saveFavoriteSentence = async (sentence: Omit<FavoriteSentence, 'id' | 'createdAt'>) => {
  const id = `sf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const full: FavoriteSentence = {
    ...sentence,
    id,
    createdAt: Date.now(),
  };
  await set(STORE_PREFIX + id, full);
  
  const index = await get<string[]>(INDEX_KEY) || [];
  await set(INDEX_KEY, [id, ...index]);
  return full;
};

export const loadFavoriteSentences = async (): Promise<FavoriteSentence[]> => {
  const index = await get<string[]>(INDEX_KEY) || [];
  const sentences = await Promise.all(
    index.map(id => get<FavoriteSentence>(STORE_PREFIX + id))
  );
  return sentences.filter((s): s is FavoriteSentence => !!s);
};

export const deleteFavoriteSentence = async (id: string) => {
  await del(STORE_PREFIX + id);
  const index = await get<string[]>(INDEX_KEY) || [];
  await set(INDEX_KEY, index.filter(i => i !== id));
};

export const isSentenceFavorite = async (lessonId: string, lineIndex: number, sentences?: FavoriteSentence[]) => {
  const list = sentences || await loadFavoriteSentences();
  return list.some(s => s.lessonId === lessonId && s.lineIndex === lineIndex);
};

export const getLineEndTime = (lines: LrcLine[], index: number): number => {
  if (index < lines.length - 1) {
    return lines[index + 1].time;
  }
  return lines[index].time + 5;
};
