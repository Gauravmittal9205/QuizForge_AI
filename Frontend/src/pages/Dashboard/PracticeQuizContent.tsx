import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, Clock, Download, Flag, Lightbulb, Pause, Play } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { completeTopicInSyllabus } from '../../api/learningApi';
import { generatePracticeQuiz, QuizTypeKey } from '../../api/quizApi';

type QuizQuestion = {
  id: string;
  type: QuizTypeKey;
  conceptTags?: string[];
  question: string;
  options?: string[];
  correctOption?: number;
  correctOptions?: number[];
  expectedKeywords?: string[];
  numerical?: { finalAnswer: number; tolerance: number; unit?: string };
  assertionReason?: {
    assertion: string;
    reason: string;
    options: string[];
    correctOption: 'A' | 'B' | 'C' | 'D';
  };
  fillBlank?: { textWithBlank: string; answer: string };
  hints?: { hint1: string; hint2: string };
  explanation?: string;
  examTips?: string;
  shortcutTrick?: string;
};

type QuizPayload = {
  title?: string;
  subject?: string;
  topic?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  timeMode?: 'Timed' | 'Practice';
  examType?: string;
  questions: QuizQuestion[];
};

type Phase = 'setup' | 'quiz' | 'result';

type AnswerValue =
  | { kind: 'mcq_single'; value: number | null }
  | { kind: 'mcq_multi'; value: number[] }
  | { kind: 'text'; value: string }
  | { kind: 'assertion_reason'; value: 'A' | 'B' | 'C' | 'D' | '' };

 type StoredQuizAttempt = {
   id: string;
   createdAt: number;
   userId: string;
   subjectId: string;
   subjectName?: string;
   topicName: string;
   difficulty: 'Easy' | 'Medium' | 'Hard';
   timeMode: 'Timed' | 'Practice';
   examType: string;
   questionCount: number;
   quiz: QuizPayload;
   answers: Record<string, AnswerValue>;
 };

type Props = {
  syllabusItems?: any[];
  currentUser?: any;
};

const QUESTION_TYPE_OPTIONS: { key: QuizTypeKey; label: string }[] = [
  { key: 'MCQ_SINGLE', label: 'MCQ (Single Correct)' },
  { key: 'MCQ_MULTI', label: 'MCQ (Multiple Correct)' },
  { key: 'SHORT', label: 'Short Answer' },
  { key: 'NUMERICAL', label: 'Numerical' },
  { key: 'ASSERTION_REASON', label: 'Assertion-Reason' },
  { key: 'FILL_BLANK', label: 'Fill in the Blanks' },
];

const isAnsweredValue = (a: AnswerValue | undefined): boolean => {
  if (!a) return false;
  if (a.kind === 'mcq_single') return typeof a.value === 'number';
  if (a.kind === 'mcq_multi') return Array.isArray(a.value) && a.value.length > 0;
  if (a.kind === 'assertion_reason') return !!a.value;
  return !!a.value?.trim();
};

const defaultAnswerFor = (q: QuizQuestion): AnswerValue => {
  if (q.type === 'MCQ_SINGLE') return { kind: 'mcq_single', value: null };
  if (q.type === 'MCQ_MULTI') return { kind: 'mcq_multi', value: [] };
  if (q.type === 'ASSERTION_REASON') return { kind: 'assertion_reason', value: '' };
  return { kind: 'text', value: '' };
};

const normalize = (s: string) => s.toLowerCase().trim();

const evaluateAnswer = (q: QuizQuestion, a: AnswerValue): boolean | null => {
  if (q.type === 'MCQ_SINGLE') {
    if (a.kind !== 'mcq_single' || a.value === null) return null;
    return typeof q.correctOption === 'number' ? a.value === q.correctOption : null;
  }
  if (q.type === 'MCQ_MULTI') {
    if (a.kind !== 'mcq_multi') return null;
    const user = [...a.value].sort((x, y) => x - y);
    const correctArr = Array.isArray(q.correctOptions) ? [...q.correctOptions].sort((x, y) => x - y) : null;
    if (!correctArr || !user.length) return null;
    return JSON.stringify(user) === JSON.stringify(correctArr);
  }
  if (q.type === 'ASSERTION_REASON') {
    if (a.kind !== 'assertion_reason' || !a.value) return null;
    return q.assertionReason?.correctOption ? a.value === q.assertionReason.correctOption : null;
  }
  if (q.type === 'FILL_BLANK') {
    if (a.kind !== 'text') return null;
    const expected = q.fillBlank?.answer;
    if (!expected || !a.value.trim()) return null;
    return normalize(a.value) === normalize(expected);
  }
  if (q.type === 'NUMERICAL') {
    if (a.kind !== 'text') return null;
    const expected = q.numerical?.finalAnswer;
    const tol = q.numerical?.tolerance ?? 0;
    const userVal = Number(a.value);
    if (!a.value.trim() || Number.isNaN(userVal) || typeof expected !== 'number') return null;
    return Math.abs(userVal - expected) <= tol;
  }
  if (q.type === 'SHORT') {
    if (a.kind !== 'text') return null;
    if (!a.value.trim()) return null;
    const keywords = Array.isArray(q.expectedKeywords) ? q.expectedKeywords : [];
    if (!keywords.length) return null;
    const text = normalize(a.value);
    const hits = keywords.filter((k) => text.includes(normalize(k)));
    return hits.length >= Math.min(2, keywords.length);
  }
  return null;
};

const formatTime = (s: number) => {
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
};

const toSafeFilename = (name: string) => name.toLowerCase().replace(/[^a-z0-9-_]+/gi, '_');

 const PREVIOUS_ATTEMPTS_KEY = 'practice_quiz_previous_attempts_v1';
 const MAX_PREVIOUS_ATTEMPTS = 20;

 const readPreviousAttempts = (): StoredQuizAttempt[] => {
   try {
     const raw = localStorage.getItem(PREVIOUS_ATTEMPTS_KEY);
     if (!raw) return [];
     const parsed = JSON.parse(raw);
     if (!Array.isArray(parsed)) return [];
     return parsed.filter((a: any) => a && typeof a.id === 'string' && typeof a.createdAt === 'number' && a.quiz?.questions?.length);
   } catch {
     return [];
   }
 };

 const writePreviousAttempts = (attempts: StoredQuizAttempt[]) => {
   try {
     localStorage.setItem(PREVIOUS_ATTEMPTS_KEY, JSON.stringify(attempts));
   } catch {
     // ignore
   }
 };

const PracticeQuizContent: React.FC<Props> = ({ syllabusItems = [], currentUser }) => {
  const [phase, setPhase] = useState<Phase>('setup');

  const [subjectId, setSubjectId] = useState<string>('');
  const selectedSubject = useMemo(
    () => syllabusItems.find((s: any) => s.id === subjectId) ?? null,
    [syllabusItems, subjectId]
  );

  const chapters = useMemo(() => {
    const c = selectedSubject?.chapters;
    return Array.isArray(c) ? c : [];
  }, [selectedSubject]);

  const topicOptions = useMemo(() => {
    if (!selectedSubject) return [] as Array<{ key: string; label: string; value: string }>;

    const options: Array<{ key: string; label: string; value: string }> = [];

    for (const chapter of chapters) {
      const desc = typeof chapter?.description === 'string' ? chapter.description : '';
      if (!desc) continue;
      const lines = desc.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.match(/^[-•*]\s*\[[ x]\]/i)) continue;
        const name = trimmed.replace(/^[-•*]\s*\[[ x]\]\s*/i, '').trim();
        if (!name) continue;
        options.push({
          key: `${chapter.id || chapter.name}-${name}`,
          label: `${chapter.name}: ${name}`,
          value: name,
        });
      }
    }

    if (options.length > 0) return options;

    return chapters.map((chapter: any) => ({
      key: `${chapter.id || chapter.name}`,
      label: chapter.name,
      value: chapter.name,
    }));
  }, [selectedSubject, chapters]);

  const [topicName, setTopicName] = useState<string>('');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [timeMode, setTimeMode] = useState<'Timed' | 'Practice'>('Practice');
  const [examType, setExamType] = useState<string>('School');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [questionTypes, setQuestionTypes] = useState<QuizTypeKey[]>(['MCQ_SINGLE', 'SHORT', 'NUMERICAL']);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generateSeconds, setGenerateSeconds] = useState(0);

  const [quiz, setQuiz] = useState<QuizPayload | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [marked, setMarked] = useState<Record<string, boolean>>({});
  const [hintsUsed, setHintsUsed] = useState<Record<string, number>>({});

  const [reviewFilter, setReviewFilter] = useState<'all' | 'correct' | 'wrong' | 'unanswered'>('all');
  const [expandedReview, setExpandedReview] = useState<Record<string, boolean>>({});

   const [previousAttempts, setPreviousAttempts] = useState<StoredQuizAttempt[]>([]);
   const hasSavedAttemptRef = useRef(false);

  const [quizSecondsLeft, setQuizSecondsLeft] = useState<number | null>(null);
  const [questionSecondsLeft, setQuestionSecondsLeft] = useState<number | null>(null);
  const [timerPaused, setTimerPaused] = useState(false);

  const questions = quiz?.questions ?? [];
  const currentQuestion = questions[index];

  const progressPct = useMemo(() => {
    if (!questions.length) return 0;
    return Math.round(((index + 1) / questions.length) * 100);
  }, [index, questions.length]);

  const intervalRef = useRef<number | null>(null);

   useEffect(() => {
     setPreviousAttempts(readPreviousAttempts());
   }, []);

  useEffect(() => {
    if (!subjectId && syllabusItems?.[0]?.id) {
      setSubjectId(syllabusItems[0].id);
    }
  }, [syllabusItems, subjectId]);

  useEffect(() => {
    if (!topicName && topicOptions?.[0]?.value) {
      setTopicName(topicOptions[0].value);
    }
  }, [topicOptions, topicName]);

  useEffect(() => {
    if (phase !== 'quiz' || timeMode !== 'Timed' || timerPaused) return;

    intervalRef.current = window.setInterval(() => {
      setQuizSecondsLeft((prev) => (typeof prev === 'number' ? Math.max(0, prev - 1) : prev));
      setQuestionSecondsLeft((prev) => (typeof prev === 'number' ? Math.max(0, prev - 1) : prev));
    }, 1000);

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [phase, timeMode, timerPaused]);

  useEffect(() => {
    if (phase !== 'quiz' || timeMode !== 'Timed') return;
    if (quizSecondsLeft === 0) {
      finishQuiz();
    }
  }, [quizSecondsLeft, phase, timeMode]);

  useEffect(() => {
    if (phase !== 'quiz' || timeMode !== 'Timed') return;
    if (questionSecondsLeft === 0) {
      handleNext();
    }
  }, [questionSecondsLeft, phase, timeMode]);

  const toggleType = (key: QuizTypeKey) => {
    setQuestionTypes((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      return [...prev, key];
    });
  };

  const startQuiz = async () => {
    setError(null);
    hasSavedAttemptRef.current = false;

    if (!currentUser?.uid) {
      setError('Please login to start a quiz.');
      return;
    }

    if (!subjectId || !topicName) {
      setError('Please select subject and topic.');
      return;
    }

    if (!questionTypes.length) {
      setError('Please select at least one question type.');
      return;
    }

    setLoading(true);
    setGenerateSeconds(0);
    let t: number | null = null;
    try {
      t = window.setInterval(() => {
        setGenerateSeconds((s) => s + 1);
      }, 1000);

      const res = await generatePracticeQuiz({
        userId: currentUser.uid,
        subjectId,
        subjectName: selectedSubject?.name,
        topic: topicName,
        difficulty,
        timeMode,
        questionCount,
        examType,
        questionTypes,
      });

      if (t) window.clearInterval(t);

      const payload: QuizPayload = res?.quiz;
      if (!payload?.questions?.length) {
        throw new Error('No questions generated. Please try again.');
      }

      const initialAnswers: Record<string, AnswerValue> = {};
      const initialMarked: Record<string, boolean> = {};
      const initialHints: Record<string, number> = {};

      for (const q of payload.questions) {
        initialAnswers[q.id] = defaultAnswerFor(q);
        initialMarked[q.id] = false;
        initialHints[q.id] = 0;
      }

      setQuiz(payload);
      setIndex(0);
      setAnswers(initialAnswers);
      setMarked(initialMarked);
      setHintsUsed(initialHints);

      if (timeMode === 'Timed') {
        const perQuestion = 60;
        setQuestionSecondsLeft(perQuestion);
        setQuizSecondsLeft(perQuestion * payload.questions.length);
        setTimerPaused(false);
      } else {
        setQuestionSecondsLeft(null);
        setQuizSecondsLeft(null);
      }

      setPhase('quiz');
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to generate quiz');
    } finally {
      if (t) window.clearInterval(t);
      setLoading(false);
    }
  };

  const handlePrev = () => {
    setError(null);
    setIndex((prev) => Math.max(0, prev - 1));
    if (timeMode === 'Timed') setQuestionSecondsLeft(60);
  };

  const handleNext = () => {
    setError(null);
    setIndex((prev) => Math.min(questions.length - 1, prev + 1));
    if (timeMode === 'Timed') setQuestionSecondsLeft(60);
  };

  const jumpToQuestion = (i: number) => {
    setError(null);
    setIndex(Math.max(0, Math.min(questions.length - 1, i)));
    if (timeMode === 'Timed') setQuestionSecondsLeft(60);
  };

  const toggleMark = () => {
    if (!currentQuestion) return;
    setMarked((prev) => ({ ...prev, [currentQuestion.id]: !prev[currentQuestion.id] }));
  };

  const useHint = () => {
    if (!currentQuestion) return;
    setHintsUsed((prev) => ({ ...prev, [currentQuestion.id]: Math.min(2, (prev[currentQuestion.id] || 0) + 1) }));
  };

  const currentHintText = useMemo(() => {
    if (!currentQuestion) return '';
    const used = hintsUsed[currentQuestion.id] || 0;
    if (used === 1) return currentQuestion.hints?.hint1 || '';
    if (used >= 2) return currentQuestion.hints?.hint2 || '';
    return '';
  }, [currentQuestion, hintsUsed]);

  const scoreReport = useMemo(() => {
    if (!quiz) return null;

    let total = 0;
    let correct = 0;

    for (const q of quiz.questions) {
      total += 1;
      const a = answers[q.id] ?? defaultAnswerFor(q);
      const r = evaluateAnswer(q, a);
      if (r === true) correct += 1;
    }

    const accuracy = total ? Math.round((correct / total) * 100) : 0;
    return { total, correct, accuracy };
  }, [quiz, answers]);

  const persistAttempt = () => {
    if (!quiz?.questions?.length) return;
    if (!currentUser?.uid) return;
    if (hasSavedAttemptRef.current) return;

    const attempt: StoredQuizAttempt = {
      id: `att_${Date.now()}`,
      createdAt: Date.now(),
      userId: currentUser.uid,
      subjectId,
      subjectName: selectedSubject?.name,
      topicName,
      difficulty,
      timeMode,
      examType,
      questionCount,
      quiz,
      answers,
    };

    const existing = readPreviousAttempts();
    const next = [attempt, ...existing].slice(0, MAX_PREVIOUS_ATTEMPTS);
    writePreviousAttempts(next);
    setPreviousAttempts(next);
    hasSavedAttemptRef.current = true;
  };

  const finishQuiz = async () => {
    setPhase('result');

    persistAttempt();

    try {
      if (scoreReport && scoreReport.accuracy >= 70) {
        await completeTopicInSyllabus(subjectId, topicName);
      }
    } catch {
      // ignore
    }
  };

  const openPreviousAttempt = (attempt: StoredQuizAttempt) => {
    setError(null);
    hasSavedAttemptRef.current = true;

    setSubjectId(attempt.subjectId);
    setTopicName(attempt.topicName);
    setDifficulty(attempt.difficulty);
    setTimeMode(attempt.timeMode);
    setExamType(attempt.examType);
    setQuestionCount(attempt.questionCount);

    setQuiz(attempt.quiz);
    setAnswers(attempt.answers || {});
    setMarked({});
    setHintsUsed({});
    setIndex(0);
    setQuizSecondsLeft(null);
    setQuestionSecondsLeft(null);
    setTimerPaused(false);
    setPhase('result');
  };

  const reattemptPreviousQuiz = (attempt: StoredQuizAttempt) => {
    if (!attempt?.quiz?.questions?.length) return;

    hasSavedAttemptRef.current = false;
    setError(null);

    setSubjectId(attempt.subjectId);
    setTopicName(attempt.topicName);
    setDifficulty(attempt.difficulty);
    setTimeMode(attempt.timeMode);
    setExamType(attempt.examType);
    setQuestionCount(attempt.questionCount);

    const payload = attempt.quiz;

    const resetAnswers: Record<string, AnswerValue> = {};
    const resetMarked: Record<string, boolean> = {};
    const resetHints: Record<string, number> = {};
    for (const q of payload.questions) {
      resetAnswers[q.id] = defaultAnswerFor(q);
      resetMarked[q.id] = false;
      resetHints[q.id] = 0;
    }

    setQuiz(payload);
    setAnswers(resetAnswers);
    setMarked(resetMarked);
    setHintsUsed(resetHints);
    setIndex(0);

    if (attempt.timeMode === 'Timed') {
      const perQuestion = 60;
      setQuestionSecondsLeft(perQuestion);
      setQuizSecondsLeft(perQuestion * payload.questions.length);
      setTimerPaused(false);
    } else {
      setQuestionSecondsLeft(null);
      setQuizSecondsLeft(null);
    }

    setPhase('quiz');
  };

  const restart = () => {
    setQuiz(null);
    setAnswers({});
    setMarked({});
    setHintsUsed({});
    setIndex(0);
    setQuizSecondsLeft(null);
    setQuestionSecondsLeft(null);
    setTimerPaused(false);
    setError(null);
    setPhase('setup');
  };

  const reattemptSameQuiz = () => {
    if (!quiz?.questions?.length) return;

    const resetAnswers: Record<string, AnswerValue> = {};
    const resetMarked: Record<string, boolean> = {};
    const resetHints: Record<string, number> = {};
    for (const q of quiz.questions) {
      resetAnswers[q.id] = defaultAnswerFor(q);
      resetMarked[q.id] = false;
      resetHints[q.id] = 0;
    }

    setAnswers(resetAnswers);
    setMarked(resetMarked);
    setHintsUsed(resetHints);
    setIndex(0);

    if (timeMode === 'Timed') {
      const perQuestion = 60;
      setQuestionSecondsLeft(perQuestion);
      setQuizSecondsLeft(perQuestion * quiz.questions.length);
      setTimerPaused(false);
    } else {
      setQuestionSecondsLeft(null);
      setQuizSecondsLeft(null);
    }

    setPhase('quiz');
  };

  const downloadAttempt = () => {
    if (!quiz) return;

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;
    const maxWidth = pageWidth - margin * 2;
    let y = 50;

    const ensureSpace = (needed: number) => {
      if (y + needed > pageHeight - margin) {
        doc.addPage();
        y = 50;
      }
    };

    const addHeading = (text: string) => {
      ensureSpace(28);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(20, 20, 20);
      doc.text(text, margin, y);
      y += 22;
    };

    const addLine = (text: string, fontSize = 11) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(fontSize);
      doc.setTextColor(40, 40, 40);
      const lines = doc.splitTextToSize(text, maxWidth);
      ensureSpace(lines.length * (fontSize + 4));
      doc.text(lines, margin, y);
      y += lines.length * (fontSize + 4);
    };

    const addBadge = (label: string, kind: 'correct' | 'wrong' | 'unanswered') => {
      ensureSpace(22);
      const paddingX = 8;
      const paddingY = 6;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      const textWidth = doc.getTextWidth(label);
      const w = textWidth + paddingX * 2;
      const h = 16 + paddingY;
      const x = margin;

      if (kind === 'correct') {
        doc.setFillColor(220, 252, 231);
        doc.setDrawColor(34, 197, 94);
        doc.setTextColor(21, 128, 61);
      } else if (kind === 'wrong') {
        doc.setFillColor(254, 226, 226);
        doc.setDrawColor(239, 68, 68);
        doc.setTextColor(185, 28, 28);
      } else {
        doc.setFillColor(243, 244, 246);
        doc.setDrawColor(156, 163, 175);
        doc.setTextColor(55, 65, 81);
      }

      doc.roundedRect(x, y - 12, w, h, 6, 6, 'FD');
      doc.text(label, x + paddingX, y);
      y += 20;
    };

    const title = quiz.title || 'Practice Quiz';
    addHeading(title);
    addLine(`Subject: ${selectedSubject?.name || quiz.subject || '-'}  |  Topic: ${topicName || quiz.topic || '-'}`);
    addLine(`Difficulty: ${difficulty}  |  Mode: ${timeMode}  |  Exam: ${examType}`);
    addLine(`Generated: ${new Date().toLocaleString()}`);

    if (scoreReport) {
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(1);
      doc.line(margin, y + 6, pageWidth - margin, y + 6);
      y += 18;
      addHeading('Score Summary');
      addLine(`Score: ${scoreReport.correct}/${scoreReport.total}  |  Accuracy: ${scoreReport.accuracy}%`);
    }

    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(1);
    doc.line(margin, y + 6, pageWidth - margin, y + 6);
    y += 18;

    addHeading('Review');

    quiz.questions.forEach((q, idx) => {
      ensureSpace(80);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(17, 24, 39);
      doc.text(`Q${idx + 1}. (${q.type})`, margin, y);
      y += 16;

      addLine(q.question, 11);

      const a = answers[q.id] ?? defaultAnswerFor(q);
      const result = evaluateAnswer(q, a);
      if (result === null) addBadge('Unanswered', 'unanswered');
      else if (result) addBadge('Correct', 'correct');
      else addBadge('Wrong', 'wrong');

      const userAnswerText =
        a.kind === 'mcq_single'
          ? typeof a.value === 'number'
            ? `Selected: ${String.fromCharCode(65 + a.value)}`
            : 'Selected: -'
          : a.kind === 'mcq_multi'
          ? `Selected: ${a.value.length ? a.value.map((i) => String.fromCharCode(65 + i)).join(', ') : '-'}`
          : a.kind === 'assertion_reason'
          ? `Selected: ${a.value || '-'}`
          : `Answer: ${a.value?.trim() ? a.value.trim() : '-'}`;
      addLine(`Your answer: ${userAnswerText}`, 10);

      let correctAnswerText = '';
      if (q.type === 'MCQ_SINGLE') {
        correctAnswerText = typeof q.correctOption === 'number' ? `Correct: ${String.fromCharCode(65 + q.correctOption)}` : '';
      } else if (q.type === 'MCQ_MULTI') {
        correctAnswerText = Array.isArray(q.correctOptions) && q.correctOptions.length
          ? `Correct: ${q.correctOptions.map((i) => String.fromCharCode(65 + i)).join(', ')}`
          : '';
      } else if (q.type === 'ASSERTION_REASON') {
        correctAnswerText = q.assertionReason?.correctOption ? `Correct: ${q.assertionReason.correctOption}` : '';
      } else if (q.type === 'FILL_BLANK') {
        correctAnswerText = q.fillBlank?.answer ? `Correct: ${q.fillBlank.answer}` : '';
      } else if (q.type === 'NUMERICAL') {
        correctAnswerText = typeof q.numerical?.finalAnswer === 'number'
          ? `Correct: ${q.numerical.finalAnswer}${q.numerical.unit ? ` ${q.numerical.unit}` : ''} (±${q.numerical.tolerance ?? 0})`
          : '';
      } else if (q.type === 'SHORT') {
        correctAnswerText = Array.isArray(q.expectedKeywords) && q.expectedKeywords.length
          ? `Expected keywords: ${q.expectedKeywords.join(', ')}`
          : '';
      }
      if (correctAnswerText) addLine(correctAnswerText, 10);

      if (q.explanation) {
        addLine(`Explanation: ${q.explanation}`, 10);
      }
      if (q.examTips) {
        addLine(`Exam Tip: ${q.examTips}`, 10);
      }
      if (q.shortcutTrick) {
        addLine(`Shortcut: ${q.shortcutTrick}`, 10);
      }

      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(1);
      doc.line(margin, y + 6, pageWidth - margin, y + 6);
      y += 18;
    });

    const filename = `${toSafeFilename(title)}_attempt_${Date.now()}.pdf`;
    doc.save(filename);
  };

  const renderAnswerInput = () => {
    if (!currentQuestion) return null;
    const a = answers[currentQuestion.id] ?? defaultAnswerFor(currentQuestion);

    if (currentQuestion.type === 'MCQ_SINGLE') {
      return (
        <div className="space-y-2">
          {(currentQuestion.options || []).map((opt, i) => (
            <button
              key={i}
              type="button"
              onClick={() =>
                setAnswers((prev) => ({
                  ...prev,
                  [currentQuestion.id]: { kind: 'mcq_single', value: i },
                }))
              }
              className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                a.kind === 'mcq_single' && a.value === i
                  ? 'border-purple-500 bg-purple-500/10 text-white'
                  : 'border-white/10 bg-white/5 text-gray-200 hover:bg-white/10'
              }`}
            >
              <span className="font-bold mr-2">{String.fromCharCode(65 + i)}.</span> {opt}
            </button>
          ))}
        </div>
      );
    }

    if (currentQuestion.type === 'MCQ_MULTI') {
      const selected = a.kind === 'mcq_multi' ? a.value : [];
      return (
        <div className="space-y-2">
          {(currentQuestion.options || []).map((opt, i) => {
            const isOn = selected.includes(i);
            return (
              <button
                key={i}
                type="button"
                onClick={() =>
                  setAnswers((prev) => {
                    const prevA = prev[currentQuestion.id];
                    const prevSel = prevA?.kind === 'mcq_multi' ? prevA.value : [];
                    const next = prevSel.includes(i) ? prevSel.filter((x) => x !== i) : [...prevSel, i];
                    return { ...prev, [currentQuestion.id]: { kind: 'mcq_multi', value: next } };
                  })
                }
                className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                  isOn
                    ? 'border-purple-500 bg-purple-500/10 text-white'
                    : 'border-white/10 bg-white/5 text-gray-200 hover:bg-white/10'
                }`}
              >
                <span className="font-bold mr-2">{isOn ? '☑' : '☐'}</span>
                <span className="font-bold mr-2">{String.fromCharCode(65 + i)}.</span> {opt}
              </button>
            );
          })}
          <div className="text-xs text-gray-400">Select all correct options.</div>
        </div>
      );
    }

    if (currentQuestion.type === 'ASSERTION_REASON') {
      const value = a.kind === 'assertion_reason' ? a.value : '';
      const opts = currentQuestion.assertionReason?.options || ['A', 'B', 'C', 'D'];
      return (
        <div className="space-y-2">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="text-gray-200 font-semibold">Assertion</div>
            <div className="text-gray-300 mt-1">{currentQuestion.assertionReason?.assertion}</div>
            <div className="text-gray-200 font-semibold mt-3">Reason</div>
            <div className="text-gray-300 mt-1">{currentQuestion.assertionReason?.reason}</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {opts.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setAnswers((prev) => ({ ...prev, [currentQuestion.id]: { kind: 'assertion_reason', value: o as any } }))}
                className={`px-4 py-3 rounded-xl border ${
                  value === o ? 'border-purple-500 bg-purple-500/10 text-white' : 'border-white/10 bg-white/5 text-gray-200 hover:bg-white/10'
                }`}
              >
                {o}
              </button>
            ))}
          </div>
        </div>
      );
    }

    const placeholder =
      currentQuestion.type === 'NUMERICAL'
        ? 'Enter numerical answer...'
        : currentQuestion.type === 'FILL_BLANK'
        ? 'Fill the blank...'
        : 'Type your answer...';

    return (
      <div className="space-y-2">
        {currentQuestion.type === 'FILL_BLANK' && currentQuestion.fillBlank?.textWithBlank ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-gray-200">
            {currentQuestion.fillBlank.textWithBlank}
          </div>
        ) : null}
        <textarea
          value={a.kind === 'text' ? a.value : ''}
          onChange={(e) =>
            setAnswers((prev) => ({
              ...prev,
              [currentQuestion.id]: { kind: 'text', value: e.target.value },
            }))
          }
          rows={4}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder={placeholder}
        />
      </div>
    );
  };

  if (phase === 'setup') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Practice & Quiz</h2>
        </div>

        {error ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-200 flex items-start gap-3">
            <AlertCircle size={18} className="mt-0.5" />
            <div className="text-sm">{error}</div>
          </div>
        ) : null}

        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm text-gray-300 font-semibold">Subject</div>
              <select
                value={subjectId}
                onChange={(e) => {
                  setSubjectId(e.target.value);
                  setTopicName('');
                }}
                className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-xl px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
              >
                {syllabusItems.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-gray-300 font-semibold">Topic</div>
              <select
                value={topicName}
                onChange={(e) => setTopicName(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-xl px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
              >
                {topicOptions.length === 0 ? (
                  <option value="" disabled>
                    No topics found in syllabus
                  </option>
                ) : (
                  topicOptions.map((t) => (
                    <option key={t.key} value={t.value}>
                      {t.label}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-gray-300 font-semibold">Difficulty</div>
              <div className="grid grid-cols-3 gap-2">
                {(['Easy', 'Medium', 'Hard'] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={`px-4 py-2 rounded-xl border text-sm font-semibold transition-colors ${
                      difficulty === d
                        ? 'border-purple-500 bg-purple-500/10 text-white'
                        : 'border-white/10 bg-white/5 text-gray-200 hover:bg-white/10'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-gray-300 font-semibold">Mode</div>
              <div className="grid grid-cols-2 gap-2">
                {(['Practice', 'Timed'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setTimeMode(m)}
                    className={`px-4 py-2 rounded-xl border text-sm font-semibold transition-colors ${
                      timeMode === m
                        ? 'border-purple-500 bg-purple-500/10 text-white'
                        : 'border-white/10 bg-white/5 text-gray-200 hover:bg-white/10'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-gray-300 font-semibold">Exam Type</div>
              <input
                value={examType}
                onChange={(e) => setExamType(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-xl px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-300 font-semibold">Questions</div>
                <div className="text-sm font-bold text-white">{questionCount}</div>
              </div>
              <input
                type="range"
                min={1}
                max={30}
                value={questionCount}
                onChange={(e) => setQuestionCount(Math.max(1, Math.min(30, Number(e.target.value) || 10)))}
                className="w-full"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm text-gray-300 font-semibold">Question Types</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {QUESTION_TYPE_OPTIONS.map((t) => {
                const on = questionTypes.includes(t.key);
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => toggleType(t.key)}
                    className={`px-4 py-2 rounded-xl border text-left ${
                      on ? 'border-purple-500 bg-purple-500/10 text-white' : 'border-white/10 bg-white/5 text-gray-200 hover:bg-white/10'
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={startQuiz}
              disabled={loading}
              className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Generating…' : 'Start Quiz'}
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-between gap-3 text-xs text-gray-300">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
                <div>Generating quiz… {generateSeconds}s</div>
              </div>
              <div className="text-gray-400">Don’t switch tabs for best speed.</div>
            </div>
          ) : null}
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-white font-bold">Previous Quizzes</div>
            <div className="text-xs text-gray-400">Showing latest {MAX_PREVIOUS_ATTEMPTS}</div>
          </div>

          {!currentUser?.uid ? (
            <div className="text-sm text-gray-400">Login to see your previous quizzes.</div>
          ) : previousAttempts.filter((a) => a.userId === currentUser.uid).length === 0 ? (
            <div className="text-sm text-gray-400">No previous quizzes yet.</div>
          ) : (
            <div className="space-y-3">
              {previousAttempts
                .filter((a) => a.userId === currentUser.uid)
                .slice(0, MAX_PREVIOUS_ATTEMPTS)
                .map((a) => (
                  <div key={a.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <div className="text-gray-200 font-semibold">
                          {a.subjectName || selectedSubject?.name || 'Subject'} • {a.topicName}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {new Date(a.createdAt).toLocaleString()} • {a.difficulty} • {a.timeMode} • {a.questionCount} Q
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => openPreviousAttempt(a)}
                          className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-200 hover:bg-white/10"
                        >
                          View Result
                        </button>
                        <button
                          type="button"
                          onClick={() => reattemptPreviousQuiz(a)}
                          className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-200 hover:bg-white/10"
                        >
                          Reattempt
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (phase === 'quiz') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-white">{quiz?.title || 'Practice Quiz'}</h2>
            <div className="text-sm text-gray-400">
              {selectedSubject?.name ? `${selectedSubject.name} • ` : ''}
              {topicName} • {difficulty} • {timeMode}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {timeMode === 'Timed' ? (
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-gray-200">
                <Clock size={16} />
                <span className="text-sm font-semibold">{quizSecondsLeft !== null ? formatTime(quizSecondsLeft) : '--:--'}</span>
              </div>
            ) : null}

            {timeMode === 'Timed' ? (
              <button
                type="button"
                onClick={() => setTimerPaused((p) => !p)}
                className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-gray-200 hover:bg-white/10"
              >
                {timerPaused ? <Play size={16} /> : <Pause size={16} />}
                <span className="text-sm font-semibold">{timerPaused ? 'Resume' : 'Pause'}</span>
              </button>
            ) : null}

            <button
              type="button"
              onClick={finishQuiz}
              className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
            >
              Submit
            </button>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-gray-300">
              Progress: <span className="text-white font-semibold">{progressPct}%</span>
            </div>
            <div className="text-xs text-gray-400">
              Answered:{' '}
              <span className="text-gray-200 font-semibold">{questions.filter((q) => isAnsweredValue(answers[q.id])).length}</span>/{questions.length}
            </div>
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500" style={{ width: `${progressPct}%` }} />
          </div>

          <div className="mt-4">
            <div className="text-xs text-gray-400 mb-2">Jump to question</div>
            <div className="grid grid-cols-8 md:grid-cols-12 gap-2">
              {questions.map((q, i) => {
                const isCurrent = i === index;
                const isMarked = !!marked[q.id];
                const isAnswered = isAnsweredValue(answers[q.id]);

                const cls = isCurrent
                  ? 'border-purple-500 bg-purple-500/15 text-white'
                  : isMarked
                  ? 'border-yellow-500/40 bg-yellow-500/10 text-yellow-100'
                  : isAnswered
                  ? 'border-green-500/40 bg-green-500/10 text-green-100'
                  : 'border-white/10 bg-white/5 text-gray-200 hover:bg-white/10';

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => jumpToQuestion(i)}
                    className={`h-9 rounded-xl border text-xs font-bold transition-colors ${cls}`}
                    title={isMarked ? 'Marked for review' : isAnswered ? 'Answered' : 'Unanswered'}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-400">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-green-400" /> Answered
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" /> Marked
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-white/30" /> Unanswered
              </div>
            </div>
          </div>
        </div>

        {error ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-200 flex items-start gap-3">
            <AlertCircle size={18} className="mt-0.5" />
            <div className="text-sm">{error}</div>
          </div>
        ) : null}

        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm text-gray-400">
              Question <span className="text-white font-semibold">{index + 1}</span> / {questions.length}
              {currentQuestion && marked[currentQuestion.id] ? <span className="ml-3 text-yellow-400">Marked</span> : null}
            </div>
            {timeMode === 'Timed' ? (
              <div className="text-sm text-gray-300">
                Per-question: <span className="font-semibold">{questionSecondsLeft !== null ? formatTime(questionSecondsLeft) : '--:--'}</span>
              </div>
            ) : null}
          </div>

          <div className="text-lg font-semibold text-white whitespace-pre-wrap">{currentQuestion?.question}</div>

          {renderAnswerInput()}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={useHint}
              className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-gray-200 hover:bg-white/10"
            >
              <Lightbulb size={16} /> Hint
            </button>

            <button
              type="button"
              onClick={toggleMark}
              className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-gray-200 hover:bg-white/10"
            >
              <Flag size={16} /> Mark for review
            </button>
          </div>

          {currentHintText ? (
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 text-purple-100 text-sm">
              {currentHintText}
            </div>
          ) : null}

          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={handlePrev}
              disabled={index === 0}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-200 hover:bg-white/10 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={index === questions.length - 1}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-200 hover:bg-white/10 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Results</h2>
          <div className="text-sm text-gray-400">{selectedSubject?.name ? `${selectedSubject.name} • ` : ''}{topicName}</div>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <button
            type="button"
            onClick={downloadAttempt}
            className="bg-white/5 border border-white/10 text-gray-200 px-4 py-2 rounded-xl hover:bg-white/10 transition-colors flex items-center gap-2"
          >
            <Download size={16} /> Download
          </button>
          <button
            type="button"
            onClick={reattemptSameQuiz}
            disabled={!quiz}
            className="bg-white/5 border border-white/10 text-gray-200 px-4 py-2 rounded-xl hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            Reattempt
          </button>
          <button
            type="button"
            onClick={restart}
            className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
          >
            New Quiz
          </button>
        </div>
      </div>

      <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6">
        <div className="text-gray-300">Score</div>
        <div className="text-4xl font-extrabold text-white mt-1">
          {scoreReport ? `${scoreReport.correct}/${scoreReport.total}` : '--'}
        </div>
        <div className="text-gray-400 mt-2">
          Accuracy: <span className="text-white font-semibold">{scoreReport ? `${scoreReport.accuracy}%` : '--'}</span>
        </div>
      </div>

      <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div className="text-white font-bold">Review</div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { key: 'all', label: 'All' },
                { key: 'correct', label: 'Correct' },
                { key: 'wrong', label: 'Wrong' },
                { key: 'unanswered', label: 'Unanswered' },
              ] as const
            ).map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setReviewFilter(f.key)}
                className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
                  reviewFilter === f.key
                    ? 'border-purple-500 bg-purple-500/10 text-white'
                    : 'border-white/10 bg-white/5 text-gray-200 hover:bg-white/10'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 space-y-4">
        <div className="space-y-4">
          {questions
            .filter((q) => {
              if (reviewFilter === 'all') return true;
              const a = answers[q.id] ?? defaultAnswerFor(q);
              const r = evaluateAnswer(q, a);
              if (reviewFilter === 'unanswered') return r === null;
              if (reviewFilter === 'correct') return r === true;
              if (reviewFilter === 'wrong') return r === false;
              return true;
            })
            .map((q, i) => (
            <div key={q.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="text-sm text-gray-400">Q{i + 1} • {q.type}</div>
              <div className="text-gray-200 font-semibold mt-1 whitespace-pre-wrap">{q.question}</div>

              {(() => {
                const a = answers[q.id] ?? defaultAnswerFor(q);
                const result = evaluateAnswer(q, a);
                const statusText = result === null ? 'Unanswered' : result ? 'Correct' : 'Wrong';
                const statusClass =
                  result === null
                    ? 'bg-gray-500/10 border-gray-500/20 text-gray-300'
                    : result
                    ? 'bg-green-500/10 border-green-500/20 text-green-200'
                    : 'bg-red-500/10 border-red-500/20 text-red-200';

                const chip = (
                  <div className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-semibold mt-3 ${statusClass}`}>
                    {statusText}
                  </div>
                );

                if (q.type === 'MCQ_SINGLE') {
                  const selected = a.kind === 'mcq_single' ? a.value : null;
                  const correctIndex = typeof q.correctOption === 'number' ? q.correctOption : null;
                  return (
                    <div className="mt-3 space-y-2">
                      {chip}
                      {(q.options || []).map((opt, idx) => {
                        const isCorrect = correctIndex === idx;
                        const isSelected = selected === idx;
                        const isWrongSelected = isSelected && !isCorrect;

                        const cls = isCorrect
                          ? 'border-green-500/40 bg-green-500/10 text-green-100'
                          : isWrongSelected
                          ? 'border-red-500/40 bg-red-500/10 text-red-100'
                          : 'border-white/10 bg-white/5 text-gray-200';

                        return (
                          <div key={idx} className={`px-4 py-3 rounded-xl border ${cls}`}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="whitespace-pre-wrap">
                                <span className="font-bold mr-2">{String.fromCharCode(65 + idx)}.</span> {opt}
                              </div>
                              <div className="text-xs font-bold">
                                {isCorrect ? 'Correct' : isWrongSelected ? 'Your answer' : ''}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                }

                if (q.type === 'MCQ_MULTI') {
                  const selected = a.kind === 'mcq_multi' ? a.value : [];
                  const correctArr = Array.isArray(q.correctOptions) ? q.correctOptions : [];

                  return (
                    <div className="mt-3 space-y-2">
                      {chip}
                      {(q.options || []).map((opt, idx) => {
                        const isCorrect = correctArr.includes(idx);
                        const isSelected = selected.includes(idx);
                        const isWrongSelected = isSelected && !isCorrect;

                        const cls = isCorrect
                          ? 'border-green-500/40 bg-green-500/10 text-green-100'
                          : isWrongSelected
                          ? 'border-red-500/40 bg-red-500/10 text-red-100'
                          : 'border-white/10 bg-white/5 text-gray-200';

                        return (
                          <div key={idx} className={`px-4 py-3 rounded-xl border ${cls}`}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="whitespace-pre-wrap">
                                <span className="font-bold mr-2">{String.fromCharCode(65 + idx)}.</span> {opt}
                              </div>
                              <div className="text-xs font-bold">
                                {isCorrect ? 'Correct' : isWrongSelected ? 'Your answer' : isSelected ? 'Selected' : ''}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div className="text-xs text-gray-400">Green = correct options. Red = your incorrect selections.</div>
                    </div>
                  );
                }

                if (q.type === 'ASSERTION_REASON') {
                  const selected = a.kind === 'assertion_reason' ? a.value : '';
                  const correctOpt = q.assertionReason?.correctOption;
                  const opts = q.assertionReason?.options || ['A', 'B', 'C', 'D'];

                  return (
                    <div className="mt-3 space-y-2">
                      {chip}
                      <div className="grid grid-cols-2 gap-2">
                        {opts.map((o) => {
                          const isCorrect = correctOpt === o;
                          const isSelected = selected === o;
                          const isWrongSelected = isSelected && !isCorrect;

                          const cls = isCorrect
                            ? 'border-green-500/40 bg-green-500/10 text-green-100'
                            : isWrongSelected
                            ? 'border-red-500/40 bg-red-500/10 text-red-100'
                            : 'border-white/10 bg-white/5 text-gray-200';

                          return (
                            <div key={o} className={`px-4 py-3 rounded-xl border ${cls}`}>
                              <div className="flex items-center justify-between">
                                <div className="font-bold">{o}</div>
                                <div className="text-xs font-bold">
                                  {isCorrect ? 'Correct' : isWrongSelected ? 'Your answer' : ''}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                const userText = a.kind === 'text' ? a.value : '';
                const textBoxClass =
                  result === null
                    ? 'border-white/10 bg-white/5 text-gray-200'
                    : result
                    ? 'border-green-500/40 bg-green-500/10 text-green-100'
                    : 'border-red-500/40 bg-red-500/10 text-red-100';

                const correctText =
                  q.type === 'FILL_BLANK'
                    ? q.fillBlank?.answer
                    : q.type === 'NUMERICAL'
                    ? typeof q.numerical?.finalAnswer === 'number'
                      ? `${q.numerical.finalAnswer}${q.numerical.unit ? ` ${q.numerical.unit}` : ''}`
                      : ''
                    : '';

                return (
                  <div className="mt-3 space-y-2">
                    {chip}
                    <div className={`px-4 py-3 rounded-xl border ${textBoxClass}`}>
                      <div className="text-xs font-semibold opacity-80">Your answer</div>
                      <div className="whitespace-pre-wrap mt-1">{userText?.trim() ? userText : '—'}</div>
                    </div>
                    {correctText ? (
                      <div className="px-4 py-3 rounded-xl border border-green-500/40 bg-green-500/10 text-green-100">
                        <div className="text-xs font-semibold opacity-80">Correct answer</div>
                        <div className="whitespace-pre-wrap mt-1">{correctText}</div>
                      </div>
                    ) : null}
                    {q.type === 'SHORT' && Array.isArray(q.expectedKeywords) && q.expectedKeywords.length ? (
                      <div className="text-xs text-gray-400">
                        Expected keywords: <span className="text-gray-200">{q.expectedKeywords.join(', ')}</span>
                      </div>
                    ) : null}
                  </div>
                );
              })()}

              {q.explanation ? (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setExpandedReview((prev) => ({ ...prev, [q.id]: !prev[q.id] }))}
                    className="flex items-center gap-2 text-xs font-semibold text-gray-200 hover:text-white"
                  >
                    {expandedReview[q.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {expandedReview[q.id] ? 'Hide explanation' : 'Show explanation'}
                  </button>
                  {expandedReview[q.id] ? (
                    <div className="text-gray-300 text-sm mt-2 whitespace-pre-wrap">{q.explanation}</div>
                  ) : null}
                </div>
              ) : null}
              {q.examTips ? (
                <div className="text-gray-400 text-xs mt-2 whitespace-pre-wrap">Exam Tip: {q.examTips}</div>
              ) : null}
              {q.shortcutTrick ? (
                <div className="text-gray-400 text-xs mt-1 whitespace-pre-wrap">Shortcut: {q.shortcutTrick}</div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {scoreReport && scoreReport.accuracy >= 70 ? (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-green-200 text-sm">
          Topic marked as completed in syllabus (accuracy ≥ 70%).
        </div>
      ) : (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-yellow-200 text-sm">
          Keep practicing. Complete topic will auto-update when accuracy is ≥ 70%.
        </div>
      )}
    </div>
  );
};

export default PracticeQuizContent;
