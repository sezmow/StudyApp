import { StudySet, QuizResult, Flashcard } from '../types';

const SETS_KEY = 'studyforge_sets';

// --- Data Access ---

export const getStudySets = (): StudySet[] => {
  const allSets = JSON.parse(localStorage.getItem(SETS_KEY) || '[]');
  return allSets.sort((a: StudySet, b: StudySet) => b.createdAt - a.createdAt);
};

export const saveStudySet = (set: StudySet): void => {
  const allSets = JSON.parse(localStorage.getItem(SETS_KEY) || '[]');
  const existingIndex = allSets.findIndex((s: StudySet) => s.id === set.id);
  
  if (existingIndex >= 0) {
    allSets[existingIndex] = set;
  } else {
    allSets.push(set);
  }
  localStorage.setItem(SETS_KEY, JSON.stringify(allSets));
};

export const deleteStudySet = (setId: string): void => {
  let allSets = JSON.parse(localStorage.getItem(SETS_KEY) || '[]');
  allSets = allSets.filter((s: StudySet) => s.id !== setId);
  localStorage.setItem(SETS_KEY, JSON.stringify(allSets));
};

// --- SRS & Progress ---

export const updateFlashcardSRS = (setId: string, cardId: string, isCorrect: boolean) => {
  const allSets = JSON.parse(localStorage.getItem(SETS_KEY) || '[]');
  const setIndex = allSets.findIndex((s: StudySet) => s.id === setId);
  
  if (setIndex >= 0) {
    const cardIndex = allSets[setIndex].flashcards.findIndex((c: Flashcard) => c.id === cardId);
    if (cardIndex >= 0) {
      const card = allSets[setIndex].flashcards[cardIndex];
      const now = Date.now();
      
      let newBox = card.box || 0;
      if (isCorrect) {
        newBox = Math.min(newBox + 1, 5);
      } else {
        newBox = 0; // Reset to box 0 on failure
      }

      // Intervals in days: 0 (today/learn), 1, 3, 7, 14, 30
      const intervals = [0, 1, 3, 7, 14, 30];
      const daysToAdd = intervals[newBox];
      const nextReview = now + (daysToAdd * 24 * 60 * 60 * 1000);

      allSets[setIndex].flashcards[cardIndex] = {
        ...card,
        box: newBox,
        nextReview: nextReview,
        lastReviewed: now
      };

      localStorage.setItem(SETS_KEY, JSON.stringify(allSets));
    }
  }
};

export const addQuizResult = (setId: string, result: QuizResult) => {
  const allSets = JSON.parse(localStorage.getItem(SETS_KEY) || '[]');
  const setIndex = allSets.findIndex((s: StudySet) => s.id === setId);
  if (setIndex >= 0) {
    if (!allSets[setIndex].quizResults) allSets[setIndex].quizResults = [];
    allSets[setIndex].quizResults.push(result);
    localStorage.setItem(SETS_KEY, JSON.stringify(allSets));
  }
};
