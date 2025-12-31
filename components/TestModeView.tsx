import React, { useState, useEffect } from 'react';
import { StudySet, QuizQuestion, QuizResult, Difficulty } from '../types';
import { addQuizResult } from '../services/storageService';
import { generateQuizQuestions } from '../services/geminiService';
import { Clock, Play, Check, Loader2, AlertCircle } from 'lucide-react';

interface TestModeViewProps {
  set: StudySet;
  onExit: () => void;
}

const TestModeView: React.FC<TestModeViewProps> = ({ set, onExit }) => {
  // Setup State
  const [setupMode, setSetupMode] = useState(true);
  const [questionCount, setQuestionCount] = useState(10);
  
  // Test State
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({}); // IDs of questions manually marked correct
  const [isGenerating, setIsGenerating] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  // Scroll to top when submitted
  useEffect(() => {
    if (submitted) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [submitted]);

  const handleStartTest = async () => {
    setIsGenerating(true);
    try {
      let testQuestions: QuizQuestion[] = [];
      if (set.fullSourceText) {
         testQuestions = await generateQuizQuestions(set.fullSourceText, questionCount, 'Hard');
      } else {
         testQuestions = [...set.quizQuestions].sort(() => Math.random() - 0.5).slice(0, questionCount);
      }
      setQuestions(testQuestions);
      setSetupMode(false);
    } catch (e) {
      alert("Failed to generate test. Using existing questions.");
      setQuestions([...set.quizQuestions].sort(() => Math.random() - 0.5).slice(0, questionCount));
      setSetupMode(false);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelect = (qId: string, answer: string) => {
    if (submitted) return;
    setUserAnswers(prev => ({ ...prev, [qId]: answer }));
    if (submitError) setSubmitError(null);
  };

  const toggleOverride = (qId: string) => {
    setOverrides(prev => ({ ...prev, [qId]: !prev[qId] }));
  };

  const getScore = () => {
    let score = 0;
    questions.forEach(q => {
      if (overrides[q.id]) {
        score++;
        return;
      }
      const uAns = userAnswers[q.id] || '';
      const isCorrect = (q.type === 'multiple-choice' || q.type === 'true-false')
        ? uAns === q.correctAnswer
        : q.correctAnswer.toLowerCase().includes(uAns.toLowerCase().trim()) && uAns.length > 0;
      
      if (isCorrect) score++;
    });
    return score;
  };

  const handleSubmitTest = () => {
    const unansweredCount = questions.filter(q => !userAnswers[q.id] || userAnswers[q.id].trim() === '').length;
    
    if (unansweredCount > 0) {
      setSubmitError(`Please answer all questions. ${unansweredCount} remaining.`);
      return;
    }

    // Submit immediately without confirmation to avoid blocking issues
    setSubmitted(true);
  };

  const handleFinishReview = () => {
    const finalScore = getScore();
    addQuizResult(set.id, {
      date: Date.now(),
      score: finalScore,
      totalQuestions: questions.length,
      difficulty: Difficulty.Hard,
      mode: 'Test'
    });
    onExit();
  };

  if (setupMode) {
    return (
      <div className="max-w-xl mx-auto bg-gray-900 p-8 rounded-xl shadow-lg border border-gray-800 transition-colors">
        <h2 className="text-2xl font-bold mb-6 text-white">Configure Test</h2>
        
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-300 mb-2">Number of Questions</label>
          <div className="flex items-center space-x-4">
             {[5, 10, 15, 20].map(num => (
               <button 
                 key={num}
                 onClick={() => setQuestionCount(num)}
                 className={`px-4 py-2 rounded-lg border transition ${questionCount === num ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-800 text-gray-300 border-gray-700 hover:border-indigo-400'}`}
               >
                 {num}
               </button>
             ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">Maximum available from generation: 20</p>
        </div>

        <button 
          onClick={handleStartTest} 
          disabled={isGenerating}
          className="w-full py-4 bg-indigo-600 text-white rounded-lg font-bold text-lg hover:bg-indigo-700 transition flex items-center justify-center shadow-md hover:shadow-lg disabled:opacity-70"
        >
          {isGenerating ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Play className="w-5 h-5 mr-2" /> Start Test</>}
        </button>
      </div>
    );
  }

  const score = getScore();
  const percentage = Math.round((score / questions.length) * 100);

  return (
    <div className="max-w-3xl mx-auto pb-32">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Exam Simulation</h2>
        {submitted && (
          <div className="flex items-center space-x-4">
            <div className="text-xl font-bold text-indigo-400">{percentage}% ({score}/{questions.length})</div>
            <button onClick={handleFinishReview} className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 text-sm font-semibold transition">
              Finish Review
            </button>
          </div>
        )}
        {!submitted && (
          <div className="flex items-center text-orange-400 bg-orange-900/30 px-3 py-1 rounded-full text-sm font-medium">
            <Clock className="w-4 h-4 mr-1" /> Test in Progress
          </div>
        )}
      </div>
      
      <div className="space-y-8">
        {questions.map((q, idx) => {
          const uAns = userAnswers[q.id] || '';
          // Determine logic correctness
          const logicCorrect = (q.type === 'multiple-choice' || q.type === 'true-false')
            ? uAns === q.correctAnswer
            : q.correctAnswer.toLowerCase().includes(uAns.toLowerCase().trim()) && uAns.length > 0;
            
          const isCorrect = logicCorrect || overrides[q.id];
          
          return (
            <div key={q.id} className={`bg-gray-900 p-6 rounded-xl shadow-sm border transition-colors ${submitted ? (isCorrect ? 'border-green-500' : 'border-red-500') : 'border-gray-800'}`}>
              <h3 className="text-lg font-semibold text-white mb-4">{idx + 1}. {q.question}</h3>
              
              {q.type === 'multiple-choice' && (
                <div className="space-y-2">
                  {q.options?.map(opt => (
                    <label key={opt} className={`flex items-center p-3 rounded-lg border cursor-pointer transition 
                      ${submitted ? 'cursor-default' : 'hover:bg-gray-800'}
                      ${userAnswers[q.id] === opt ? 'border-indigo-500 bg-indigo-900/40' : 'border-gray-700'}
                      ${submitted && opt === q.correctAnswer ? 'bg-green-900/30 border-green-500' : ''}
                      ${submitted && userAnswers[q.id] === opt && opt !== q.correctAnswer ? 'bg-red-900/30 border-red-500' : ''}
                    `}>
                      <input 
                        type="radio" 
                        name={`q-${q.id}`} 
                        className="w-4 h-4 text-indigo-600" 
                        checked={userAnswers[q.id] === opt}
                        onChange={() => handleSelect(q.id, opt)}
                        disabled={submitted}
                      />
                      <span className="ml-3 text-gray-200">{opt}</span>
                    </label>
                  ))}
                </div>
              )}

              {q.type === 'true-false' && (
                <div className="grid grid-cols-2 gap-4">
                  {['True', 'False'].map(opt => (
                    <label key={opt} className={`flex justify-center items-center p-4 rounded-lg border cursor-pointer font-medium transition
                      ${submitted ? 'cursor-default' : 'hover:bg-gray-800'}
                      ${userAnswers[q.id] === opt ? 'border-indigo-500 bg-indigo-900/40' : 'border-gray-700'}
                      ${submitted && opt === q.correctAnswer ? 'bg-green-900/30 border-green-500 text-green-300' : ''}
                      ${submitted && userAnswers[q.id] === opt && opt !== q.correctAnswer ? 'bg-red-900/30 border-red-500 text-red-300' : 'text-gray-300'}
                    `}>
                      <input 
                        type="radio" 
                        name={`q-${q.id}`} 
                        className="hidden" 
                        checked={userAnswers[q.id] === opt}
                        onChange={() => handleSelect(q.id, opt)}
                        disabled={submitted}
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              )}

              {q.type === 'short-answer' && (
                <div>
                  <input 
                    type="text" 
                    placeholder="Type your answer..."
                    className="w-full p-3 border border-gray-700 rounded-lg bg-gray-950 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={userAnswers[q.id] || ''}
                    onChange={(e) => handleSelect(q.id, e.target.value)}
                    disabled={submitted}
                  />
                  {submitted && (
                     <div className="mt-2 text-sm">
                       <p className="text-gray-400">Correct Answer: <span className="font-semibold text-green-400">{q.correctAnswer}</span></p>
                     </div>
                  )}
                </div>
              )}
              
              {submitted && !isCorrect && (
                <div className="mt-4 flex justify-end">
                   <button 
                     onClick={() => toggleOverride(q.id)}
                     className="text-sm flex items-center text-indigo-400 hover:underline"
                   >
                     <Check className="w-4 h-4 mr-1" /> Mark as Correct
                   </button>
                </div>
              )}
              {submitted && isCorrect && overrides[q.id] && (
                <div className="mt-4 flex justify-end">
                   <span className="text-sm text-green-400 flex items-center">
                     <Check className="w-4 h-4 mr-1" /> Marked Correct Manually
                   </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!submitted && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 flex flex-col items-center z-50 w-full px-4 sm:w-auto">
          {submitError && (
            <div className="mb-3 bg-red-900/80 text-red-200 px-4 py-2 rounded-lg text-sm font-semibold flex items-center shadow-lg animate-bounce border border-red-800">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              <span>{submitError}</span>
            </div>
          )}
          <button 
            onClick={handleSubmitTest}
            className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-xl hover:bg-indigo-700 hover:scale-105 transition transform flex items-center ring-2 ring-indigo-800"
          >
            Submit Test
          </button>
        </div>
      )}
    </div>
  );
};

export default TestModeView;
