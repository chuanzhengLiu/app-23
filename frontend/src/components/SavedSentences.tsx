import React, { useState, useMemo } from 'react';
import { ArrowLeft, Play, Pause, Trash2, BookOpen, Volume2 } from 'lucide-react';
import { SavedSentence } from '../hooks/useSavedSentences';

interface SavedSentencesViewProps {
  sentences: SavedSentence[];
  onBack: () => void;
  onRemove: (id: string) => void;
  onPlaySentence: (sentence: SavedSentence) => void;
  currentlyPlayingId: string | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  getLessonTitle: (lessonId: string) => string;
}

const formatDate = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
};

export const SavedSentencesView: React.FC<SavedSentencesViewProps> = ({
  sentences,
  onBack,
  onRemove,
  onPlaySentence,
  currentlyPlayingId,
  isPlaying,
  onTogglePlay,
  getLessonTitle,
}) => {
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const lessonGroups = useMemo(() => {
    const groups: Record<string, SavedSentence[]> = {};
    sentences.forEach(s => {
      const title = getLessonTitle(s.lessonId) || s.lessonTitle;
      if (!groups[title]) groups[title] = [];
      groups[title].push(s);
    });
    return groups;
  }, [sentences, getLessonTitle]);

  const uniqueLessons = Object.keys(lessonGroups);

  const filteredSentences = useMemo(() => {
    if (activeFilter === 'all') return sentences;
    const title = activeFilter;
    return sentences.filter(s => (getLessonTitle(s.lessonId) || s.lessonTitle) === title);
  }, [sentences, activeFilter, getLessonTitle]);

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="flex-none bg-white dark:bg-gray-800 px-4 py-3 shadow-sm border-b border-gray-100 dark:border-gray-700 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
          >
            <ArrowLeft size={22} />
          </button>
          <div className="flex items-center gap-2">
            <BookOpen size={20} className="text-yellow-500" />
            <h1 className="text-lg font-bold dark:text-white">难句收藏</h1>
          </div>
          <span className="ml-auto text-sm text-gray-400">{sentences.length} 句</span>
        </div>
      </div>

      {sentences.length > 0 && (
        <div className="flex-none bg-white dark:bg-gray-800/50 px-4 py-2 border-b border-gray-100 dark:border-gray-700 overflow-x-auto">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap transition
                ${activeFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }
              `}
            >
              全部 ({sentences.length})
            </button>
            {uniqueLessons.map(title => (
              <button
                key={title}
                onClick={() => setActiveFilter(title)}
                className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap transition
                  ${activeFilter === title
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }
                `}
              >
                {title} ({lessonGroups[title].length})
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {filteredSentences.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 py-20">
            <BookOpen size={48} className="mb-4 opacity-30" />
            <p className="text-center">
              {sentences.length === 0 
                ? '还没有收藏的难句' 
                : '在精听模式下点击句末书签即可收藏'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSentences.map((sentence) => {
              const isCurrentPlaying = currentlyPlayingId === sentence.id;
              return (
                <div
                  key={sentence.id}
                  className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border transition-all relative overflow-hidden
                    ${isCurrentPlaying 
                      ? 'border-blue-500 ring-2 ring-blue-500/30 bg-blue-50 dark:bg-blue-900/10' 
                      : 'border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600'
                    }
                  `}
                >
                  {isCurrentPlaying && isPlaying && (
                    <span className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 animate-pulse" />
                  )}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 flex-wrap">
                      {isCurrentPlaying && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500 text-white rounded-full text-[10px] font-bold">
                          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                          复习中
                        </span>
                      )}
                      <span className="truncate max-w-[150px]">{sentence.lessonTitle}</span>
                      <span>·</span>
                      <span>{formatDate(sentence.savedAt)}</span>
                    </div>
                    <button
                      onClick={() => onRemove(sentence.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition flex-shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <p className={`text-base leading-relaxed mb-3 ${
                    isCurrentPlaying 
                      ? 'text-blue-700 dark:text-blue-300 font-medium' 
                      : 'text-gray-800 dark:text-gray-200'
                  }`}>
                    {sentence.text}
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => isCurrentPlaying ? onTogglePlay() : onPlaySentence(sentence)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition active:scale-95
                        ${isCurrentPlaying && isPlaying
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400'
                        }
                      `}
                    >
                      {isCurrentPlaying && isPlaying ? (
                        <><Pause size={16} fill="currentColor" /> 暂停</>
                      ) : (
                        <><Play size={16} fill="currentColor" /> {isCurrentPlaying ? '继续' : '播放'}</>
                      )}
                    </button>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Volume2 size={14} />
                      <span className="font-mono">
                        {Math.floor(sentence.startTime / 60)}:{Math.floor(sentence.startTime % 60).toString().padStart(2, '0')}
                        {' - '}
                        {Math.floor(sentence.endTime / 60)}:{Math.floor(sentence.endTime % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
