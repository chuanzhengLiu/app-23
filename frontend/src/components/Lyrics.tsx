import React, { useEffect, useRef, useState } from 'react';
import { Heart, Repeat } from 'lucide-react';
import { LrcLine } from '../utils/lrcParser';

interface LyricsProps {
  lines: LrcLine[];
  currentTime: number;
  // --- Intensive listening (all optional; absence keeps original behavior) ---
  intensiveMode?: boolean;
  duration?: number;
  loopRegion?: { start: number; end: number } | null;
  onLineLoop?: (line: LrcLine, index: number, end: number) => void;
  onRangeLoop?: (startIdx: number, endIdx: number, start: number, end: number) => void;
  onToggleSentenceFavorite?: (line: LrcLine, index: number, end: number) => void;
  isSentenceFavorite?: (start: number) => boolean;
}

// Drag-vs-tap detection thresholds for in-line region selection.
const LINE_DRAG_THRESHOLD_PX = 4;
const LINE_MIN_LOOP_LENGTH_SEC = 0.3;

export const Lyrics: React.FC<LyricsProps> = ({
  lines,
  currentTime,
  intensiveMode = false,
  duration,
  loopRegion = null,
  onLineLoop,
  onRangeLoop,
  onToggleSentenceFavorite,
  isSentenceFavorite,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeIndex = lines.findIndex((line, index) => {
    const nextLine = lines[index + 1];
    return currentTime >= line.time && (!nextLine || currentTime < nextLine.time);
  });

  // Range selection state (intensive mode only): user clicks two lines to define [A, B].
  const [rangeAnchor, setRangeAnchor] = useState<number | null>(null);

  // --- In-line drag-to-select state (intensive mode only) ---
  // While the user drags inside a single lyric line, we map cursor X (within the
  // text element) to a fraction of the line's time window [lineStart, lineEnd].
  const dragLineIndexRef = useRef<number | null>(null);
  const dragStartXRef = useRef<number | null>(null);
  const dragHappenedRef = useRef(false);
  const [draftLineRegion, setDraftLineRegion] = useState<
    { index: number; startRatio: number; endRatio: number } | null
  >(null);

  // Reset anchor when leaving intensive mode or switching lessons (lines change identity).
  useEffect(() => {
    if (!intensiveMode) {
      setRangeAnchor(null);
      setDraftLineRegion(null);
      dragLineIndexRef.current = null;
      dragStartXRef.current = null;
      dragHappenedRef.current = false;
    }
  }, [intensiveMode, lines]);

  useEffect(() => {
    if (activeIndex !== -1 && containerRef.current) {
      const activeElement = containerRef.current.children[activeIndex] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  }, [activeIndex]);

  const getLineEnd = (index: number): number => {
    const next = lines[index + 1];
    if (next) return next.time;
    if (typeof duration === 'number' && duration > 0) return duration;
    return lines[index].time + 5; // Fallback window
  };

  const isLineInLoop = (index: number): boolean => {
    if (!loopRegion) return false;
    const lineStart = lines[index].time;
    const lineEnd = getLineEnd(index);
    return lineStart >= loopRegion.start - 0.01 && lineEnd <= loopRegion.end + 0.01;
  };

  const handleLineClick = (index: number) => {
    if (!intensiveMode || !onLineLoop) return;
    // If a drag selection just finished on this line, swallow the click so we
    // don't also trigger single-line loop on top of the just-committed range.
    if (dragHappenedRef.current) {
      dragHappenedRef.current = false;
      return;
    }
    const line = lines[index];
    onLineLoop(line, index, getLineEnd(index));
    setRangeAnchor(null);
  };

  const handleRangeClick = (e: React.MouseEvent, index: number) => {
    if (!intensiveMode || !onRangeLoop) return;
    e.stopPropagation();
    if (rangeAnchor === null) {
      setRangeAnchor(index);
      return;
    }
    const startIdx = Math.min(rangeAnchor, index);
    const endIdx = Math.max(rangeAnchor, index);
    onRangeLoop(startIdx, endIdx, lines[startIdx].time, getLineEnd(endIdx));
    setRangeAnchor(null);
  };

  const handleSentenceFavoriteClick = (e: React.MouseEvent, index: number) => {
    if (!onToggleSentenceFavorite) return;
    e.stopPropagation();
    onToggleSentenceFavorite(lines[index], index, getLineEnd(index));
  };

  // --- In-line drag handlers (intensive mode + onRangeLoop required) ---
  const computeRatio = (clientX: number, target: HTMLElement): number => {
    const rect = target.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  };

  const handleLinePointerDown = (e: React.PointerEvent<HTMLParagraphElement>, index: number) => {
    if (!intensiveMode || !onRangeLoop) return;
    if (e.button !== undefined && e.button !== 0) return;
    dragLineIndexRef.current = index;
    dragStartXRef.current = e.clientX;
    dragHappenedRef.current = false;
    setDraftLineRegion(null);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleLinePointerMove = (e: React.PointerEvent<HTMLParagraphElement>, index: number) => {
    if (!intensiveMode || !onRangeLoop) return;
    if (dragLineIndexRef.current !== index || dragStartXRef.current === null) return;
    const dx = Math.abs(e.clientX - dragStartXRef.current);
    if (dx < LINE_DRAG_THRESHOLD_PX) return;
    dragHappenedRef.current = true;
    const startRatio = computeRatio(dragStartXRef.current, e.currentTarget);
    const currentRatio = computeRatio(e.clientX, e.currentTarget);
    setDraftLineRegion({
      index,
      startRatio: Math.min(startRatio, currentRatio),
      endRatio: Math.max(startRatio, currentRatio),
    });
  };

  const handleLinePointerUp = (e: React.PointerEvent<HTMLParagraphElement>, index: number) => {
    if (!intensiveMode || !onRangeLoop) return;
    if (dragLineIndexRef.current !== index || dragStartXRef.current === null) return;

    const target = e.currentTarget;
    const startX = dragStartXRef.current;
    const dx = Math.abs(e.clientX - startX);

    dragLineIndexRef.current = null;
    dragStartXRef.current = null;
    setDraftLineRegion(null);

    if (dx < LINE_DRAG_THRESHOLD_PX) {
      // Treat as tap; let the wrapping div's onClick handle single-line loop.
      dragHappenedRef.current = false;
      return;
    }

    const lineStart = lines[index].time;
    const lineEnd = getLineEnd(index);
    const startRatio = computeRatio(startX, target);
    const endRatio = computeRatio(e.clientX, target);
    const lo = Math.min(startRatio, endRatio);
    const hi = Math.max(startRatio, endRatio);
    const start = lineStart + lo * (lineEnd - lineStart);
    const end = lineStart + hi * (lineEnd - lineStart);

    if (end - start < LINE_MIN_LOOP_LENGTH_SEC) {
      // Selection too short — fall back to single-line loop.
      dragHappenedRef.current = false;
      return;
    }
    // Suppress the synthesized click that follows pointerup so the wrapping
    // div's onClick doesn't fire single-line loop after we commit a range.
    dragHappenedRef.current = true;
    onRangeLoop(index, index, start, end);
    setRangeAnchor(null);
  };

  const handleLinePointerCancel = () => {
    dragLineIndexRef.current = null;
    dragStartXRef.current = null;
    dragHappenedRef.current = false;
    setDraftLineRegion(null);
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-6 py-8 space-y-6 text-center select-none no-scrollbar"
      style={{ scrollBehavior: 'smooth' }}
    >
      {lines.map((line, index) => {
        const inLoop = isLineInLoop(index);
        const isAnchor = rangeAnchor === index;
        const showFavMarker = !!isSentenceFavorite && isSentenceFavorite(line.time);
        const dragOnThisLine = draftLineRegion && draftLineRegion.index === index;
        const enableLineDrag = intensiveMode && !!onRangeLoop;

        return (
          <div
            key={index}
            onClick={() => handleLineClick(index)}
            className={`group relative transition-all duration-300 transform ${
              intensiveMode ? 'cursor-pointer' : ''
            } ${
              index === activeIndex
                ? 'text-gray-900 dark:text-white text-xl font-bold scale-105'
                : 'text-gray-400 dark:text-gray-500 text-lg blur-[0.5px]'
            } ${inLoop ? 'bg-blue-50 dark:bg-blue-900/30 rounded-lg py-1' : ''} ${
              isAnchor ? 'ring-2 ring-amber-400 rounded-lg py-1' : ''
            }`}
          >
            <p
              className={`relative inline-block px-2 ${enableLineDrag ? 'touch-none' : ''}`}
              onPointerDown={enableLineDrag ? (e) => handleLinePointerDown(e, index) : undefined}
              onPointerMove={enableLineDrag ? (e) => handleLinePointerMove(e, index) : undefined}
              onPointerUp={enableLineDrag ? (e) => handleLinePointerUp(e, index) : undefined}
              onPointerCancel={enableLineDrag ? handleLinePointerCancel : undefined}
            >
              {/* Draft selection overlay while dragging within this line */}
              {dragOnThisLine && (
                <span
                  className="absolute top-0 bottom-0 bg-amber-300/40 rounded pointer-events-none"
                  style={{
                    left: `${draftLineRegion!.startRatio * 100}%`,
                    width: `${(draftLineRegion!.endRatio - draftLineRegion!.startRatio) * 100}%`,
                  }}
                />
              )}
              <span className="relative">{line.text}</span>
            </p>

            {intensiveMode && (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                <button
                  type="button"
                  onClick={(e) => handleRangeClick(e, index)}
                  title={rangeAnchor === null ? '设为起点 A' : '设为终点 B'}
                  className={`p-1 rounded-full text-xs ${
                    rangeAnchor === index
                      ? 'bg-amber-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-200 hover:bg-amber-200 dark:hover:bg-amber-700'
                  }`}
                >
                  {rangeAnchor === null ? 'A' : rangeAnchor === index ? 'A' : 'B'}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLineClick(index);
                  }}
                  title="单句循环"
                  className="p-1 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-200 hover:bg-blue-200 dark:hover:bg-blue-700"
                >
                  <Repeat size={12} />
                </button>
                {onToggleSentenceFavorite && (
                  <button
                    type="button"
                    onClick={(e) => handleSentenceFavoriteClick(e, index)}
                    title="收藏这句"
                    className="p-1 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-red-200 dark:hover:bg-red-700"
                  >
                    <Heart
                      size={12}
                      className={showFavMarker ? 'fill-red-500 text-red-500' : 'text-gray-500'}
                    />
                  </button>
                )}
              </div>
            )}

            {showFavMarker && !intensiveMode && (
              <Heart
                size={12}
                className="inline-block ml-2 fill-red-500 text-red-500 align-middle"
              />
            )}
          </div>
        );
      })}
      {lines.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-gray-400">
          <p>No lyrics available</p>
        </div>
      )}
    </div>
  );
};
