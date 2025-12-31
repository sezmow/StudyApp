import React, { useState } from 'react';
import { StudySet, Flashcard } from '../types';
import { saveStudySet } from '../services/storageService';
import { modifyCardWithAI } from '../services/geminiService';
import { Save, Plus, Trash2, Wand2, ArrowLeft, Loader2 } from 'lucide-react';

interface SetEditorProps {
  set: StudySet;
  onExit: () => void;
  onUpdate: () => void;
}

const SetEditor: React.FC<SetEditorProps> = ({ set, onExit, onUpdate }) => {
  const [cards, setCards] = useState<Flashcard[]>(set.flashcards);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleSave = () => {
    const updatedSet = { ...set, flashcards: cards };
    saveStudySet(updatedSet);
    onUpdate();
    onExit();
  };

  const handleUpdateCard = (id: string, field: 'front' | 'back', value: string) => {
    setCards(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleDeleteCard = (id: string) => {
    setCards(prev => prev.filter(c => c.id !== id));
  };

  const handleAddCard = () => {
    const newCard: Flashcard = {
      id: crypto.randomUUID(),
      front: '',
      back: '',
      box: 0,
      nextReview: Date.now()
    };
    setCards([...cards, newCard]);
  };

  const handleAIModify = async (id: string, action: string) => {
    const card = cards.find(c => c.id === id);
    if (!card) return;

    setLoadingId(id);
    try {
      const result = await modifyCardWithAI(card.front, card.back, action);
      setCards(prev => prev.map(c => c.id === id ? { ...c, front: result.front, back: result.back } : c));
    } catch (error) {
      alert("AI Modification failed. Please try again.");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <div className="flex justify-between items-center mb-6">
        <button onClick={onExit} className="flex items-center text-gray-400 hover:text-gray-200 transition">
          <ArrowLeft className="w-5 h-5 mr-2" /> Back
        </button>
        <h2 className="text-2xl font-bold text-white">Edit Set</h2>
        <button onClick={handleSave} className="flex items-center bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">
          <Save className="w-5 h-5 mr-2" /> Save Changes
        </button>
      </div>

      <div className="space-y-4">
        {cards.map((card, index) => (
          <div key={card.id} className="bg-gray-900 p-4 rounded-xl shadow-sm border border-gray-800 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <span className="text-sm font-semibold text-gray-500">Card {index + 1}</span>
              <div className="flex items-center space-x-2">
                {loadingId === card.id ? (
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                ) : (
                  <div className="relative group">
                     <button className="p-2 text-indigo-400 hover:bg-gray-800 rounded-full transition">
                       <Wand2 className="w-4 h-4" />
                     </button>
                     <div className="absolute right-0 top-full mt-2 w-48 bg-gray-800 shadow-xl rounded-lg p-2 hidden group-hover:block z-10 border border-gray-700">
                       <p className="text-xs font-semibold text-gray-400 mb-2 px-2">AI Actions</p>
                       {['Simplify', 'Add Example', 'Make Harder'].map(action => (
                         <button 
                           key={action}
                           onClick={() => handleAIModify(card.id, action)}
                           className="block w-full text-left px-2 py-1.5 text-sm hover:bg-gray-700 rounded text-gray-200 transition"
                         >
                           {action}
                         </button>
                       ))}
                     </div>
                  </div>
                )}
                <button onClick={() => handleDeleteCard(card.id)} className="p-2 text-red-500 hover:bg-red-900/30 rounded-full transition">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Front</label>
                <textarea 
                  value={card.front}
                  onChange={(e) => handleUpdateCard(card.id, 'front', e.target.value)}
                  className="w-full p-3 bg-gray-950 border border-gray-800 text-white rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-24 text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Back</label>
                <textarea 
                  value={card.back}
                  onChange={(e) => handleUpdateCard(card.id, 'back', e.target.value)}
                  className="w-full p-3 bg-gray-950 border border-gray-800 text-white rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-24 text-sm resize-none"
                />
              </div>
            </div>
          </div>
        ))}
        
        <button onClick={handleAddCard} className="w-full py-4 border-2 border-dashed border-gray-800 text-gray-400 rounded-xl hover:bg-gray-900 flex items-center justify-center font-semibold transition">
          <Plus className="w-5 h-5 mr-2" /> Add New Card
        </button>
      </div>
    </div>
  );
};

export default SetEditor;
