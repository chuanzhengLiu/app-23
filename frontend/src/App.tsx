import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAudio } from './hooks/useAudio';
import { useSearch } from './hooks/useSearch';
import { useFavorites } from './hooks/useFavorites';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useIntensiveMode } from './hooks/useIntensiveMode';
import { useSentenceFavorites } from './hooks/useSentenceFavorites';
import { parseLRC, LrcLine } from './utils/lrcParser';
import { SavedSentence, loadLocalLessons, saveLocalLesson } from './utils/db';

import { Lyrics } from './components/Lyrics';
import { Player } from './components/Player';
import { SearchBar } from './components/SearchBar';
import { UploadZone } from './components/UploadZone';
import { CategoryTabs } from './components/CategoryTabs';
import { FavoriteButton } from './components/FavoriteButton';
import { IntensiveModeControls } from './components/IntensiveModeControls';
import { SentenceFavorites } from './components/SentenceFavorites';
import { ChevronDown, ListMusic, BookOpen } from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  category: string;
  keywords?: string[];
  audioUrl?: string;
  lrcUrl?: string;
}

function AppImproved() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentLessonId, setCurrentLessonId] = useState<string>('');
  const [lyrics, setLyrics] = useState<LrcLine[]>([]);
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');
  const [isDarkMode, setIsDarkMode] = useLocalStorage('darkMode', false);
  const [showSentenceFavorites, setShowSentenceFavorites] = useState(false);
  const [viewMode, setViewMode] = useState<'lessons' | 'sentences'>('lessons');
  const pendingSentenceRef = useRef<{ time: number; endTime?: number } | null>(null);
  const isPlayingFromFavoritesRef = useRef(false);

  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  const { setQuery, filteredItems: searchResults } = useSearch(lessons);
  const intensiveMode = useIntensiveMode();
  const {
    sentences: savedSentences,
    addSentence,
    removeSentence,
    isSentenceInList,
  } = useSentenceFavorites();

  const categories = useMemo(() => {
     const cats = new Set(lessons.map(l => l.category).filter(Boolean));
     return ['全部', '收藏', '难句', ...Array.from(cats)];
  }, [lessons]);

  const displayedLessons = useMemo(() => {
    let result = searchResults;
    
    if (selectedCategory === '收藏') {
      result = result.filter(l => favorites.includes(l.id));
    } else if (selectedCategory !== '全部' && selectedCategory !== '难句') {
      result = result.filter(l => l.category === selectedCategory);
    }
    
    return result;
  }, [searchResults, selectedCategory, favorites]);

  const currentLesson = lessons.find(l => l.id === currentLessonId);
  const audioSrc = currentLesson?.audioUrl || '';
  
  const { 
      playing, 
      currentTime, 
      duration, 
      togglePlay, 
      seek, 
      volume, 
      changeVolume, 
      error, 
      loading,
      playbackRate,
      setPlaybackRate,
      setLoop,
      clearLoop,
      isReady,
      playFrom,
  } = useAudio({
    src: audioSrc,
    id: currentLessonId
  });

  useEffect(() => {
    const loopRange = intensiveMode.getLoopRange();
    if (intensiveMode.enabled && loopRange) {
      setLoop(loopRange.start, loopRange.end);
    } else {
      clearLoop();
    }
  }, [intensiveMode.enabled, intensiveMode.pointA, intensiveMode.pointB, setLoop, clearLoop, intensiveMode]);

  useEffect(() => {
    if (!intensiveMode.enabled) {
      setPlaybackRate(1);
    }
  }, [intensiveMode.enabled, setPlaybackRate]);

  useEffect(() => {
    if (isReady && pendingSentenceRef.current) {
      const pending = pendingSentenceRef.current;
      const range = pending.endTime ? { start: pending.time, end: pending.endTime } : undefined;
      const lineIndex = lyrics.length > 0 ? intensiveMode.findLineIndexByTime(pending.time, lyrics) : undefined;
      
      intensiveMode.enableMode();
      if (range) {
        intensiveMode.setRange(range.start, range.end, lineIndex);
      }
      playFrom(pending.time, range);
      
      isPlayingFromFavoritesRef.current = false;
      pendingSentenceRef.current = null;
    }
  }, [isReady, lyrics, currentLessonId, playFrom, intensiveMode]);

  useEffect(() => {
    const loadData = async () => {
        try {
            const res = await fetch('/data.json');
            const staticData: Lesson[] = await res.json();
            
            let customData: Lesson[] = [];
            try {
                customData = await loadLocalLessons();
            } catch (e) {
                console.warn("Failed to load custom lessons:", e);
            }

            const combined = [...customData, ...staticData];
            setLessons(combined);
            
            if (combined.length > 0 && !currentLessonId) {
               setCurrentLessonId(combined[0].id);
            }
        } catch (err) {
            console.error("Data load failed", err);
        }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (!currentLesson?.lrcUrl) {
        setLyrics([]);
        return;
    }

    const loadLrc = async () => {
        try {
            const res = await fetch(currentLesson.lrcUrl as string);
            if (!res.ok) throw new Error("Failed to fetch LRC");
            const text = await res.text();
            setLyrics(parseLRC(text));
        } catch (err) {
            console.error("Failed to load LRC", err);
            setLyrics([]);
        }
    };

    loadLrc();
  }, [currentLesson?.lrcUrl]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    if (selectedCategory === '难句') {
      setViewMode('sentences');
    } else {
      setViewMode('lessons');
    }
  }, [selectedCategory]);

  const handleUpload = async ({ audio, lrc, metadata }: { audio: File; lrc?: File; metadata: any }) => {
     const newId = `local-${Date.now()}`;
     const category = metadata.category || '本地上传';
     
     const newLesson: Lesson = {
       id: newId,
       title: metadata.title || audio.name.replace(/\.[^/.]+$/, ""),
       category: category,
       audioUrl: URL.createObjectURL(audio),
       lrcUrl: lrc ? URL.createObjectURL(lrc) : undefined,
       keywords: ['local']
     };
     
     setLessons(prev => [newLesson, ...prev]);
     setCurrentLessonId(newId);
     setIsPlayerExpanded(true);

     try {
         await saveLocalLesson(
             { id: newId, title: newLesson.title, category: newLesson.category }, 
             audio, 
             lrc
         );
     } catch (e) {
         console.warn("Failed to save custom lesson to DB", e);
     }
  };

  const handleLessonSelect = (id: string) => {
      setCurrentLessonId(id);
      setIsPlayerExpanded(true);
      if (!isPlayingFromFavoritesRef.current) {
        intensiveMode.clearSelection();
      }
  };

  const handleLineClick = useCallback((index: number) => {
    if (!intensiveMode.enabled) return;
    intensiveMode.selectLine(index, lyrics);
  }, [intensiveMode, lyrics]);

  const handleToggleSaveLine = useCallback((line: LrcLine, index: number) => {
    if (!currentLesson) return;
    
    const nextLine = lyrics[index + 1];
    const endTime = nextLine ? nextLine.time : undefined;
    
    if (isSentenceInList(currentLesson.id, line.time, line.text)) {
      const saved = savedSentences.find(
        s => s.lessonId === currentLesson.id && Math.abs(s.time - line.time) < 0.5 && s.text === line.text
      );
      if (saved) {
        removeSentence(saved.id);
      }
    } else {
      addSentence({
        lessonId: currentLesson.id,
        lessonTitle: currentLesson.title,
        text: line.text,
        time: line.time,
        endTime,
      });
    }
  }, [currentLesson, lyrics, isSentenceInList, savedSentences, addSentence, removeSentence]);

  const savedSentenceMap = useMemo(() => {
    const map = new Set<string>();
    if (currentLesson) {
      savedSentences
        .filter(s => s.lessonId === currentLesson.id)
        .forEach(s => map.add(`${s.time}-${s.text}`));
    }
    return map;
  }, [savedSentences, currentLesson]);

  const handlePlaySentence = useCallback((sentence: SavedSentence) => {
    setShowSentenceFavorites(false);
    isPlayingFromFavoritesRef.current = true;
    intensiveMode.enableMode();
    
    if (currentLessonId !== sentence.lessonId) {
      pendingSentenceRef.current = { time: sentence.time, endTime: sentence.endTime };
      setCurrentLessonId(sentence.lessonId);
      setIsPlayerExpanded(true);
    } else {
      const range = sentence.endTime ? { start: sentence.time, end: sentence.endTime } : undefined;
      const lineIndex = lyrics.length > 0 ? intensiveMode.findLineIndexByTime(sentence.time, lyrics) : undefined;
      if (range) {
        intensiveMode.setRange(range.start, range.end, lineIndex);
      }
      playFrom(sentence.time, range);
    }
  }, [currentLessonId, lyrics, playFrom, intensiveMode]);

  const sentenceCountsByLesson = useMemo(() => {
    const counts: Record<string, number> = {};
    savedSentences.forEach(s => {
      counts[s.lessonId] = (counts[s.lessonId] || 0) + 1;
    });
    return counts;
  }, [savedSentences]);

  const lessonsWithSavedSentences = useMemo(() => {
    return lessons.filter(l => sentenceCountsByLesson[l.id] > 0);
  }, [lessons, sentenceCountsByLesson]);

  const renderSentenceView = () => {
    if (savedSentences.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <BookOpen size={48} className="mb-4 opacity-50" />
          <p className="text-center">还没有收藏的难句</p>
          <p className="text-sm text-center mt-1">开启精听模式后点击句子旁的星标收藏</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <button
          onClick={() => setShowSentenceFavorites(true)}
          className="w-full p-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium shadow-lg shadow-amber-500/30 hover:shadow-xl transition-all active:scale-[0.98]"
        >
          📖 查看全部难句收藏 ({savedSentences.length})
        </button>
        <div className="space-y-2">
          {lessonsWithSavedSentences.map(lesson => (
            <div
              key={lesson.id}
              onClick={() => {
                handleLessonSelect(lesson.id);
                setSelectedCategory('全部');
              }}
              className={`p-3 rounded-xl shadow-sm border flex items-center space-x-4 active:scale-[0.98] transition-all cursor-pointer
                ${currentLessonId === lesson.id ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750'}
              `}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shadow-sm transition-colors
                ${currentLessonId === lesson.id ? 'bg-amber-500 text-white' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'}
              `}>
                <BookOpen size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`font-bold text-sm truncate ${currentLessonId === lesson.id ? 'text-blue-700 dark:text-blue-400' : 'text-gray-800 dark:text-gray-100'}`}>
                  {lesson.title}
                </h3>
                <p className="text-xs text-amber-500 dark:text-amber-400">
                  {sentenceCountsByLesson[lesson.id]} 个难句
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`h-full min-h-screen transition-colors duration-300 ${isDarkMode ? 'dark bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} font-sans`}>
      
      <div className="max-w-[1200px] mx-auto h-full flex flex-col md:flex-row overflow-hidden shadow-2xl bg-white dark:bg-gray-900 md:border-x md:border-gray-200 dark:md:border-gray-800">

          <div className="flex-1 flex flex-col h-full md:w-5/12 lg:w-4/12 md:border-r border-gray-100 dark:border-gray-800 z-10 relative">
              <div className="flex-none bg-white/90 dark:bg-gray-800/90 backdrop-blur-md z-10 px-4 py-3 shadow-sm border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center space-x-3 mb-2">
                    <h1 className="text-lg font-bold flex items-center">
                        <span className="bg-blue-600 text-white p-1 rounded mr-2"><ListMusic size={18} /></span>
                        听力练习
                    </h1>
                    <div className="flex-1"></div>
                    <button
                      onClick={() => setShowSentenceFavorites(true)}
                      className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full transition active:scale-95 relative"
                      title="难句收藏"
                    >
                      <BookOpen size={18} />
                      {savedSentences.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                          {savedSentences.length > 99 ? '99+' : savedSentences.length}
                        </span>
                      )}
                    </button>
                    <button 
                      onClick={() => setIsDarkMode(!isDarkMode)}
                      className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-lg transition active:scale-95"
                    >
                      {isDarkMode ? '🌙' : '☀️'}
                    </button>
                </div>
                <SearchBar onSearch={setQuery} />
              </div>

              <div className="flex-none bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                 <CategoryTabs 
                    categories={categories} 
                    selectedCategory={selectedCategory} 
                    onSelect={setSelectedCategory} 
                 />
              </div>

              <div className="flex-1 overflow-y-auto p-4 pb-32 md:pb-4 space-y-3 scroll-smooth scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
                 {viewMode === 'lessons' ? (
                   <>
                     {selectedCategory === '全部' && <UploadZone onUpload={handleUpload} />}

                     {displayedLessons.length === 0 ? (
                         <div className="text-center py-10 text-gray-400">没有找到相关课程</div>
                     ) : (
                         displayedLessons.map(l => (
                            <div key={l.id} 
                              onClick={() => handleLessonSelect(l.id)}
                              className={`group relative p-3 rounded-xl shadow-sm border flex items-center space-x-4 active:scale-[0.98] transition-all cursor-pointer
                                  ${currentLessonId === l.id ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750'}
                              `}
                            >
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shadow-sm transition-colors
                                  ${currentLessonId === l.id ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300'}
                              `}>
                                {l.title.substring(0,1).toUpperCase()}
                              </div>

                              <div className="flex-1 min-w-0">
                                 <h3 className={`font-bold text-sm truncate ${currentLessonId === l.id ? 'text-blue-700 dark:text-blue-400' : 'text-gray-800 dark:text-gray-100'}`}>
                                    {l.title}
                                 </h3>
                                 <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center">
                                   {l.category}
                                   {sentenceCountsByLesson[l.id] > 0 && (
                                     <span className="ml-2 text-amber-500 flex items-center">
                                       <BookOpen size={10} className="mr-0.5" />
                                       {sentenceCountsByLesson[l.id]}
                                     </span>
                                   )}
                                 </p>
                              </div>

                              <div onClick={(e) => e.stopPropagation()}>
                                  <FavoriteButton 
                                    isFavorite={isFavorite(l.id)} 
                                    onToggle={() => toggleFavorite(l.id)} 
                                  />
                              </div>
                              
                              {currentLessonId === l.id && playing && (
                                  <div className="absolute top-1 right-1">
                                      <span className="flex h-3 w-3 relative">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                                      </span>
                                  </div>
                              )}
                            </div>
                         ))
                     )}
                   </>
                 ) : (
                   renderSentenceView()
                 )}
              </div>
          </div>

          <div className="hidden md:flex md:w-7/12 lg:w-8/12 flex-col bg-gray-50 dark:bg-gray-900 relative user-select-none">
             <div className="flex-none p-8 flex justify-center items-center bg-gray-100 dark:bg-gray-800/50">
                 <div className={`w-32 h-32 lg:w-40 lg:h-40 rounded-full shadow-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white transition-all duration-700 ${playing ? 'animate-spin-slow' : ''} ${intensiveMode.enabled ? 'from-amber-500 to-orange-600' : ''}`}>
                    <ListMusic size={40} className="opacity-80" />
                 </div>
                 <div className="ml-6">
                    <h2 className="text-2xl font-bold dark:text-white line-clamp-2 max-w-sm">{currentLesson?.title || '请选择课程'}</h2>
                    <p className="text-md text-gray-500 dark:text-gray-400 mt-1">{currentLesson?.category}</p>
                 </div>
                 <div className="flex-1"></div>
                 <FavoriteButton className="transform scale-125" isFavorite={isFavorite(currentLessonId)} onToggle={() => toggleFavorite(currentLessonId)} />
             </div>

             <div className="flex-none px-6 pt-4 pb-2">
                <IntensiveModeControls
                  enabled={intensiveMode.enabled}
                  isWaitingForB={intensiveMode.isWaitingForB}
                  isABSet={intensiveMode.isABSet}
                  playbackRate={playbackRate}
                  currentTime={currentTime}
                  onToggleMode={intensiveMode.toggleMode}
                  onSetPointA={() => intensiveMode.setCurrentAsPointA(currentTime)}
                  onSetPointB={() => intensiveMode.setCurrentAsPointB(currentTime)}
                  onClearSelection={intensiveMode.clearSelection}
                  onSetPlaybackRate={setPlaybackRate}
                  onViewFavorites={() => setShowSentenceFavorites(true)}
                />
             </div>

             <div className="flex-1 overflow-hidden relative w-full">
                 <div className="absolute inset-0 bg-gradient-to-b from-gray-50 via-transparent to-gray-50 dark:from-gray-900 dark:to-gray-900 opacity-10 pointer-events-none z-10"></div>
                 <Lyrics
                   lines={lyrics}
                   currentTime={currentTime}
                   intensiveMode={intensiveMode.enabled}
                   selectedLineIndex={intensiveMode.selectedLineIndex}
                   loopRange={intensiveMode.getLoopRange()}
                   savedSentenceMap={savedSentenceMap}
                   onLineClick={handleLineClick}
                   onToggleSaveLine={handleToggleSaveLine}
                 />
             </div>

             <div className="flex-none p-6 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
                 <Player 
                     playing={playing} 
                     currentTime={currentTime} 
                     duration={duration} 
                     onTogglePlay={togglePlay} 
                     onSeek={seek}
                     title={currentLesson?.title || ''}
                     volume={volume}
                     onVolumeChange={changeVolume}
                 />
             </div>
          </div>

          <div className="md:hidden block">
              {currentLesson && !isPlayerExpanded && (
                <div 
                  onClick={() => setIsPlayerExpanded(true)}
                  className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800 p-2 pb-safe shadow-2xl cursor-pointer transition-transform duration-300"
                >
                  <div className="flex items-center space-x-3 max-w-lg mx-auto">
                     <div className="relative w-12 h-12 flex-none">
                         <div className={`w-full h-full rounded-full bg-gradient-to-tr ${intensiveMode.enabled ? 'from-amber-500 to-orange-600' : 'from-gray-700 to-black'} flex items-center justify-center text-white text-xs shadow-md ${playing ? 'animate-spin-slow' : ''}`}>
                            <span className="text-[8px]">VINYL</span>
                         </div>
                         <div className="absolute inset-0 m-auto w-3 h-3 bg-white dark:bg-gray-900 rounded-full border border-gray-300"></div>
                     </div>

                     <div className="flex-1 min-w-0">
                       <h4 className="font-bold text-sm truncate dark:text-white">{currentLesson.title}</h4>
                       <p className="text-xs text-blue-500 truncate">
                         {error ? <span className="text-red-500">{error}</span> : (loading ? '加载中...' : (playing ? (intensiveMode.enabled ? '精听中' : '播放中') : '已暂停'))}
                       </p>
                     </div>

                     <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); intensiveMode.toggleMode(); }}
                          className={`p-2 rounded-full transition ${intensiveMode.enabled ? 'bg-amber-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}
                        >
                          <BookOpen size={18} />
                        </button>
                        <FavoriteButton isFavorite={isFavorite(currentLesson.id)} onToggle={(e) => { e.stopPropagation(); toggleFavorite(currentLesson.id); }} />
                        <button 
                            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                            className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                        >
                            {playing ? <div className="w-3 h-3 bg-current rounded-sm" /> : <div className="w-0 h-0 border-l-[12px] border-l-current border-y-[6px] border-y-transparent ml-1" />}
                        </button>
                     </div>
                  </div>
                  <div className="absolute top-0 left-0 h-0.5 bg-blue-600 transition-all duration-500 ease-linear" style={{ width: `${(currentTime / (duration||1))*100}%` }}></div>
                </div>
              )}

              <div 
                className={`fixed inset-0 z-40 bg-white dark:bg-gray-900 flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${isPlayerExpanded ? 'translate-y-0' : 'translate-y-full'}`}
              >
                 <div className="flex-none flex justify-between items-center p-4 pt-8 md:pt-4 bg-gradient-to-b from-white to-transparent dark:from-gray-900 z-10">
                    <button onClick={() => setIsPlayerExpanded(false)} className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition">
                      <ChevronDown size={28} />
                    </button>
                    <span className="text-xs font-bold tracking-[0.2em] text-gray-400">正在播放</span>
                    <button
                      onClick={() => setShowSentenceFavorites(true)}
                      className="p-2 text-amber-500 hover:text-amber-600 transition relative"
                    >
                      <BookOpen size={20} />
                      {savedSentences.length > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center">
                          {savedSentences.length > 9 ? '9+' : savedSentences.length}
                        </span>
                      )}
                    </button>
                 </div>

                 <div className="flex-none flex justify-center py-4">
                     <div className={`w-64 h-64 rounded-3xl shadow-2xl bg-gradient-to-br ${intensiveMode.enabled ? 'from-amber-500 to-orange-600' : 'from-blue-500 to-purple-600'} flex items-center justify-center text-white transform transition-transform duration-700 ease-out ${playing ? 'scale-100 shadow-blue-500/50' : 'scale-95 shadow-lg'}`}>
                        <ListMusic size={64} className="opacity-80" />
                     </div>
                 </div>

                 <div className="flex-none px-8 py-2 flex justify-between items-start">
                     <div>
                        <h2 className="text-xl font-bold dark:text-white line-clamp-2">{currentLesson?.title || '请选择课程'}</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{currentLesson?.category}</p>
                     </div>
                     <FavoriteButton className="mt-1 transform scale-125" isFavorite={isFavorite(currentLessonId)} onToggle={() => toggleFavorite(currentLessonId)} />
                 </div>

                 <div className="flex-none px-4 py-2">
                    <IntensiveModeControls
                      enabled={intensiveMode.enabled}
                      isWaitingForB={intensiveMode.isWaitingForB}
                      isABSet={intensiveMode.isABSet}
                      playbackRate={playbackRate}
                      currentTime={currentTime}
                      onToggleMode={intensiveMode.toggleMode}
                      onSetPointA={() => intensiveMode.setCurrentAsPointA(currentTime)}
                      onSetPointB={() => intensiveMode.setCurrentAsPointB(currentTime)}
                      onClearSelection={intensiveMode.clearSelection}
                      onSetPlaybackRate={setPlaybackRate}
                      onViewFavorites={() => setShowSentenceFavorites(true)}
                    />
                 </div>

                 <div className="flex-1 overflow-hidden relative my-2 mask-image-gradient">
                     <div className="absolute inset-0 bg-gradient-to-b from-white via-transparent to-white dark:from-gray-900 dark:to-gray-900 opacity-20 pointer-events-none z-10"></div>
                     <Lyrics
                       lines={lyrics}
                       currentTime={currentTime}
                       intensiveMode={intensiveMode.enabled}
                       selectedLineIndex={intensiveMode.selectedLineIndex}
                       loopRange={intensiveMode.getLoopRange()}
                       savedSentenceMap={savedSentenceMap}
                       onLineClick={handleLineClick}
                       onToggleSaveLine={handleToggleSaveLine}
                     />
                 </div>

                 <div className="flex-none pb-8 bg-white dark:bg-gray-900 px-2">
                     <Player 
                         playing={playing} 
                         currentTime={currentTime} 
                         duration={duration} 
                         onTogglePlay={togglePlay} 
                         onSeek={seek}
                         title={currentLesson?.title || ''}
                         volume={volume}
                         onVolumeChange={changeVolume}
                     />
                 </div>
              </div>
          </div>
      </div>

      <SentenceFavorites
        isOpen={showSentenceFavorites}
        sentences={savedSentences}
        onClose={() => setShowSentenceFavorites(false)}
        onPlaySentence={handlePlaySentence}
        onDeleteSentence={removeSentence}
        currentLessonId={currentLessonId}
      />
    </div>
  );
}

export default AppImproved;
