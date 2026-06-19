import React, { useRef, useState, useCallback } from 'react';
import { Play, Pause, FastForward, Rewind, Volume2, X } from 'lucide-react';
import { LoopRange } from '../hooks/useAudio';

interface PlayerProps {
  playing: boolean;
  currentTime: number;
  duration: number;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  title: string;
  volume: number;
  onVolumeChange: (val: number) => void;
  onToggleFavorite?: () => void;
  isFavorite?: boolean;
  isIntensiveMode?: boolean;
  abPointA: number | null;
  abPointB: number | null;
  loopRange: LoopRange | null;
  onSetRangePoint: (time: number) => void;
  onClearLoop: () => void;
}

const formatTime = (time: number) => {
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const Player: React.FC<PlayerProps> = ({
  playing,
  currentTime,
  duration,
  onTogglePlay,
  onSeek,
  title,
  volume,
  onVolumeChange,
  onToggleFavorite,
  isFavorite,
  isIntensiveMode = false,
  abPointA,
  abPointB,
  loopRange,
  onSetRangePoint,
  onClearLoop,
}) => {
  const progressRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);

  const getTimeFromClientX = useCallback((clientX: number) => {
    if (!progressRef.current || !duration) return 0;
    const rect = progressRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    return (x / rect.width) * duration;
  }, [duration]);

  const getEventClientX = (e: React.MouseEvent | React.TouchEvent | MouseEvent | Touch) => {
    if ('touches' in e && e.touches.length > 0) {
      return e.touches[0].clientX;
    }
    if ('changedTouches' in e && e.changedTouches.length > 0) {
      return e.changedTouches[0].clientX;
    }
    if ('clientX' in e) {
      return e.clientX;
    }
    return 0;
  };

  const handleStart = useCallback((clientX: number) => {
    setHasMoved(false);
    const time = getTimeFromClientX(clientX);
    if (isIntensiveMode && !loopRange) {
      onSetRangePoint(time);
    } else {
      setIsDragging(true);
      onSeek(time);
    }
  }, [getTimeFromClientX, isIntensiveMode, loopRange, onSetRangePoint, onSeek]);

  const handleMove = useCallback((clientX: number) => {
    if (!isDragging) return;
    setHasMoved(true);
    const time = getTimeFromClientX(clientX);
    onSeek(time);
  }, [isDragging, getTimeFromClientX, onSeek]);

  const handleEnd = useCallback((clientX: number) => {
    if (isDragging) {
      const time = getTimeFromClientX(clientX);
      onSeek(time);
      setIsDragging(false);
    }
  }, [isDragging, getTimeFromClientX, onSeek]);

  React.useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX);
      const handleMouseUp = (e: MouseEvent) => handleEnd(e.clientX);
      const handleTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        handleMove(e.touches[0].clientX);
      };
      const handleTouchEnd = (e: TouchEvent) => {
        handleEnd(e.changedTouches[0].clientX);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, handleMove, handleEnd]);

  const handleClick = useCallback((clientX: number) => {
    const moved = hasMoved;
    if (moved) return;

    const time = getTimeFromClientX(clientX);
    if (isIntensiveMode && !loopRange) {
      onSetRangePoint(time);
    } else {
      onSeek(time);
    }
  }, [hasMoved, getTimeFromClientX, isIntensiveMode, loopRange, onSetRangePoint, onSeek]);

  const rangeStart = loopRange ? loopRange.start : (abPointA ?? null);
  const rangeEnd = loopRange ? loopRange.end : (abPointB ?? null);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const rangeStartPercent = rangeStart !== null && duration > 0 ? (rangeStart / duration) * 100 : null;
  const rangeEndPercent = rangeEnd !== null && duration > 0 ? (rangeEnd / duration) * 100 : null;

  return (
    <div className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 shadow-xl pb-safe transition-colors duration-300">
      <div className="px-6 py-4">
        <div className="mb-6 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate pr-4">{title}</h3>
            {onToggleFavorite && (
              <button onClick={onToggleFavorite} className="p-2 transition active:scale-95">
                 <span className={`text-2xl ${isFavorite ? 'text-red-500' : 'text-gray-300'}`}>
                   {isFavorite ? '♥' : '♡'}
                 </span>
              </button>
            )}
        </div>

        <div className="mb-2">
          <div
            ref={progressRef}
            className={`relative h-2 rounded-full cursor-pointer touch-none select-none ${
              isIntensiveMode ? 'h-3 bg-orange-100 dark:bg-orange-900/30' : 'bg-gray-200 dark:bg-gray-700'
            }`}
            onMouseDown={(e) => {
              e.preventDefault();
              handleStart(e.clientX);
            }}
            onClick={(e) => handleClick(e.clientX)}
            onTouchStart={(e) => {
              handleStart(getEventClientX(e));
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              handleClick(getEventClientX(e));
            }}
          >
            {rangeStartPercent !== null && rangeEndPercent !== null && (
              <div
                className="absolute h-full bg-orange-300 dark:bg-orange-500/50 rounded-full"
                style={{
                  left: `${rangeStartPercent}%`,
                  width: `${rangeEndPercent - rangeStartPercent}%`,
                }}
              />
            )}
            {rangeStartPercent !== null && rangeEndPercent === null && (
              <div
                className="absolute h-full w-0.5 bg-orange-500"
                style={{ left: `${rangeStartPercent}%` }}
              />
            )}

            <div
              className="absolute h-full bg-blue-600 dark:bg-blue-500 rounded-full pointer-events-none transition-[width] duration-100"
              style={{ width: `${progressPercent}%` }}
            />

            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-blue-600 rounded-full shadow-lg pointer-events-none transition-[left] duration-100"
              style={{ left: `calc(${progressPercent}% - 8px)` }}
            />

            {rangeStartPercent !== null && (
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-orange-500 rounded-full shadow pointer-events-none"
                style={{ left: `calc(${rangeStartPercent}% - 6px)` }}
              />
            )}
            {rangeEndPercent !== null && (
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-orange-500 rounded-full shadow pointer-events-none"
                style={{ left: `calc(${rangeEndPercent}% - 6px)` }}
              />
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-400 w-10 text-right font-mono">{formatTime(currentTime)}</span>
            {isIntensiveMode && loopRange && (
              <button
                onClick={onClearLoop}
                className="flex items-center space-x-1 px-2 py-0.5 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full hover:bg-orange-200 dark:hover:bg-orange-900/50 transition"
              >
                <span>循环: {formatTime(loopRange.start)}-{formatTime(loopRange.end)}</span>
                <X size={12} />
              </button>
            )}
            {isIntensiveMode && abPointA !== null && abPointB === null && !loopRange && (
              <span className="px-2 py-0.5 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full">
                起点已设: {formatTime(abPointA)}，点击设置终点
              </span>
            )}
          </div>
          <span className="text-xs text-gray-400 w-10 font-mono">{formatTime(duration)}</span>
        </div>

        <div className="flex justify-center items-center space-x-8 mb-6">
           <button
             className="p-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition active:scale-95"
             onClick={() => onSeek(Math.max(0, currentTime - 10))}
           >
             <Rewind size={28} />
             <span className="sr-only">-10s</span>
           </button>

           <button
             onClick={onTogglePlay}
             className="w-20 h-20 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center text-white shadow-xl shadow-blue-500/30 active:scale-95 transition-all"
           >
             {playing ? (
               <Pause size={40} fill="currentColor" />
             ) : (
               <Play size={40} fill="currentColor" className="ml-2" />
             )}
           </button>

           <button
             className="p-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition active:scale-95"
             onClick={() => onSeek(Math.min(duration, currentTime + 10))}
           >
             <FastForward size={28} />
             <span className="sr-only">+10s</span>
           </button>
        </div>

        <div className="flex items-center space-x-4 px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl">
           <Volume2 size={20} className="text-gray-400" />
           <input
             type="range"
             min={0}
             max={1}
             step={0.05}
             value={volume}
             onChange={(e) => onVolumeChange(Number(e.target.value))}
             className="flex-1 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-gray-500 dark:accent-gray-400"
           />
        </div>

      </div>
    </div>
  );
};
