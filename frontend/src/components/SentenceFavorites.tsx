import React from 'react';
import { X, Trash2, Play, BookOpen, Clock, Music } from 'lucide-react';
import { SavedSentence } from '../utils/db';

interface SentenceFavoritesProps {
  isOpen: boolean;
  sentences: SavedSentence[];
  onClose: () => void;
  onPlaySentence: (sentence: SavedSentence) => void;
  onDeleteSentence: (id: string) => void;
  currentLessonId?: string;
}

const formatTime = (time: number) => {
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatDate = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
};

export const SentenceFavorites: React.FC<SentenceFavoritesProps> = ({
  isOpen,
  sentences,
  onClose,
  onPlaySentence,
  onDeleteSentence,
  currentLessonId,
}) => {
  if (!isOpen) return null;

  const groupedByLesson = sentences.reduce((acc, sentence) => {
    if (!acc[sentence.lessonId]) {
      acc[sentence.lessonId] = {
        lessonTitle: sentence.lessonTitle,
        sentences: [],
      };
    }
    acc[sentence.lessonId].sentences.push(sentence);
    return acc;
  }, {} as Record<string, { lessonTitle: string; sentences: SavedSentence[] }>);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 w-full max-w-lg max-h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex-none flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-amber-500 to-orange-500">
          <div className="flex items-center space-x-2 text-white">
            <BookOpen size={20} />
            <h2 className="text-lg font-bold">难句收藏</h2>
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">{sentences.length}</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {sentences.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <BookOpen size={48} className="mb-4 opacity-50" />
              <p className="text-center">还没有收藏的难句</p>
              <p className="text-sm text-center mt-1">在精听模式下点击句子旁的星标收藏</p>
            </div>
          ) : (
            Object.entries(groupedByLesson).map(([lessonId, { lessonTitle, sentences: lessonSentences }]) => (
              <div key={lessonId} className="space-y-2">
                <div className="flex items-center space-x-2 text-sm font-medium text-gray-500 dark:text-gray-400 px-1">
                  <Music size={14} />
                  <span className="truncate">{lessonTitle}</span>
                  <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{lessonSentences.length}句</span>
                  {lessonId === currentLessonId && (
                    <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full">当前课程</span>
                  )}
                </div>
                <div className="space-y-2">
                  {lessonSentences.map((sentence) => (
                    <div
                      key={sentence.id}
                      className="group bg-gray-50 dark:bg-gray-800 rounded-xl p-3 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                    >
                      <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed pr-16">
                        {sentence.text}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center space-x-2 text-xs text-gray-400">
                          <Clock size={12} />
                          <span>{formatTime(sentence.time)}</span>
                          <span>·</span>
                          <span>{formatDate(sentence.createdAt)}</span>
                        </div>
                        <div className={`flex items-center space-x-1 transition-opacity
                          opacity-60 md:opacity-0 md:group-hover:opacity-100
                        `}>
                          <button
                            onClick={() => onPlaySentence(sentence)}
                            className="p-2 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-full transition bg-white/80 dark:bg-gray-700/80"
                            title="播放此句"
                          >
                            <Play size={16} fill="currentColor" />
                          </button>
                          <button
                            onClick={() => onDeleteSentence(sentence.id)}
                            className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition bg-white/80 dark:bg-gray-700/80"
                            title="删除"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
