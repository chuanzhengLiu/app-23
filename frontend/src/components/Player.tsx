import React, { useRef, useState } from 'react';
import { Play, Pause, FastForward, Rewind, Volume2, Repeat, Headphones, X } from 'lucide-react';

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
  // --- Intensive listening (all optional; absence keeps original layout) ---
  intensiveMode?: boolean;
  onToggleIntensiveMode?: () => void;
  playbackRate?: number;
  onPlaybackRateChange?: (rate: number) => void;
  loopRegion?: { start: number; end: number } | null;
  onClearLoopRegion?: () => void;
  onLoopRegionChange?: (region: { start: number; end: number }) => void;
}

const formatTime = (time: number) => {
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Common speed presets between 0.5x and 1.5x
const SPEED_PRESETS = [0.5, 0.75, 1.0, 1.25, 1.5];

// Minimum drag distance (px) to count as a region selection rather than a tap.
const DRAG_THRESHOLD_PX = 4;
// Minimum loop length (seconds) — anything shorter is treated as a tap (seek only).
const MIN_LOOP_LENGTH_SEC = 0.3;

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
  intensiveMode = false,
  onToggleIntensiveMode,
  playbackRate = 1.0,
  onPlaybackRateChange,
  loopRegion = null,
  onClearLoopRegion,
  onLoopRegionChange,
}) => {
  const showIntensiveControls = !!onToggleIntensiveMode;
  const showSpeedControls = !!onPlaybackRateChange;
  const enableRangeSelect = !!(intensiveMode && onLoopRegionChange && duration > 0);

  // --- Drag-to-select region on the progress bar (intensive mode only) ---
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragStartXRef = useRef<number | null>(null);
  const dragStartTimeRef = useRef<number>(0);
  const [draftRegion, setDraftRegion] = useState<{ start: number; end: number } | null>(null);

  const xToTime = (clientX: number): number => {
    const el = trackRef.current;
    if (!el || duration <= 0) return 0;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return ratio * duration;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!enableRangeSelect) return;
    // Only handle primary button / single touch
    if (e.button !== undefined && e.button !== 0) return;
    dragStartXRef.current = e.clientX;
    dragStartTimeRef.current = xToTime(e.clientX);
    setDraftRegion(null);
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!enableRangeSelect || dragStartXRef.current === null) return;
    const dx = Math.abs(e.clientX - dragStartXRef.current);
    if (dx < DRAG_THRESHOLD_PX) return;
    const t = xToTime(e.clientX);
    const startT = dragStartTimeRef.current;
    const start = Math.min(startT, t);
    const end = Math.max(startT, t);
    setDraftRegion({ start, end });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!enableRangeSelect || dragStartXRef.current === null) return;
    const dx = Math.abs(e.clientX - dragStartXRef.current);
    const endT = xToTime(e.clientX);
    const startT = dragStartTimeRef.current;
    const start = Math.min(startT, endT);
    const end = Math.max(startT, endT);

    dragStartXRef.current = null;
    setDraftRegion(null);

    if (dx >= DRAG_THRESHOLD_PX && end - start >= MIN_LOOP_LENGTH_SEC) {
      onLoopRegionChange!({ start, end });
    } else {
      // Treat as a tap: just seek to that point. Falls through to existing seek logic.
      onSeek(endT);
    }
  };

  const handlePointerCancel = () => {
    dragStartXRef.current = null;
    setDraftRegion(null);
  };

  const displayedRegion = draftRegion ?? loopRegion;

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

        {/* Progress Bar */}
        <div className="flex items-center space-x-3 mb-6">
          <span className="text-xs text-gray-400 w-10 text-right font-mono">{formatTime(currentTime)}</span>
          <div className="flex-1 relative" ref={trackRef}>
            {/* Loop region overlay (uses draft region while dragging) */}
            {displayedRegion && duration > 0 && (
              <div
                className={`absolute top-1/2 -translate-y-1/2 h-1.5 rounded-lg pointer-events-none ${
                  draftRegion ? 'bg-amber-400/60' : 'bg-blue-400/50'
                }`}
                style={{
                  left: `${(displayedRegion.start / duration) * 100}%`,
                  width: `${Math.max(0, ((displayedRegion.end - displayedRegion.start) / duration) * 100)}%`,
                }}
              />
            )}
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={(e) => onSeek(Number(e.target.value))}
              className={`relative w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-500 transition-all ${
                enableRangeSelect ? 'pointer-events-none' : ''
              }`}
            />
            {/* Drag-to-select overlay: only active in intensive mode. */}
            {enableRangeSelect && (
              <div
                className="absolute inset-0 -my-2 cursor-crosshair touch-none"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerCancel}
                title="按住拖动框选 A-B 区间，单击则跳转"
              />
            )}
          </div>
          <span className="text-xs text-gray-400 w-10 font-mono">{formatTime(duration)}</span>
        </div>

        {/* Controls */}
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

        {/* Intensive Mode Toolbar */}
        {showIntensiveControls && (
          <div className="flex items-center justify-between mb-4 px-2">
            <button
              onClick={onToggleIntensiveMode}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-bold transition active:scale-95 ${
                intensiveMode
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
              }`}
              title="精听模式"
            >
              <Headphones size={14} />
              <span>{intensiveMode ? '精听中' : '精听'}</span>
            </button>

            {loopRegion && onClearLoopRegion && (
              <button
                onClick={onClearLoopRegion}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 hover:bg-amber-200 transition active:scale-95"
                title="取消循环"
              >
                <Repeat size={12} />
                <span>
                  {formatTime(loopRegion.start)} - {formatTime(loopRegion.end)}
                </span>
                <X size={12} />
              </button>
            )}

            {showSpeedControls && (
              <div className="flex items-center space-x-1">
                {SPEED_PRESETS.map((rate) => (
                  <button
                    key={rate}
                    onClick={() => onPlaybackRateChange!(rate)}
                    className={`px-2 py-1 rounded-full text-xs font-mono transition active:scale-95 ${
                      Math.abs(playbackRate - rate) < 0.001
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Volume Control */}
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
