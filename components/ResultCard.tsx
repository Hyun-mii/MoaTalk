
import React, { useState, useEffect } from 'react';
import { type NewsSummary } from '../types';
import { PlayIcon, StopIcon, ExternalLinkIcon } from '../constants';

interface ResultCardProps {
  summary: NewsSummary;
  onTogglePlay: (summary: NewsSummary) => void;
  isPlaying: boolean;
}

const ResultCard: React.FC<ResultCardProps> = ({ summary, onTogglePlay, isPlaying }) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Reset state when summary changes
  useEffect(() => {
    setImageSrc(summary.imageUrl);
    setIsLoaded(false);
    setHasError(false);
  }, [summary.imageUrl]);

  const handleImageError = () => {
    // If the main AI image fails, try a generic but relevant "News" style image
    // Using a different random seed to avoid caching the same broken image if necessary
    if (!hasError) {
        setHasError(true);
        // Fallback to a high-quality abstract news background
        setImageSrc("https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=768&auto=format&fit=crop"); 
        // Or we could use a text placeholder:
        // setImageSrc(`https://placehold.co/768x512/EEE/31343C?text=${encodeURIComponent(summary.title.substring(0, 10))}`);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]">
      <div className="p-4 md:flex items-start">
        {/* Image Container */}
        <div className="md:flex-shrink-0 relative mt-3 md:mt-4 rounded-xl overflow-hidden w-full md:w-48 h-48 bg-gray-200 dark:bg-gray-700 border border-gray-100 dark:border-gray-600">
          
          {/* Loading Skeleton */}
          {!isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-300 dark:bg-gray-600 animate-pulse z-10">
               <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
               </svg>
            </div>
          )}

          <img 
            className={`h-full w-full object-cover transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
            src={imageSrc} 
            alt={summary.title}
            loading="lazy"
            onLoad={() => setIsLoaded(true)}
            onError={handleImageError}
          />
        </div>

        <div className="mt-4 md:mt-0 md:ml-6 flex-grow">
          <div className="flex justify-between items-start">
            <h3 className="text-xl leading-tight font-bold text-black dark:text-white mr-4 break-words">
                {summary.title}
            </h3>
            <button
              onClick={() => onTogglePlay(summary)}
              className={`flex-shrink-0 p-2 rounded-full text-white ${isPlaying ? 'bg-gray-500 hover:bg-gray-600' : 'bg-primary hover:bg-primary-dark'} transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:focus:ring-offset-gray-800 shadow-md`}
              aria-label={isPlaying ? `${summary.title} 요약 읽기 중지` : `${summary.title} 요약 읽기`}
            >
              {isPlaying ? <StopIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
            </button>
          </div>
          <p className="mt-3 text-gray-600 dark:text-gray-300 leading-relaxed text-sm md:text-base text-justify">
            {summary.summary}
          </p>
        </div>
      </div>
      
      {/* Links Section */}
      <div className="px-6 pb-5 pt-0 md:pl-[calc(12rem+2.5rem)]">
        {summary.links.length > 0 && (
            <>
                <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 mt-2">
                    관련 기사
                </h4>
                <div className="space-y-2">
                {summary.links.map((link, index) => (
                    <a
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start text-sm text-primary dark:text-primary-dark hover:underline group"
                    >
                    <ExternalLinkIcon className="w-4 h-4 mr-2 mt-1 flex-shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="break-words line-clamp-1">{link.title}</span>
                    </a>
                ))}
                </div>
            </>
        )}
      </div>
    </div>
  );
};

export default ResultCard;
