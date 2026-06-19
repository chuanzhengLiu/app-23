import React, { useEffect, useRef } from 'react';
import { LrcLine } from '../utils/lrcParser';
import { BookmarkPlus, BookmarkCheck, Repeat1 } from 'lucide-react';

interface LyricsProps {
  lines: LrcLine[];
  currentTime: number;
  isIntensiveMode?: boolean;
  selectedLineIndex?: number | null;
  savedLineIndices?: Set<number>;
  onLineClick?: (index: number, line: LrcLine, nextLine?: LrcLine) => void;
  onSaveLine?: (index: number, line: LrcLine, nextLine?: LrcLine) => void;
}

export const Lyrics: React.FC<LyricsProps> = ({ 
  lines, 
  currentTime,
  isIntensiveMode = false,
  selectedLineIndex = null,
  savedLineIndices = new Set(),
  onLineClick,
  onSaveLine,
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

  const handleLineClick = (index: number) => {
    if (!isIntensiveMode || !onLineClick) return;
    const line = lines[index];
    const nextLine = lines[index + 1];
    onLineClick(index, line, nextLine);
  };

  const handleSaveClick = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (!onSaveLine) return;
    const line = lines[index];
    const nextLine = lines[index + 1];
    onSaveLine(index, line, nextLine);
  };

  return (
    <div 
      ref={containerRef} 
      className="flex-1 overflow-y-auto px-6 py-8 space-y-6 text-center select-none no-scrollbar"
      style={{ scrollBehavior: 'smooth' }}
    >
      {lines.map((line, index) => {
        const isActive = index === activeIndex;
        const isSelected = selectedLineIndex === index;
        const isSaved = savedLineIndices.has(index);
        
        return (
          <div
            key={index}
            className={`transition-all duration-300 transform relative group
              ${isSelected ? 'scale-105' : ''}
              ${isIntensiveMode ? 'cursor-pointer rounded-xl py-2 px-3 -mx-3' : ''}
              ${isSelected ? 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-500' : ''}
              ${isIntensiveMode && !isSelected ? 'hover:bg-gray-100 dark:hover:bg-gray-800/50' : ''}
            `}
            onClick={() => handleLineClick(index)}
          >
            <p
              className={`transition-all duration-300 transform ${
                isActive
                  ? 'text-gray-900 dark:text-white text-xl font-bold scale-105'
                  : 'text-gray-400 dark:text-gray-500 text-lg blur-[0.5px]'
              } ${isSelected ? 'text-blue-700 dark:text-blue-300' : ''}`}
            >
              {line.text}
            </p>
            
            {isIntensiveMode && (
              <div className={`absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1 transition-opacity
                ${isSelected || isSaved ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
              `}>
                {isSelected && (
                  <Repeat1 size={18} className="text-blue-500 animate-pulse" />
                )}
                <button
                  onClick={(e) => handleSaveClick(e, index)}
                  className="p-1.5 rounded-full hover:bg-white dark:hover:bg-gray-700 transition"
                >
                  {isSaved ? (
                    <BookmarkCheck size={18} className="text-yellow-500 fill-yellow-500" />
                  ) : (
                    <BookmarkPlus size={18} className="text-gray-400 hover:text-yellow-500" />
                  )}
                </button>
              </div>
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
