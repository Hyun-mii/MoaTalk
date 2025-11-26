
import React, { useState } from 'react';
import { type HistoryItem } from '../types';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onSelectHistory: (item: HistoryItem) => void;
  onClearHistory: () => void;
}

const HistoryDrawer: React.FC<HistoryDrawerProps> = ({ 
  isOpen, 
  onClose, 
  history, 
  onSelectHistory, 
  onClearHistory 
}) => {
  // Group history by date
  const groupedHistory = history.reduce((acc, item) => {
    if (!acc[item.date]) {
      acc[item.date] = [];
    }
    acc[item.date].push(item);
    return acc;
  }, {} as Record<string, HistoryItem[]>);

  // Get sorted dates (newest first)
  const sortedDates = Object.keys(groupedHistory).sort((a, b) => {
    return new Date(b).getTime() - new Date(a).getTime(); // Rough sorting by date string
  });

  // State to track which date section is expanded. Default to the most recent date.
  const [expandedDate, setExpandedDate] = useState<string | null>(sortedDates[0] || null);

  const toggleDate = (date: string) => {
    setExpandedDate(prev => (prev === date ? null : date));
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity" 
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div className={`fixed top-0 right-0 h-full w-80 bg-white dark:bg-gray-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-primary dark:bg-gray-900">
            <h2 className="text-white font-bold text-lg">검색 기록</h2>
            <button onClick={onClose} className="text-white hover:text-gray-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {history.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 mt-10">저장된 기록이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {sortedDates.map(date => (
                  <div key={date} className="border rounded-lg dark:border-gray-700 overflow-hidden">
                    <button 
                      onClick={() => toggleDate(date)}
                      className="w-full flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <span className="font-medium text-gray-700 dark:text-gray-200">{date}</span>
                      <svg 
                        className={`w-4 h-4 text-gray-500 transform transition-transform ${expandedDate === date ? 'rotate-180' : ''}`} 
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {expandedDate === date && (
                      <div className="bg-white dark:bg-gray-800 animate-fadeIn">
                        {groupedHistory[date].map(item => (
                          <button
                            key={item.id}
                            onClick={() => {
                              onSelectHistory(item);
                              onClose();
                            }}
                            className="w-full text-left px-4 py-3 border-b last:border-0 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <p className="font-semibold text-primary dark:text-primary-dark truncate">{item.query}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {new Date(item.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {history.length > 0 && (
            <div className="p-4 border-t dark:border-gray-700">
              <button 
                onClick={onClearHistory}
                className="w-full py-2 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors text-sm font-medium"
              >
                기록 전체 삭제
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default HistoryDrawer;
