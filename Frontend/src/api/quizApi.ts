import axios from 'axios';

const API_URL = 'http://localhost:5001/api/quiz';

const api = axios.create({
  baseURL: API_URL,
  timeout: 600000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export type QuizTypeKey =
  | 'MCQ_SINGLE'
  | 'MCQ_MULTI'
  | 'SHORT'
  | 'NUMERICAL'
  | 'ASSERTION_REASON'
  | 'FILL_BLANK';

export type GenerateQuizRequest = {
  userId: string;
  subjectId: string;
  subjectName?: string;
  topic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  timeMode: 'Timed' | 'Practice';
  questionCount: number;
  examType: string;
  questionTypes: QuizTypeKey[];
};

export const generatePracticeQuiz = async (payload: GenerateQuizRequest) => {
  const res = await api.post('/generate', payload);
  return res.data;
};
