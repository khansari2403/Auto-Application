import React from 'react';

export const QUESTION_CATEGORIES = [
  { id: 'get_to_know', label: 'Get to Know You', icon: '👋', description: 'Personal background and career goals' },
  { id: 'psychological', label: 'Psychological', icon: '🧠', description: 'Behavioral and situational questions' },
  { id: 'aptitude', label: 'Aptitude', icon: '📊', description: 'Problem-solving and analytical skills' },
  { id: 'culture', label: 'Culture Fit', icon: '🤝', description: 'Values alignment and team dynamics' },
  { id: 'position_specific', label: 'Position Specific', icon: '💼', description: 'Technical skills and role requirements' },
  { id: 'cv_specific', label: 'CV Specific', icon: '📄', description: 'Questions comparing your CV against job requirements' },
];

export interface InterviewQuestion {
  id: string;
  category: 'get_to_know' | 'psychological' | 'aptitude' | 'culture' | 'position_specific' | 'cv_specific';
  question: string;
  suggestedAnswer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tips?: string;
}

export function getDifficultyColor(difficulty: string): string {
  switch (difficulty) {
    case 'easy': return 'var(--success)';
    case 'medium': return 'var(--warning)';
    case 'hard': return 'var(--danger)';
    default: return 'var(--text-secondary)';
  }
}
