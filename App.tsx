
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import SearchBar from './components/SearchBar';
import ResultsDisplay from './components/ResultsDisplay';
import LoadingSpinner from './components/LoadingSpinner';
import Recommendations from './components/Recommendations';
import HistoryDrawer from './components/HistoryDrawer';
import { fetchNewsSummary } from './services/geminiService';
import { type NewsSummary, type AppData, type HistoryItem } from './types';
import useSpeechSynthesis from './hooks/useSpeechSynthesis';

const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  
  const [isSoundOn, setIsSoundOn] = useState<boolean>(true); 
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [appData, setAppData] = useState<AppData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentlyPlayingTitle, setCurrentlyPlayingTitle] = useState<string | null>(null);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);

  // History State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const { speak, cancel, isSpeaking } = useSpeechSynthesis();
  const resultsRef = useRef<HTMLDivElement>(null);
  const autoPlayQueue = useRef<NewsSummary[]>([]);
  const isAutoPlayingRef = useRef(false);

  // Load history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('moatalk_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('moatalk_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (!isSoundOn && isSpeaking) {
        cancel();
        setCurrentlyPlayingTitle(null);
        isAutoPlayingRef.current = false;
        setIsAutoPlaying(false);
        autoPlayQueue.current = [];
    }
  }, [isSoundOn, isSpeaking, cancel]);

  const togglePlaybackSpeed = () => {
    setPlaybackSpeed(prev => {
        if (prev === 1.0) return 1.2;
        if (prev === 1.2) return 1.5;
        return 1.0;
    });
  };

  const playNextInQueue = useCallback(() => {
    if (!isSoundOn) {
        isAutoPlayingRef.current = false;
        setIsAutoPlaying(false);
        setCurrentlyPlayingTitle(null);
        return;
    }

    if (autoPlayQueue.current.length > 0 && isAutoPlayingRef.current) {
        const summaryToPlay = autoPlayQueue.current.shift();
        if (summaryToPlay) {
            const index = (appData?.summaries.indexOf(summaryToPlay) ?? -1) + 1;
            const numberWords = ["첫 번째", "두 번째", "세 번째", "네 번째", "다섯 번째"];
            const numberText = index > 0 && index <= numberWords.length ? `${numberWords[index-1]} 소식입니다.` : '';
            
            setCurrentlyPlayingTitle(summaryToPlay.title);
            speak(`${numberText} ${summaryToPlay.title}. ${summaryToPlay.summary}`, playbackSpeed, playNextInQueue, !isSoundOn);
        }
    } else {
        setCurrentlyPlayingTitle(null);
        isAutoPlayingRef.current = false;
        setIsAutoPlaying(false);
    }
  }, [speak, appData?.summaries, isSoundOn, playbackSpeed]);

  const startAutoPlay = useCallback(() => {
    if (!appData || !appData.summaries?.length || !isSoundOn) return;
    if (isSpeaking) cancel();

    autoPlayQueue.current = [...appData.summaries];
    isAutoPlayingRef.current = true;
    setIsAutoPlaying(true);
    playNextInQueue();
  }, [appData, isSoundOn, isSpeaking, cancel, playNextInQueue]);

  const stopAutoPlay = useCallback(() => {
    cancel();
    autoPlayQueue.current = [];
    isAutoPlayingRef.current = false;
    setIsAutoPlaying(false);
    setCurrentlyPlayingTitle(null);
  }, [cancel]);

  const handleToggleAutoPlay = () => {
      if (isAutoPlaying) {
          stopAutoPlay();
      } else {
          startAutoPlay();
      }
  };

  // Autoplay effect when data loads
  useEffect(() => {
    if (appData && appData.summaries?.length > 0 && isSoundOn) {
        // Short delay to ensure UI renders before speaking
        const timer = setTimeout(() => {
            startAutoPlay();
        }, 500);
        return () => clearTimeout(timer);
    }
  }, [appData]); 

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;

    stopAutoPlay();
    setIsLoading(true);
    setError(null);
    setAppData(null);

    try {
      const data = await fetchNewsSummary(query);
      setAppData(data);

      // Save to History
      const newHistoryItem: HistoryItem = {
        id: Date.now().toString(),
        query: query,
        date: new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }),
        timestamp: Date.now(),
        data: data
      };

      setHistory(prev => [newHistoryItem, ...prev].slice(0, 50)); // Keep last 50 items

    } catch (err: any) {
      setError(err.message || '뉴스 정보를 가져오는 데 실패했습니다.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [stopAutoPlay]);

  const handleHistorySelect = (item: HistoryItem) => {
    stopAutoPlay();
    setSearchQuery(item.query);
    setAppData(item.data);
    setError(null);
    // Scroll to results
    setTimeout(() => {
        if(resultsRef.current) {
            resultsRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, 100);
  };

  const handleClearHistory = () => {
    if(window.confirm('모든 검색 기록을 삭제하시겠습니까?')) {
        setHistory([]);
    }
  };

  const handleTogglePlay = (summary: NewsSummary) => {
    if (!isSoundOn) return;

    const isCurrentlyPlayingThis = currentlyPlayingTitle === summary.title;
    if (isCurrentlyPlayingThis) {
        cancel();
        setCurrentlyPlayingTitle(null);
        if (isAutoPlayingRef.current) {
            isAutoPlayingRef.current = false;
            autoPlayQueue.current = [];
            setIsAutoPlaying(false);
        }
        return;
    }

    cancel();
    if (isAutoPlayingRef.current) {
        isAutoPlayingRef.current = false;
        autoPlayQueue.current = [];
        setIsAutoPlaying(false);
    }

    setCurrentlyPlayingTitle(summary.title);
    speak(`${summary.title}. ${summary.summary}`, playbackSpeed, () => {
        setCurrentlyPlayingTitle(prev => prev === summary.title ? null : prev);
    }, !isSoundOn);
  };
  
  const handleRecommendationClick = (topic: string) => {
    setSearchQuery(topic);
    handleSearch(topic);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-sans transition-colors duration-300">
      <Header
        isDarkMode={isDarkMode}
        toggleDarkMode={() => setIsDarkMode(prev => !prev)}
        isSoundOn={isSoundOn}
        toggleSound={() => setIsSoundOn(prev => !prev)}
        playbackSpeed={playbackSpeed}
        togglePlaybackSpeed={togglePlaybackSpeed}
        onHistoryClick={() => setIsHistoryOpen(true)}
      />
      
      <HistoryDrawer 
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onSelectHistory={handleHistorySelect}
        onClearHistory={handleClearHistory}
      />

      <main className="container mx-auto p-4 md:p-6 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-primary dark:text-primary-dark">AI News Brief</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">오늘의 주요 이슈를 빠르고 정확하게.</p>
        </div>

        <SearchBar
          onSearch={handleSearch}
          isLoading={isLoading}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        {appData && appData.recommendations?.length > 0 && !isLoading && (
            <div className="mt-6 max-w-2xl mx-auto opacity-0 animate-fadeIn" style={{ animationDelay: `150ms` }}>
                <Recommendations
                    topics={appData.recommendations}
                    onTopicClick={handleRecommendationClick}
                />
            </div>
        )}

        <div ref={resultsRef} className="mt-8">
          {isLoading && <LoadingSpinner />}
          {error && <p className="text-center text-red-500 bg-red-100 dark:bg-red-900/50 p-4 rounded-lg animate-pulse">{error}</p>}
          {appData && appData.summaries?.length > 0 && (
            <ResultsDisplay
              summaries={appData.summaries}
              onTogglePlay={handleTogglePlay}
              currentlyPlayingTitle={currentlyPlayingTitle}
              isAutoPlaying={isAutoPlaying}
              onToggleAutoPlay={handleToggleAutoPlay}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
