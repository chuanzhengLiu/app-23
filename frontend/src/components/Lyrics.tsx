import React, { useEffect, useRef } from 'react';
import { Star } from 'lucide-react';
import { LrcLine } from '../utils/lrcParser';

interface LyricsProps {
  lines: LrcLine[];
  currentTime: number;
  onLineClick?: (index: number) => void;
  onToggleFavorite?: (index: number) => void;
  isIntensiveMode?: boolean;
  selectedLineIndex?: number | null;
  isSentenceFavorited?: (index: number) => boolean;
}

export const Lyrics: React.FC<LyricsProps> = ({
  lines,
  currentTime,
  onLineClick,
  onToggleFavorite,
  isIntensiveMode = false,
  selectedLineIndex,
  isSentenceFavorited,
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

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-6 py-8 space-y-4 text-center select-none no-scrollbar"
      style={{ scrollBehavior: 'smooth' }}
    >
      {lines.map((line, index) => {
        const isActive = index === activeIndex;
        const isSelected = selectedLineIndex === index;
        const isFavorited = isSentenceFavorited?.(index);

        return (
          <div
            key={index}
            className={`group relative transition-all duration-300 transform cursor-pointer rounded-lg px-4 py-2 mx-auto max-w-xl
              ${isSelected
                ? 'bg-orange-100 dark:bg-orange-900/30 ring-2 ring-orange-400'
                : isActive && isIntensiveMode
                  ? 'bg-blue-50 dark:bg-blue-900/20'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }
            `}
            onClick={() => onLineClick?.(index)}
          >
            <p
              className={`transition-all duration-300 transform ${
                isActive
                  ? 'text-gray-900 dark:text-white text-xl font-bold scale-105'
                  : isSelected
                    ? 'text-orange-700 dark:text-orange-300 text-lg font-semibold'
                    : 'text-gray-400 dark:text-gray-500 text-lg blur-[0.5px]'
              }`}
            >
              {line.text}
            </p>
            {isIntensiveMode && onToggleFavorite && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(index);
                }}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-all opacity-0 group-hover:opacity-100
                  ${isFavorited
                    ? 'opacity-100 text-yellow-500 bg-yellow-50 dark:bg-yellow-900/30'
                    : 'text-gray-400 hover:text-yellow-500 bg-white/80 dark:bg-gray-700/80'
                  }
                  ${isActive || isSelected ? 'opacity-100' : ''}
                `}
              >
                <Star size={16} fill={isFavorited ? 'currentColor' : 'none'} />
              </button>
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
