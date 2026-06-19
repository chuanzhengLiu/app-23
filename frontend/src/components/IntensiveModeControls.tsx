import React from 'react';
import { Repeat, X, Zap, Flag, BookOpen } from 'lucide-react';
import { PLAYBACK_RATES } from '../hooks/useIntensiveMode';

interface IntensiveModeControlsProps {
  enabled: boolean;
  isWaitingForB: boolean;
  isABSet: boolean;
  playbackRate: number;
  currentTime: number;
  onToggleMode: () => void;
  onSetPointA: () => void;
  onSetPointB: () => void;
  onClearSelection: () => void;
  onSetPlaybackRate: (rate: number) => void;
  onViewFavorites?: () => void;
}

const formatTime = (time: number) => {
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const IntensiveModeControls: React.FC<IntensiveModeControlsProps> = ({
  enabled,
  isWaitingForB,
  isABSet,
  playbackRate,
  currentTime,
  onToggleMode,
  onSetPointA,
  onSetPointB,
  onClearSelection,
  onSetPlaybackRate,
  onViewFavorites,
}) => {
  if (!enabled) {
    return (
      <button
        onClick={onToggleMode}
        className="flex items-center space-x-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-full text-sm font-medium transition-all active:scale-95 shadow-lg shadow-amber-500/30"
      >
        <BookOpen size={16} />
        <span>精听模式</span>
      </button>
    );
  }

  return (
    <div className="w-full bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <BookOpen size={18} className="text-amber-600 dark:text-amber-400" />
          <span className="font-bold text-amber-800 dark:text-amber-200 text-sm">精听模式</span>
        </div>
        <div className="flex items-center space-x-2">
          {onViewFavorites && (
            <button
              onClick={onViewFavorites}
              className="p-2 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-800 rounded-full transition"
              title="查看收藏的难句"
            >
              <Repeat size={16} />
            </button>
          )}
          <button
            onClick={onToggleMode}
            className="p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition"
            title="退出精听模式"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex items-center space-x-2 mb-3">
        <button
          onClick={onSetPointA}
          className={`flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
            isWaitingForB || isABSet
              ? 'bg-blue-500 text-white'
              : 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30'
          }`}
        >
          <Flag size={12} />
          <span>A点 {isWaitingForB || isABSet ? formatTime(currentTime) : '设起点'}</span>
        </button>
        <button
          onClick={isABSet ? onClearSelection : onSetPointB}
          disabled={!isWaitingForB && !isABSet}
          className={`flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
            isABSet
              ? 'bg-red-500 text-white'
              : isWaitingForB
              ? 'bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 animate-pulse'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isABSet ? (
            <>
              <X size={12} />
              <span>清除循环</span>
            </>
          ) : (
            <>
              <Flag size={12} />
              <span>B点 {isWaitingForB ? '设终点' : '...'}</span>
            </>
          )}
        </button>
      </div>

      {isABSet && (
        <div className="flex items-center justify-center space-x-1 mb-3 text-xs text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 py-1.5 rounded-lg">
          <Repeat size={12} className="animate-spin-slow" />
          <span>区间循环中 · 点击歌词可单句循环</span>
        </div>
      )}

      <div className="flex items-center justify-center space-x-1">
        <Zap size={14} className="text-gray-500 mr-1" />
        {PLAYBACK_RATES.map((rate) => (
          <button
            key={rate}
            onClick={() => onSetPlaybackRate(rate)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              Math.abs(playbackRate - rate) < 0.01
                ? 'bg-amber-500 text-white shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
            }`}
          >
            {rate}x
          </button>
        ))}
      </div>

      <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-2">
        💡 点击歌词可循环单句，悬停句子可收藏难句
      </p>
    </div>
  );
};
