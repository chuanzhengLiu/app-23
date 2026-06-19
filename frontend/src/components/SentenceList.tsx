import React from 'react';
import { Heart, Repeat, Play } from 'lucide-react';
import { SavedSentence } from '../utils/db';

interface SentenceListProps {
  sentences: SavedSentence[];
  onReview: (sentence: SavedSentence) => void;
  onRemove: (id: string) => void;
}

const formatTime = (time: number) => {
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const SentenceList: React.FC<SentenceListProps> = ({ sentences, onReview, onRemove }) => {
  if (sentences.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400">
        <Heart size={32} className="mx-auto mb-2 opacity-40" />
        <p>还没有收藏的难句</p>
        <p className="text-xs mt-1">在精听模式下点击句子右侧的爱心来收藏</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sentences.map((s) => (
        <div
          key={s.id}
          className="group relative p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-all"
        >
          <div className="flex items-start space-x-3">
            <button
              onClick={() => onReview(s)}
              className="flex-none w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-sm hover:bg-blue-500 active:scale-95 transition"
              title="复习这句"
            >
              <Play size={16} fill="currentColor" className="ml-0.5" />
            </button>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100 break-words">
                {s.text || '(无歌词)'}
              </p>
              <div className="flex items-center space-x-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                <span className="truncate">{s.lessonTitle}</span>
                <span className="flex-none flex items-center space-x-1">
                  <Repeat size={10} />
                  <span className="font-mono">
                    {formatTime(s.start)} - {formatTime(s.end)}
                  </span>
                </span>
              </div>
            </div>

            <button
              onClick={() => onRemove(s.id)}
              className="flex-none p-2 text-red-500 hover:text-red-400 active:scale-90 transition"
              title="移除收藏"
            >
              <Heart size={16} className="fill-red-500" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
