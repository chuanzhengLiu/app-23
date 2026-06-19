import React from 'react';
import { X, Circle, Flag, Repeat, Gauge } from 'lucide-react';
import { SPEED_PRESETS } from '../hooks/useIntensiveListening';

interface IntensiveModeControlsProps {
  pointA: number | null;
  pointB: number | null;
  hasLoop: boolean;
  selectedLineIndex: number | null;
  activeSpeed: number;
  onSetPointA: () => void;
  onSetPointB: () => void;
  onClearAB: () => void;
  onClearLineLoop: () => void;
  onChangeSpeed: (speed: number) => void;
  onDisable: () => void;
}

const formatTime = (time: number | null) => {
  if (time === null) return '--:--';
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const IntensiveModeControls: React.FC<IntensiveModeControlsProps> = ({
  pointA,
  pointB,
  hasLoop,
  selectedLineIndex,
  activeSpeed,
  onSetPointA,
  onSetPointB,
  onClearAB,
  onClearLineLoop,
  onChangeSpeed,
  onDisable,
}) => {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-t border-blue-200 dark:border-blue-800 px-4 py-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 text-white p-1.5 rounded-lg">
            <Gauge size={16} />
          </div>
          <span className="font-bold text-blue-700 dark:text-blue-300 text-sm">精听模式</span>
        </div>
        <button
          onClick={onDisable}
          className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-lg transition"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">语速:</span>
        {SPEED_PRESETS.map((speed) => (
          <button
            key={speed}
            onClick={() => onChangeSpeed(speed)}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition active:scale-95
              ${activeSpeed === speed
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-gray-200 dark:border-gray-700'
              }
            `}
          >
            {speed}x
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">区间循环:</span>
        
        <button
          onClick={onSetPointA}
          className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg transition active:scale-95
            ${pointA !== null
              ? 'bg-green-600 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-green-50 dark:hover:bg-green-900/20'
            }
          `}
        >
          <Circle size={12} fill={pointA !== null ? 'currentColor' : 'none'} />
          A {formatTime(pointA)}
        </button>

        <button
          onClick={onSetPointB}
          disabled={pointA === null}
          className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg transition active:scale-95
            ${pointB !== null
              ? 'bg-red-600 text-white'
              : pointA === null
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 border border-gray-200 dark:border-gray-700 cursor-not-allowed'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20'
            }
          `}
        >
          <Flag size={12} />
          B {formatTime(pointB)}
        </button>

        {hasLoop && (
          <button
            onClick={onClearAB}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition active:scale-95"
          >
            <Repeat size={12} className="animate-pulse" />
            循环中
          </button>
        )}

        {selectedLineIndex !== null && (
          <button
            onClick={onClearLineLoop}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition active:scale-95"
          >
            <Repeat size={12} className="animate-pulse" />
            单句循环
          </button>
        )}
      </div>

      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">
        💡 点击歌词可单句循环；A-B 按钮可框选段落反复听；点击句末书签收藏难句
      </p>
    </div>
  );
};
