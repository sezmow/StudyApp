import React, { useState, useEffect } from 'react';
import { StudySet } from './types';
import { getStudySets, saveStudySet, deleteStudySet } from './services/storageService';
import { generateStudyContent, extractTextFromImage } from './services/geminiService';
import { extractTextFromPDF, fileToBase64 } from './services/fileService';
import FlashcardView from './components/FlashcardView';
import QuizView from './components/QuizView';
import TestModeView from './components/TestModeView';
import SetEditor from './components/SetEditor';
import { BookOpen, Brain, Plus, FileText, Trash2, Download, Edit, FileSearch, GraduationCap, Loader2, Layers } from 'lucide-react';

export default function App() {
  const [view, setView] = useState<'dashboard' | 'create' | 'study' | 'quiz' | 'test' | 'edit' | 'guide'>('dashboard');
  const [sets, setSets] = useState<StudySet[]>([]);
  const [activeSet, setActiveSet] = useState<StudySet | null>(null);
  
  // Creation State
  const [inputTitle, setInputTitle] = useState('');
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [isFileProcessing, setIsFileProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');

  useEffect(() => {
    loadSets();
    // Enforce dark mode on body
    document.documentElement.classList.add('dark');
    document.body.classList.add('bg-gray-950');
  }, []);

  const loadSets = () => {
    setSets(getStudySets());
  };

  const handleCreateSet = async () => {
    if (!inputText.trim() || !inputTitle.trim()) {
      setGenError('Please provide both a title and study notes (or uploaded content).');
      return;
    }
    
    setIsGenerating(true);
    setGenError('');
    
    try {
      const aiData = await generateStudyContent(inputText, 'Medium');
      
      const newSet: StudySet = {
        id: crypto.randomUUID(),
        title: inputTitle,
        description: aiData.description,
        tags: aiData.tags,
        sourceTextSnippet: inputText.substring(0, 100) + '...',
        fullSourceText: inputText, // Store for regeneration
        createdAt: Date.now(),
        flashcards: aiData.flashcards.map(f => ({ 
          ...f, 
          id: crypto.randomUUID(), 
          box: 0, 
          nextReview: Date.now() 
        })),
        quizQuestions: aiData.quizQuestions.map(q => ({ ...q, id: crypto.randomUUID() })),
        quizResults: [],
        color: ['bg-blue-600', 'bg-purple-600', 'bg-emerald-600', 'bg-pink-600'][Math.floor(Math.random() * 4)],
        studyGuide: aiData.studyGuide
      };

      saveStudySet(newSet);
      loadSets();
      setView('dashboard');
      setInputText('');
      setInputTitle('');
    } catch (err: any) {
      setGenError(err.message || 'Failed to generate study set');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteSet = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this study set?')) {
      deleteStudySet(id);
      loadSets();
      if (activeSet?.id === id) setActiveSet(null);
    }
  };

  const handleExport = (set: StudySet, e: React.MouseEvent) => {
    e.stopPropagation();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(set, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${set.title.replace(/\s+/g, '_')}_studyforge.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setGenError('');
    setIsFileProcessing(true);

    try {
      if (file.type === 'application/pdf') {
        setProcessingStatus('Extracting text from PDF...');
        const text = await extractTextFromPDF(file);
        setInputText(text);
      } else if (file.type.startsWith('image/')) {
        setProcessingStatus('Analyzing image with AI...');
        const base64 = await fileToBase64(file);
        const text = await extractTextFromImage(base64, file.type);
        setInputText(text);
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setInputText(event.target.result as string);
          }
          setIsFileProcessing(false);
        };
        reader.onerror = () => {
           setGenError("Failed to read text file.");
           setIsFileProcessing(false);
        };
        reader.readAsText(file);
        return;
      }
    } catch (err: any) {
      setGenError(err.message);
    } finally {
      setIsFileProcessing(false);
      setProcessingStatus('');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-950 text-white font-sans">
      
      {/* Navbar */}
      <nav className="shadow-sm border-b sticky top-0 z-50 bg-gray-900 border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <div className="flex items-center cursor-pointer" onClick={() => setView('dashboard')}>
            <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center mr-2">
              <Brain className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">StudyForge</h1>
          </div>
          {/* No dark mode toggle needed */}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        
        {/* VIEW: DASHBOARD */}
        {view === 'dashboard' && (
          <>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-white">Your Library</h2>
              <button 
                onClick={() => setView('create')} 
                className="flex items-center bg-indigo-600 text-white px-5 py-2.5 rounded-lg shadow-md hover:bg-indigo-700 transition"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create New Set
              </button>
            </div>

            {sets.length === 0 ? (
              <div className="text-center py-20 rounded-2xl border-2 border-dashed bg-gray-900 border-gray-800">
                <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                <h3 className="text-xl font-medium text-gray-300">No study sets yet</h3>
                <p className="mt-2 text-gray-500">Create your first AI-powered study set to get started.</p>
                <button 
                  onClick={() => setView('create')} 
                  className="mt-6 text-indigo-400 font-semibold hover:underline"
                >
                  Create now &rarr;
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sets.map(set => (
                  <div 
                    key={set.id} 
                    onClick={() => { setActiveSet(set); setView('study'); }}
                    className="rounded-xl shadow-sm hover:shadow-md border p-6 cursor-pointer transition relative group bg-gray-900 border-gray-800 hover:bg-gray-800"
                  >
                    <div className={`absolute top-0 left-0 w-full h-2 rounded-t-xl ${set.color}`}></div>
                    <div className="flex justify-between items-start mt-2 mb-3">
                      <h3 className="font-bold text-lg line-clamp-1 text-white">{set.title}</h3>
                      <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition">
                         <button onClick={(e) => handleExport(set, e)} className="p-1.5 text-gray-400 hover:text-indigo-400 rounded-full hover:bg-gray-700" title="Export JSON">
                           <Download className="w-4 h-4" />
                         </button>
                         <button onClick={(e) => handleDeleteSet(set.id, e)} className="p-1.5 text-gray-400 hover:text-red-400 rounded-full hover:bg-gray-700" title="Delete">
                           <Trash2 className="w-4 h-4" />
                         </button>
                      </div>
                    </div>
                    <p className="text-sm mb-4 line-clamp-2 text-gray-400">{set.description}</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {set.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="px-2 py-1 text-xs rounded-full bg-gray-800 text-gray-300 border border-gray-700">{tag}</span>
                      ))}
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-gray-800">
                      <div className="text-xs text-gray-500">{set.flashcards.length} Cards</div>
                      {set.quizResults.length > 0 && (
                        <div className="text-xs font-semibold text-emerald-400">
                          Last Score: {set.quizResults[set.quizResults.length - 1].score}/{set.quizResults[set.quizResults.length - 1].totalQuestions}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* VIEW: CREATE */}
        {view === 'create' && (
          <div className="max-w-3xl mx-auto">
            <button onClick={() => setView('dashboard')} className="mb-6 flex items-center hover:text-indigo-400 transition text-gray-400">
              &larr; Back to Dashboard
            </button>
            <div className="rounded-xl shadow-lg border overflow-hidden bg-gray-900 border-gray-800">
              <div className="p-8">
                <h2 className="text-2xl font-bold mb-6 text-white">Create New Study Set</h2>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2 opacity-70 text-gray-300">Title</label>
                  <input 
                    type="text" 
                    value={inputTitle} 
                    onChange={e => setInputTitle(e.target.value)}
                    placeholder="e.g. Introduction to Biology" 
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-colors bg-gray-950 border-gray-700 text-white placeholder-gray-600"
                  />
                </div>

                <div className="mb-6">
                   <div className="flex justify-between items-center mb-2">
                     <label className="block text-sm font-medium opacity-70 text-gray-300">Study Notes or Content</label>
                     <div className="relative">
                        <input type="file" id="file-upload" className="hidden" accept=".txt,.md,.json,.pdf,image/png,image/jpeg,image/webp" onChange={handleFileUpload} />
                        <label htmlFor="file-upload" className="cursor-pointer text-indigo-400 text-sm font-semibold hover:underline flex items-center">
                           <FileText className="w-4 h-4 mr-1" />
                           Upload File (PDF, Image, TXT)
                        </label>
                     </div>
                   </div>
                   
                   <div className="relative">
                     {isFileProcessing && (
                       <div className="absolute inset-0 bg-black/70 z-10 flex items-center justify-center backdrop-blur-sm rounded-lg">
                         <div className="flex flex-col items-center">
                           <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-2" />
                           <p className="text-indigo-400 font-medium">{processingStatus || 'Processing...'}</p>
                         </div>
                       </div>
                     )}
                     <textarea
                       value={inputText}
                       onChange={e => setInputText(e.target.value)}
                       placeholder="Paste your notes here, or upload a PDF/Image file to extract text..."
                       className="w-full h-64 p-4 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm leading-relaxed transition-colors bg-gray-950 border-gray-700 text-gray-300 placeholder-gray-600"
                     ></textarea>
                   </div>
                   
                   <p className="text-xs text-gray-500 mt-2 text-right">{inputText.length} characters</p>
                </div>

                {genError && (
                  <div className="mb-6 p-4 bg-red-900/30 text-red-300 border border-red-900 rounded-lg">
                    {genError}
                  </div>
                )}

                <button 
                  onClick={handleCreateSet} 
                  disabled={isGenerating || isFileProcessing}
                  className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-bold text-lg hover:shadow-lg transition flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isGenerating ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Generating Study Set...</> : 'Generate with AI'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: STUDY, QUIZ, TEST, EDIT, GUIDE */}
        {activeSet && view !== 'dashboard' && view !== 'create' && (
          <div className="max-w-4xl mx-auto">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <button onClick={() => setView('dashboard')} className="hover:text-indigo-400 flex items-center transition text-gray-400">
                  &larr; Library
                </button>
                <div className="flex rounded-lg p-1 shadow-sm border overflow-x-auto max-w-full transition-colors bg-gray-900 border-gray-800">
                   {[
                     { id: 'study', label: 'Flashcards', icon: Layers },
                     { id: 'quiz', label: 'Quiz', icon: Brain },
                     { id: 'test', label: 'Test Mode', icon: GraduationCap },
                     { id: 'guide', label: 'Guide', icon: FileSearch },
                     { id: 'edit', label: 'Edit', icon: Edit },
                   ].map((item) => (
                     <button 
                      key={item.id}
                      onClick={() => setView(item.id as any)} 
                      className={`px-3 py-2 rounded-md text-sm font-medium transition flex items-center whitespace-nowrap ${view === item.id 
                        ? 'bg-indigo-900 text-indigo-300 ring-1 ring-indigo-700' 
                        : 'text-gray-400 hover:bg-gray-800'}`}
                     >
                       <item.icon className="w-4 h-4 mr-1 sm:mr-2" />
                       <span className="hidden sm:inline">{item.label}</span>
                     </button>
                   ))}
                </div>
             </div>
             
             {view !== 'edit' && (
                <div className="mb-6">
                  <h1 className="text-3xl font-bold text-white">{activeSet.title}</h1>
                  <p className="opacity-70 mt-1 text-gray-300">{activeSet.description}</p>
                </div>
             )}

             {view === 'study' && <FlashcardView set={activeSet} onExit={() => setView('dashboard')} />}
             
             {view === 'quiz' && <QuizView set={activeSet} onExit={() => setView('dashboard')} />}
             
             {view === 'test' && <TestModeView set={activeSet} onExit={() => setView('dashboard')} />}
             
             {view === 'edit' && <SetEditor set={activeSet} onExit={() => setView('study')} onUpdate={loadSets} />}

             {view === 'guide' && (
               <div className="p-8 rounded-xl shadow border transition-colors bg-gray-900 border-gray-800">
                 <h2 className="text-2xl font-bold mb-4 flex items-center text-white"><FileSearch className="w-6 h-6 mr-2 text-indigo-400" /> Study Guide</h2>
                 <div className="prose prose-invert max-w-none whitespace-pre-wrap leading-relaxed text-gray-300">
                   {activeSet.studyGuide || "No study guide available for this set."}
                 </div>
               </div>
             )}
          </div>
        )}

      </main>
    </div>
  );
}
