import React, { useState, useEffect } from 'react';
import { Flashcard, StudySet } from '../types';
import { ChevronLeft, ChevronRight, RotateCcw, Check, X, Shuffle, Trophy, Brain, AlertTriangle } from 'lucide-react';
import { updateFlashcardSRS } from '../services/storageService';

interface FlashcardViewProps {
  set: StudySet;
  onExit: () => void;
}

type Mode = 'Standard' | 'Learn' | 'Review';

const FlashcardView: React.FC<FlashcardViewProps> = ({ set, onExit }) => {
  const [mode, setMode] = useState<Mode>('Standard');
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  // Initialize cards based on mode
  useEffect(() => {
    initCards(mode);
  }, [mode, set]);

  const initCards = (selectedMode: Mode) => {
    let filtered: Flashcard[] = [];
    const now = Date.now();

    if (selectedMode === 'Standard') {
      filtered = [...set.flashcards];
    } else if (selectedMode === 'Learn') {
      // Show cards due for review (nextReview <= now) OR new cards (box === 0)
      filtered = set.flashcards.filter(c => (c.nextReview || 0) <= now || c.box === 0);
    } else if (selectedMode === 'Review') {
      // Show cards that are in box 0 (struggling)
      filtered = set.flashcards.filter(c => c.box === 0);
    }

    setCards(filtered);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsFinished(false);
  };

  const handleShuffle = () => {
    setCards([...cards].sort(() => Math.random() - 0.5));
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsFinished(false);
  };

  const handleNext = () => {
    setIsFlipped(false);
    if (currentIndex < cards.length - 1) {
      setTimeout(() => setCurrentIndex(prev => prev + 1), 150);
    } else {
      setIsFinished(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(prev => prev - 1), 150);
    }
  };

  const handleSRS = (e: React.MouseEvent, isCorrect: boolean) => {
    e.stopPropagation();
    const currentCard = cards[currentIndex];
    
    // Update Persistence
    updateFlashcardSRS(set.id, currentCard.id, isCorrect);
    
    // Move to next card
    handleNext();
  };

  if (cards.length === 0) {
    return (
      <div className="text-center py-20 bg-gray-900 rounded-xl shadow border border-gray-800 transition-colors">
        <div className="w-16 h-16 bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-400" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">All Caught Up!</h3>
        <p className="text-gray-400 mb-6">
          {mode === 'Learn' ? "No cards due for review right now." : "No difficult cards found for review."}
        </p>
        <button onClick={() => setMode('Standard')} className="text-indigo-400 hover:underline">
          Switch to Standard Mode
        </button>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="flex flex-col items-center justify-center h-96 p-8 text-center bg-gray-900 rounded-xl shadow-lg animate-in fade-in zoom-in duration-300 border border-gray-800 transition-colors">
        <Trophy className="w-16 h-16 text-yellow-500 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Session Complete!</h2>
        <p className="text-gray-300 mb-6">You've reviewed {cards.length} cards in {mode} Mode.</p>
        <div className="flex space-x-4">
          <button onClick={() => initCards(mode)} className="px-6 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition shadow-md">
            Restart Session
          </button>
          <button onClick={onExit} className="px-6 py-2 border border-gray-700 rounded-full hover:bg-gray-800 text-white transition">
            Back to Set
          </button>
        </div>
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  return (
    <div className="flex flex-col items-center w-full max-w-3xl mx-auto">
      {/* Mode Selector */}
      <div className="flex flex-wrap justify-center gap-2 mb-6">
        <button 
          onClick={() => setMode('Standard')} 
          className={`flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition ${mode === 'Standard' ? 'bg-indigo-900 text-indigo-300 ring-1 ring-indigo-700' : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'}`}
        >
          <RotateCcw className="w-3 h-3 mr-1" /> Standard
        </button>
        <button 
          onClick={() => setMode('Learn')} 
          className={`flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition ${mode === 'Learn' ? 'bg-blue-900 text-blue-300 ring-1 ring-blue-700' : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'}`}
        >
          <Brain className="w-3 h-3 mr-1" /> Learn (SRS)
        </button>
        <button 
          onClick={() => setMode('Review')} 
          className={`flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition ${mode === 'Review' ? 'bg-orange-900 text-orange-300 ring-1 ring-orange-700' : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'}`}
        >
          <AlertTriangle className="w-3 h-3 mr-1" /> Weakness Review
        </button>
      </div>

      {/* Progress & Controls */}
      <div className="flex justify-between items-center w-full mb-4 px-2">
        <span className="text-gray-400 font-medium">
          Card {currentIndex + 1} / {cards.length}
        </span>
        <button 
          onClick={handleShuffle}
          title="Shuffle"
          className="p-2 text-gray-400 hover:text-indigo-400 transition"
        >
          <Shuffle className="w-5 h-5" />
        </button>
      </div>

      {/* 3D Flip Card Container */}
      <div 
        className="group perspective-1000 w-full h-80 sm:h-96 cursor-pointer mb-8"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div className={`relative w-full h-full duration-500 transform-style-3d transition-transform ${isFlipped ? 'rotate-y-180' : ''}`}>
          
          {/* Front */}
          <div className="absolute w-full h-full bg-gray-900 rounded-2xl shadow-xl border border-gray-700 p-8 flex flex-col justify-center items-center text-center backface-hidden transition-colors">
             <div className="absolute top-4 left-4 text-xs font-semibold text-gray-500">FRONT</div>
             <h3 className="text-2xl sm:text-3xl font-semibold text-white overflow-y-auto max-h-full no-scrollbar">
               {currentCard.front}
             </h3>
             <p className="absolute bottom-4 text-xs text-gray-500 uppercase tracking-widest font-semibold">Click to Flip</p>
          </div>

          {/* Back */}
          <div className="absolute w-full h-full bg-gray-800 rounded-2xl shadow-xl border border-gray-600 p-8 flex flex-col justify-center items-center text-center backface-hidden rotate-y-180 transition-colors">
            <div className="absolute top-4 left-4 text-xs font-semibold text-indigo-400">BACK</div>
            <p className="text-lg sm:text-xl text-gray-200 leading-relaxed overflow-y-auto max-h-full no-scrollbar">
              {currentCard.back}
            </p>
          </div>

        </div>
      </div>

      {/* Action Buttons (Learn Mode uses SRS, Standard uses Navigation) */}
      {mode === 'Learn' ? (
        <div className="grid grid-cols-2 gap-4 w-full">
           <button 
             onClick={(e) => handleSRS(e, false)}
             className="py-4 rounded-xl bg-orange-900/30 text-orange-300 font-bold hover:bg-orange-900/50 transition flex justify-center items-center shadow-sm"
           >
             <X className="w-5 h-5 mr-2" /> Still Learning
           </button>
           <button 
             onClick={(e) => handleSRS(e, true)}
             className="py-4 rounded-xl bg-green-900/30 text-green-300 font-bold hover:bg-green-900/50 transition flex justify-center items-center shadow-sm"
           >
             <Check className="w-5 h-5 mr-2" /> Got It
           </button>
        </div>
      ) : (
        <div className="flex items-center space-x-8">
          <button 
            onClick={(e) => { e.stopPropagation(); handlePrev(); }}
            disabled={currentIndex === 0}
            className="p-4 rounded-full bg-gray-800 shadow-md border border-gray-700 hover:bg-gray-700 disabled:opacity-50 transition text-gray-200"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button 
            onClick={(e) => { e.stopPropagation(); setIsFlipped(!isFlipped); }}
            className="p-4 rounded-full bg-indigo-600 shadow-lg shadow-black/50 hover:bg-indigo-700 transition"
          >
            <RotateCcw className="w-6 h-6 text-white" />
          </button>

          <button 
            onClick={(e) => { e.stopPropagation(); handleNext(); }}
            className="p-4 rounded-full bg-gray-800 shadow-md border border-gray-700 hover:bg-gray-700 transition text-gray-200"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}

      <div className="mt-8 text-sm text-gray-500">
        {mode === 'Learn' ? 'Rate yourself to schedule the next review.' : 'Keyboard: ← Prev | Space Flip | Next →'}
      </div>
    </div>
  );
};

export default FlashcardView;
