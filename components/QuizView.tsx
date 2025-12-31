import React, { useState } from 'react';
import { StudySet, QuizQuestion, QuizResult, Difficulty } from '../types';
import { addQuizResult } from '../services/storageService';
import { generateQuizQuestions } from '../services/geminiService';
import { CheckCircle, XCircle, ArrowRight, RotateCcw, Check, Loader2 } from 'lucide-react';

interface QuizViewProps {
  set: StudySet;
  onExit: () => void;
}

const QuizView: React.FC<QuizViewProps> = ({ set, onExit }) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>(() => [...set.quizQuestions].sort(() => Math.random() - 0.5).slice(0, 6));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [shortAnswer, setShortAnswer] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | 'overridden' | null>(null);
  const [quizComplete, setQuizComplete] = useState(false);
  
  // Regeneration state
  const [isRegenerating, setIsRegenerating] = useState(false);

  const currentQ = questions[currentIndex];

  const handleAnswerSubmit = () => {
    let isCorrect = false;

    if (currentQ.type === 'multiple-choice' || currentQ.type === 'true-false') {
      isCorrect = selectedOption === currentQ.correctAnswer;
    } else {
      isCorrect = currentQ.correctAnswer.toLowerCase().includes(shortAnswer.toLowerCase().trim()) || 
                  shortAnswer.toLowerCase().trim().includes(currentQ.correctAnswer.toLowerCase());
    }

    if (isCorrect) setScore(s => s + 1);
    setFeedback(isCorrect ? 'correct' : 'incorrect');
    setShowResult(true);
  };

  const handleOverrideCorrect = () => {
    if (feedback === 'incorrect') {
      setScore(s => s + 1);
      setFeedback('overridden');
    }
  };

  const handleNext = () => {
    setShowResult(false);
    setFeedback(null);
    setSelectedOption(null);
    setShortAnswer('');

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = () => {
    setQuizComplete(true);
    const result: QuizResult = {
      date: Date.now(),
      score: score,
      totalQuestions: questions.length,
      difficulty: Difficulty.Medium,
      mode: 'Quiz'
    };
    addQuizResult(set.id, result);
  };

  const handleRegenerateQuiz = async () => {
    if (!set.fullSourceText) {
      alert("Cannot generate new questions because the source text is missing.");
      return;
    }
    setIsRegenerating(true);
    try {
      const newQuestions = await generateQuizQuestions(set.fullSourceText, 6, 'Medium');
      setQuestions(newQuestions);
      setCurrentIndex(0);
      setScore(0);
      setQuizComplete(false);
      setShowResult(false);
      setFeedback(null);
      setSelectedOption(null);
      setShortAnswer('');
    } catch (e) {
      alert("Failed to generate new quiz. Please try again.");
    } finally {
      setIsRegenerating(false);
    }
  };

  if (isRegenerating) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mb-4" />
        <p className="text-gray-300">Generating new quiz questions...</p>
      </div>
    );
  }

  if (quizComplete) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-gray-900 rounded-xl shadow-lg max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 border border-gray-800 transition-colors">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${percentage >= 70 ? 'bg-green-900/30 text-green-300' : 'bg-orange-900/30 text-orange-300'}`}>
          <span className="text-3xl font-bold">{percentage}%</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Quiz Complete!</h2>
        <p className="text-gray-300 mb-8">You got {score} out of {questions.length} questions correct.</p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full">
           <button onClick={onExit} className="flex-1 py-3 bg-gray-800 text-gray-200 font-semibold rounded-lg hover:bg-gray-700 transition">
             Back to Dashboard
           </button>
           <button onClick={() => { setCurrentIndex(0); setScore(0); setQuizComplete(false); }} className="flex-1 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition">
             Retake Same Quiz
           </button>
           {set.fullSourceText && (
             <button onClick={handleRegenerateQuiz} className="flex-1 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition flex items-center justify-center">
               <RotateCcw className="w-4 h-4 mr-2" /> New Quiz
             </button>
           )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto w-full">
      {/* Progress Bar */}
      <div className="w-full bg-gray-800 rounded-full h-2.5 mb-8">
        <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${((currentIndex) / questions.length) * 100}%` }}></div>
      </div>

      <div className="bg-gray-900 rounded-xl shadow-lg p-6 sm:p-8 border border-gray-800 transition-colors">
        <div className="mb-6">
           <span className="text-sm font-semibold text-indigo-400 uppercase tracking-wide">Question {currentIndex + 1} of {questions.length}</span>
           <h3 className="text-xl sm:text-2xl font-bold text-white mt-2">{currentQ.question}</h3>
        </div>

        {/* Options / Input */}
        <div className="space-y-4 mb-8">
          {currentQ.type === 'multiple-choice' && currentQ.options?.map((opt, idx) => (
            <button
              key={idx}
              disabled={showResult}
              onClick={() => setSelectedOption(opt)}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 
                ${showResult && opt === currentQ.correctAnswer ? 'border-green-500 bg-green-900/30 text-green-300' : ''}
                ${showResult && opt === selectedOption && opt !== currentQ.correctAnswer ? 'border-red-500 bg-red-900/30 text-red-300' : ''}
                ${!showResult && selectedOption === opt ? 'border-indigo-500 bg-indigo-900/40 text-indigo-300' : 'border-gray-700 hover:border-gray-500 text-gray-200 bg-gray-950'}
              `}
            >
              <div className="flex items-center">
                 <div className={`w-6 h-6 rounded-full border flex items-center justify-center mr-3 
                   ${selectedOption === opt ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-500'}
                 `}>
                   {selectedOption === opt && <div className="w-2 h-2 bg-white rounded-full"></div>}
                 </div>
                 {opt}
              </div>
            </button>
          ))}

          {currentQ.type === 'true-false' && (
            <div className="grid grid-cols-2 gap-4">
              {['True', 'False'].map((opt) => (
                <button
                  key={opt}
                  disabled={showResult}
                  onClick={() => setSelectedOption(opt)}
                  className={`p-6 rounded-xl border-2 text-center font-bold text-lg transition-all
                    ${showResult && opt === currentQ.correctAnswer ? 'border-green-500 bg-green-900/30 text-green-300' : ''}
                    ${showResult && opt === selectedOption && opt !== currentQ.correctAnswer ? 'border-red-500 bg-red-900/30 text-red-300' : ''}
                    ${!showResult && selectedOption === opt ? 'border-indigo-500 bg-indigo-900/40 text-indigo-300' : 'border-gray-700 hover:border-indigo-300 text-gray-300 bg-gray-950'}
                  `}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {currentQ.type === 'short-answer' && (
            <div className="space-y-2">
               <input 
                 type="text" 
                 disabled={showResult}
                 value={shortAnswer}
                 onChange={(e) => setShortAnswer(e.target.value)}
                 placeholder="Type your answer here..."
                 className="w-full p-4 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-950 text-white placeholder-gray-600"
               />
               {showResult && (
                 <div className="p-4 bg-blue-900/20 text-blue-300 rounded-lg text-sm border border-blue-900">
                   <span className="font-bold">Correct Answer:</span> {currentQ.correctAnswer}
                 </div>
               )}
            </div>
          )}
        </div>

        {/* Feedback Section */}
        {showResult && (
          <div className={`mb-6 p-4 rounded-lg flex items-start space-x-3 ${feedback === 'correct' || feedback === 'overridden' ? 'bg-green-900/30' : 'bg-red-900/30'}`}>
            {feedback === 'correct' || feedback === 'overridden' ? <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" /> : <XCircle className="w-6 h-6 text-red-400 flex-shrink-0" />}
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <p className={`font-bold ${feedback === 'correct' || feedback === 'overridden' ? 'text-green-300' : 'text-red-300'}`}>
                  {feedback === 'correct' ? 'Correct!' : feedback === 'overridden' ? 'Marked Correct by You' : 'Incorrect'}
                </p>
                {feedback === 'incorrect' && (
                  <button 
                    onClick={handleOverrideCorrect}
                    className="text-xs bg-gray-800 text-gray-300 border border-gray-600 px-2 py-1 rounded hover:bg-gray-700 flex items-center transition"
                  >
                    <Check className="w-3 h-3 mr-1" /> Mark as Correct
                  </button>
                )}
              </div>
              <p className="text-gray-300 text-sm mt-1">{currentQ.explanation}</p>
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={showResult ? handleNext : handleAnswerSubmit}
          disabled={!showResult && (!selectedOption && !shortAnswer)}
          className="w-full py-4 bg-indigo-600 text-white rounded-lg font-bold text-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-md hover:shadow-lg"
        >
          {showResult ? (currentIndex === questions.length - 1 ? 'Finish Quiz' : 'Next Question') : 'Check Answer'}
          {showResult && <ArrowRight className="ml-2 w-5 h-5" />}
        </button>
      </div>
    </div>
  );
};

export default QuizView;
