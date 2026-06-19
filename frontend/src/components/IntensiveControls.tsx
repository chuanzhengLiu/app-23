import React from 'react';
import {
  Zap,
  Bookmark,
  X,
  Repeat1,
} from 'lucide-react';

interface IntensiveControlsProps {
  isIntensiveMode: boolean;
  onToggleMode: () => void;
  playbackRate: number;
  playbackRates: readonly number[];
  onChangePlaybackRate: (rate: number) => void;
  onShowFavorites: () => void;
  favoriteCount: number;
  isLooping: boolean;
}

export const IntensiveControls: React.FC<IntensiveControlsProps> = ({
  isIntensiveMode,
  onToggleMode,
  playbackRate,
  playbackRates,
  onChangePlaybackRate,
  onShowFavorites,
  favoriteCount,
  isLooping,
}) => {
  if (!isIntensiveMode) {
    return (
      <button
        onClick={onToggleMode}
        className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full text-sm font-medium shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all active:scale-95"
      >
        <Zap size={16} />
        <span>精听模式</span>
      </button>
    );
  }

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-full">
            <Zap size={14} className="text-orange-600 dark:text-orange-400" />
            <span className="text-sm font-medium text-orange-700 dark:text-orange-300">精听模式</span>
            {isLooping && <Repeat1 size={12} className="text-orange-500" />}
          </div>
          <button
            onClick={onShowFavorites}
            className="flex items-center space-x-1 px-3 py-1.5 bg-yellow-100 dark:bg-yellow-900/30 rounded-full text-sm font-medium text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition"
          >
            <Bookmark size={14} />
            <span className="hidden sm:inline">难句本</span>
            {favoriteCount > 0 && (
              <span className="bg-yellow-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                {favoriteCount}
              </span>
            )}
          </button>
        </div>
        <button
          onClick={onToggleMode}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <X size={18} />
        </button>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">语速调节</span>
          <div className="flex items-center space-x-1">
            {playbackRates.map(rate => (
              <button
                key={rate}
                onClick={() => onChangePlaybackRate(rate)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition
                  ${Math.abs(playbackRate - rate) < 0.01
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }
                `}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="text-xs text-center text-gray-500 dark:text-gray-400">
        点击歌词循环单句 · 点击进度条设置 A-B 区间
      </div>
    </div>
  );
};
