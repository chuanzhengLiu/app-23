import React from 'react';
import {
  X,
  Trash2,
  Play,
  Clock,
  BookOpen,
} from 'lucide-react';
import { FavoriteSentence } from '../utils/sentenceFavorites';

interface SentenceFavoritesViewProps {
  sentences: FavoriteSentence[];
  onClose: () => void;
  onPlaySentence: (sentence: FavoriteSentence) => void;
  onDeleteSentence: (id: string) => void;
}

const formatTime = (time: number) => {
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatDate = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  });
};

export const SentenceFavoritesView: React.FC<SentenceFavoritesViewProps> = ({
  sentences,
  onClose,
  onPlaySentence,
  onDeleteSentence,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col">
      <div className="flex-none flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="flex items-center space-x-3">
          <BookOpen size={24} className="text-yellow-500" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">难句本</h2>
          <span className="text-sm text-gray-500">({sentences.length} 句)</span>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {sentences.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
            <BookOpen size={64} className="opacity-30" />
            <p className="text-lg">还没有收藏的难句</p>
            <p className="text-sm">在精听模式下点击句子旁的星标收藏难句</p>
          </div>
        ) : (
          sentences.map((sentence) => (
            <div
              key={sentence.id}
              className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-medium text-blue-600 dark:text-blue-400 truncate max-w-[200px]">
                    {sentence.lessonTitle}
                  </span>
                  <span className="flex items-center space-x-1">
                    <Clock size={12} />
                    <span>{formatTime(sentence.startTime)}</span>
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatDate(sentence.createdAt)}
                  </span>
                </div>
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onPlaySentence(sentence)}
                    className="p-1.5 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full transition"
                  >
                    <Play size={16} fill="currentColor" />
                  </button>
                  <button
                    onClick={() => onDeleteSentence(sentence.id)}
                    className="p-1.5 text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <p className="text-gray-900 dark:text-white text-lg leading-relaxed">
                {sentence.text}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
