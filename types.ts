export enum Difficulty {
  Easy = 'Easy',
  Medium = 'Medium',
  Hard = 'Hard',
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  // Spaced Repetition System (SRS)
  box: number; // 0: New/Learn, 1: 1d, 2: 3d, 3: 7d, 4: 14d, 5: 30d
  nextReview: number; // Timestamp
  lastReviewed?: number;
}

export interface QuizQuestion {
  id: string;
  type: 'multiple-choice' | 'short-answer' | 'true-false';
  question: string;
  options?: string[]; // Only for multiple choice
  correctAnswer: string; // The correct option or text
  explanation: string;
}

export interface QuizResult {
  date: number;
  score: number;
  totalQuestions: number;
  difficulty: Difficulty;
  mode: 'Quiz' | 'Test';
}

export interface StudySet {
  id: string;
  title: string;
  description: string;
  sourceTextSnippet: string; // First 100 chars of source
  fullSourceText?: string; // Storing full text for regeneration
  createdAt: number;
  tags: string[];
  flashcards: Flashcard[];
  quizQuestions: QuizQuestion[];
  quizResults: QuizResult[];
  color: string; // For UI identification
  studyGuide: string; // AI Generated Study Guide
}

export interface AISetResponse {
  title: string;
  description: string;
  tags: string[];
  flashcards: { front: string; back: string }[];
  quizQuestions: {
    type: 'multiple-choice' | 'short-answer' | 'true-false';
    question: string;
    options?: string[];
    correctAnswer: string;
    explanation: string;
  }[];
  studyGuide: string;
}
