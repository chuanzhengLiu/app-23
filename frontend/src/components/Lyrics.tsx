import React, { useEffect, useRef } from 'react';
import { LrcLine } from '../utils/lrcParser';
import { Star } from 'lucide-react';

interface LyricsProps {
  lines: LrcLine[];
  currentTime: number;
  intensiveMode?: boolean;
  selectedLineIndex?: number | null;
  loopRange?: { start: number; end: number } | null;
  savedSentenceMap?: Set<string>;
  onLineClick?: (index: number) => void;
  onToggleSaveLine?: (line: LrcLine, index: number) => void;
}

const getLineEndTime = (lines: LrcLine[], index: number, duration: number): number => {
  if (index < lines.length - 1) {
    return lines[index + 1].time;
  }
  return duration;
};

export const Lyrics: React.FC<LyricsProps> = ({ 
  lines, 
  currentTime, 
  intensiveMode = false,
  selectedLineIndex = null,
  loopRange = null,
  savedSentenceMap = new Set(),
  onLineClick,
  onToggleSaveLine,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeIndex = lines.findIndex((line, index) => {
    const nextLine = lines[index + 1];
    return currentTime >= line.time && (!nextLine || currentTime < nextLine.time);
  });

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

  const getLineKey = (line: LrcLine) => `${line.time}-${line.text}`;

  const isLineInLoop = (lineIndex: number): boolean => {
    if (!loopRange) return false;
    const line = lines[lineIndex];
    if (!line) return false;
    const lineEnd = getLineEndTime(lines, lineIndex, loopRange.end + 10);
    return line.time < loopRange.end && lineEnd > loopRange.start;
  };

  return (
    <div 
      ref={containerRef} 
      className="flex-1 overflow-y-auto px-6 py-8 space-y-4 text-center select-none no-scrollbar"
      style={{ scrollBehavior: 'smooth' }}
    >
      {lines.map((line, index) => {
        const isActive = index === activeIndex;
        const isSelected = selectedLineIndex === index;
        const isInLoop = intensiveMode && isLineInLoop(index);
        const isSaved = savedSentenceMap.has(getLineKey(line));

        return (
          <div
            key={index}
            className={`group relative transition-all duration-300 transform cursor-pointer rounded-lg px-4 py-2 -mx-4 ${
              isSelected
                ? 'bg-blue-100 dark:bg-blue-900/40 ring-2 ring-blue-500'
                : isInLoop
                ? 'bg-amber-50 dark:bg-amber-900/20'
                : ''
            } ${
              isActive
                ? 'text-gray-900 dark:text-white text-xl font-bold scale-105'
                : 'text-gray-400 dark:text-gray-500 text-lg blur-[0.5px]'
            } ${intensiveMode ? 'hover:bg-gray-100 dark:hover:bg-gray-800' : ''}`}
            onClick={() => {
              if (intensiveMode && onLineClick) {
                onLineClick(index);
              }
            }}
          >
            <p className="inline-block">{line.text}</p>
            
            {intensiveMode && onToggleSaveLine && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSaveLine(line, index);
                }}
                className={`absolute right-0 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all ${
                  isSaved
                    ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/30 opacity-100'
                    : isActive
                    ? 'text-gray-400 hover:text-amber-500 bg-white dark:bg-gray-800 opacity-100'
                    : 'text-gray-400 hover:text-amber-500 bg-white/80 dark:bg-gray-800/80 opacity-60 md:opacity-0 md:group-hover:opacity-100'
                }`}
              >
                {isSaved ? <Star size={18} fill="currentColor" /> : <Star size={18} />}
              </button>
            )}

            {isSelected && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 w-1.5 h-6 bg-blue-500 rounded-full"></span>
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
