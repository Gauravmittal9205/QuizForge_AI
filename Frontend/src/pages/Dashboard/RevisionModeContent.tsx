import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Brain,
  CheckCircle,
  Clock,
  Loader2,
  Play,
  RefreshCw,
  RotateCcw,
  Shuffle,
  Timer,
} from 'lucide-react';
import { sendMessageToAIStream } from '../../services/aiTutorService';
import { generatePracticeQuiz } from '../../api/quizApi';

type Props = {
  syllabusItems?: any[];
  currentUser?: any;
};

type TopicRef = {
  key: string;
  subjectId: string;
  subjectName: string;
  topicName: string;
  chapterName?: string;
};

type StoredQuizAttempt = {
  id: string;
  createdAt: number;
  userId: string;
  subjectId: string;
  subjectName?: string;
  topicName: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  timeMode: 'Timed' | 'Practice';
  examType?: string;
  questionCount?: number;
  quiz: { questions: Array<{ id: string; type: string; correctOption?: number }> };
  answers: Record<string, any>;
};

type TopicStats = {
  total: number;
  correct: number;
  wrong: number;
  focusSeconds: number;
  accuracy: number;
  avgSecPerQ: number;
};

type RevisionProgress = {
  lastRevisedAt?: number;
  stage?: number;
  nextReviewAt?: number;
  reviseLater?: boolean;
};

type TopicPack = {
  formulas: string[];
  coreConcept: string;
  commonMistakes: string[];
  rapidQuestions: Array<{ q: string; a?: string }>;
};

type FlashCard = {
  id: string;
  front: string;
  back: string;
  stage: number;
  nextReviewAt: number;
};

type McqQuestion = {
  id: string;
  type: string;
  question: string;
  options?: string[];
  correctOption?: number;
  explanation?: string;
};

const PREVIOUS_ATTEMPTS_KEY = 'practice_quiz_previous_attempts_v1';
const REVISION_PROGRESS_KEY = 'revision_progress_v1';
const REVISION_TOPIC_PACK_KEY = 'revision_topic_pack_v1';
const REVISION_FLASHCARDS_KEY = 'revision_flashcards_v1';

const MAX_PREVIOUS_ATTEMPTS = 50;

const readPreviousAttempts = (): StoredQuizAttempt[] => {
  try {
    const raw = localStorage.getItem(PREVIOUS_ATTEMPTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredQuizAttempt[]) : [];
  } catch {
    return [];
  }
};

const writePreviousAttempts = (attempts: StoredQuizAttempt[]) => {
  try {
    localStorage.setItem(PREVIOUS_ATTEMPTS_KEY, JSON.stringify(attempts.slice(0, MAX_PREVIOUS_ATTEMPTS)));
  } catch {
    // ignore
  }
};

const dayMs = 24 * 60 * 60 * 1000;
const stageIntervalsDays = [1, 3, 7, 21];

const parseTopicsFromDescription = (desc: string) => {
  const topics: string[] = [];
  const lines = desc.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.match(/^[-•*]\s*\[[ x]\]/i)) continue;
    const text = trimmed.replace(/^[-•*]\s*\[[ x]\]\s*/i, '').trim();
    if (text) topics.push(text);
  }
  return topics;
};

const readLocalJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const writeLocalJson = (key: string, value: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
};

const formatDate = (ts: number | null | undefined) => {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
};

const calcNextReviewAt = (stage: number) => {
  const s = Math.max(0, Math.min(stageIntervalsDays.length - 1, stage));
  return Date.now() + stageIntervalsDays[s] * dayMs;
};

const computeNextStage = (prevStage: number, rating: 'easy' | 'medium' | 'hard') => {
  if (rating === 'hard') return 0;
  if (rating === 'medium') return Math.max(1, Math.min(2, prevStage || 0));
  return Math.min(stageIntervalsDays.length - 1, (prevStage || 0) + 1);
};

const formatTimeLeft = (s: number) => {
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
};

const stripMarkdownCodeFences = (text: string) => {
  const trimmed = String(text || '').trim();
  const m = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (m?.[1]) return m[1].trim();
  return trimmed;
};

const extractFirstJsonValue = (text: string) => {
  const src = stripMarkdownCodeFences(text);
  const firstObj = src.indexOf('{');
  const firstArr = src.indexOf('[');
  const start =
    firstObj === -1 ? firstArr : firstArr === -1 ? firstObj : Math.min(firstObj, firstArr);
  if (start === -1) return null;

  const open = src[start];
  const close = open === '{' ? '}' : ']';

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < src.length; i++) {
    const ch = src[i];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
        continue;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === open) {
      depth += 1;
      continue;
    }
    if (ch === close) {
      depth -= 1;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }

  return null;
};

const safeJsonParse = <T,>(text: string): T | null => {
  const raw = stripMarkdownCodeFences(text);
  try {
    return JSON.parse(raw) as T;
  } catch {
    const extracted = extractFirstJsonValue(raw);
    if (!extracted) return null;
    try {
      return JSON.parse(extracted) as T;
    } catch {
      return null;
    }
  }
};

const RevisionModeContent: React.FC<Props> = ({ syllabusItems = [], currentUser }) => {
  const userId = currentUser?.uid ? String(currentUser.uid) : '';

  const [timeAvailableMin, setTimeAvailableMin] = useState<10 | 20 | 30>(20);
  const [weakOnly, setWeakOnly] = useState(true);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');

  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionQueue, setSessionQueue] = useState<string[]>([]);

  const [workspaceVisible, setWorkspaceVisible] = useState(false);
  const workspaceRef = useRef<HTMLDivElement | null>(null);

  const [activeTopicKey, setActiveTopicKey] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, RevisionProgress>>(() =>
    readLocalJson(REVISION_PROGRESS_KEY, {} as any)
  );
  const [topicPacks, setTopicPacks] = useState<Record<string, TopicPack>>(() =>
    readLocalJson(REVISION_TOPIC_PACK_KEY, {} as any)
  );

  const [packLoading, setPackLoading] = useState(false);
  const [packError, setPackError] = useState<string | null>(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);
  const [explainText, setExplainText] = useState<string>('');

  const [activeTab, setActiveTab] = useState<'quick' | 'flash' | 'mcq'>('quick');

  const [flashcards, setFlashcards] = useState<Record<string, FlashCard[]>>(() =>
    readLocalJson(REVISION_FLASHCARDS_KEY, {} as any)
  );
  const [flashMode, setFlashMode] = useState<'normal' | 'shuffle' | 'spaced'>('spaced');
  const [flashIndex, setFlashIndex] = useState(0);
  const [flashFlipped, setFlashFlipped] = useState(false);
  const [flashGenerating, setFlashGenerating] = useState(false);
  const [flashError, setFlashError] = useState<string | null>(null);

  const [mcqPerQSec, setMcqPerQSec] = useState<5 | 8 | 10>(8);
  const [mcqLoading, setMcqLoading] = useState(false);
  const [mcqError, setMcqError] = useState<string | null>(null);
  const [mcqQuestions, setMcqQuestions] = useState<McqQuestion[]>([]);
  const [mcqIndex, setMcqIndex] = useState(0);
  const [mcqTimer, setMcqTimer] = useState(0);
  const [mcqSelected, setMcqSelected] = useState<number | null>(null);
  const [mcqRevealed, setMcqRevealed] = useState(false);
  const [mcqCorrectCount, setMcqCorrectCount] = useState(0);
  const [mcqAnswers, setMcqAnswers] = useState<Record<string, { kind: 'mcq_single'; value: number | null }>>({});

  const [attemptsNonce, setAttemptsNonce] = useState(0);

  const [sessionBaseline, setSessionBaseline] = useState<Record<string, number>>({});
  const [sessionSummaryOpen, setSessionSummaryOpen] = useState(false);

  useEffect(() => writeLocalJson(REVISION_PROGRESS_KEY, progress), [progress]);
  useEffect(() => writeLocalJson(REVISION_TOPIC_PACK_KEY, topicPacks), [topicPacks]);
  useEffect(() => writeLocalJson(REVISION_FLASHCARDS_KEY, flashcards), [flashcards]);

  const subjects = useMemo(() => {
    const subs = Array.isArray(syllabusItems) ? syllabusItems : [];
    return subs.map((s) => ({
      id: String(s?.id || s?._id || s?.name || 'unknown'),
      name: String(s?.name || 'Unknown'),
    }));
  }, [syllabusItems]);

  const topics: TopicRef[] = useMemo(() => {
    const subs = Array.isArray(syllabusItems) ? syllabusItems : [];
    const out: TopicRef[] = [];

    for (const s of subs) {
      const subjectId = String(s?.id || s?._id || s?.name || 'unknown');
      const subjectName = String(s?.name || 'Unknown');
      const chapters = Array.isArray(s?.chapters) ? s.chapters : [];

      for (const c of chapters) {
        const chapterName = String(c?.name || 'Chapter');
        const desc = typeof c?.description === 'string' ? c.description : '';
        const extracted = desc ? parseTopicsFromDescription(desc) : [];

        if (extracted.length > 0) {
          for (const t of extracted) {
            out.push({ key: `${subjectId}__${t}`, subjectId, subjectName, topicName: t, chapterName });
          }
        } else {
          out.push({ key: `${subjectId}__${chapterName}`, subjectId, subjectName, topicName: chapterName, chapterName });
        }
      }
    }

    const dedup = new Map<string, TopicRef>();
    for (const t of out) if (!dedup.has(t.key)) dedup.set(t.key, t);
    return Array.from(dedup.values());
  }, [syllabusItems]);

  const attempts: StoredQuizAttempt[] = useMemo(() => {
    try {
      const arr: StoredQuizAttempt[] = readPreviousAttempts();
      const mine = userId ? arr.filter((a) => a?.userId === userId) : [];
      return mine.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } catch {
      return [];
    }
  }, [userId, attemptsNonce]);

  const topicStats: Record<string, TopicStats> = useMemo(() => {
    const perQuestionSecDefault = 45;
    const perQuestionSecTimed = 60;
    const map: Record<string, TopicStats> = {};

    for (const a of attempts) {
      const subjectKey = String(a.subjectId || a.subjectName || 'unknown');
      const topicName = String(a.topicName || 'Unknown Topic');
      const key = `${subjectKey}__${topicName}`;
      const qs = Array.isArray(a?.quiz?.questions) ? a.quiz.questions : [];
      const perQ = a.timeMode === 'Timed' ? perQuestionSecTimed : perQuestionSecDefault;
      const focusSeconds = qs.length * perQ;

      if (!map[key]) map[key] = { total: 0, correct: 0, wrong: 0, focusSeconds: 0, accuracy: 0, avgSecPerQ: 0 };
      map[key].focusSeconds += focusSeconds;

      for (const q of qs) {
        const ans = a.answers?.[q.id];
        const answered = ans && (typeof ans.value !== 'undefined' || typeof ans === 'string' ? true : true);
        if (!answered) continue;
        map[key].total += 1;

        if (q.type === 'MCQ_SINGLE') {
          const userVal = typeof ans?.value === 'number' ? ans.value : ans;
          if (typeof q.correctOption === 'number' && userVal === q.correctOption) map[key].correct += 1;
          else map[key].wrong += 1;
        } else {
          map[key].wrong += 1;
        }
      }
    }

    for (const k of Object.keys(map)) {
      const t = map[k];
      t.accuracy = t.total ? Math.round((t.correct / t.total) * 100) : 0;
      t.avgSecPerQ = t.total ? Math.round(t.focusSeconds / t.total) : 0;
    }

    return map;
  }, [attempts]);

  const weakTopicKeys = useMemo(() => {
    return topics
      .map((t) => {
        const s = topicStats[t.key];
        const total = s?.total || 0;
        const acc = s?.accuracy ?? 0;
        const slow = (s?.avgSecPerQ ?? 0) > 60;
        const wrong = (s?.wrong ?? 0) >= 3;
        const weak = (total >= 5 && acc < 60) || (total >= 5 && slow) || wrong;
        const score = (100 - acc) + (slow ? 15 : 0) + (wrong ? 20 : 0);
        return { key: t.key, weak, score };
      })
      .filter((x) => x.weak)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.key);
  }, [topics, topicStats]);

  const filteredWeakTopicKeys = useMemo(() => {
    let weakKeys = weakTopicKeys;
    if (selectedSubjectId !== 'all') {
      weakKeys = weakKeys.filter((key) => {
        const topic = topics.find((t) => t.key === key);
        return topic?.subjectId === selectedSubjectId;
      });
    }
    return weakKeys;
  }, [weakTopicKeys, selectedSubjectId, topics]);

  const pendingWeakCount = filteredWeakTopicKeys.length;
  const todayGoal = useMemo(() => {
    const topicsCount = timeAvailableMin === 10 ? 2 : timeAvailableMin === 20 ? 3 : 4;
    const mcqs = timeAvailableMin === 10 ? 5 : timeAvailableMin === 20 ? 8 : 12;
    return { topicsCount, mcqs };
  }, [timeAvailableMin]);

  const lastRevisedDate = useMemo(() => {
    const all = Object.values(progress);
    const max = all.reduce((m, p) => Math.max(m, p.lastRevisedAt || 0), 0);
    return max || null;
  }, [progress]);

  const visibleTopics = useMemo(() => {
    let base = weakOnly ? topics.filter((t) => filteredWeakTopicKeys.includes(t.key)) : topics;
    
    // Filter by selected subject
    if (selectedSubjectId !== 'all') {
      base = base.filter((t) => t.subjectId === selectedSubjectId);
    }
    
    if (!sessionStarted) return base;
    const set = new Set(sessionQueue);
    return base.filter((t) => set.has(t.key));
  }, [topics, weakOnly, filteredWeakTopicKeys, sessionStarted, sessionQueue, selectedSubjectId]);

  useEffect(() => {
    if (!activeTopicKey && visibleTopics.length > 0) setActiveTopicKey(visibleTopics[0].key);
  }, [activeTopicKey, visibleTopics]);

  const activeTopic = useMemo(() => {
    if (!activeTopicKey) return null;
    return topics.find((t) => t.key === activeTopicKey) || null;
  }, [activeTopicKey, topics]);

  const startSmartRevision = () => {
    const picked = filteredWeakTopicKeys.slice(0, todayGoal.topicsCount);
    setSessionQueue(picked);
    setSessionStarted(true);
    setWorkspaceVisible(true);
    setSessionSummaryOpen(false);
    setSessionBaseline(
      picked.reduce<Record<string, number>>((acc, k) => {
        acc[k] = topicStats[k]?.accuracy ?? 0;
        return acc;
      }, {})
    );
    if (picked[0]) setActiveTopicKey(picked[0]);
  };

  const endSession = () => {
    setSessionStarted(false);
    setSessionQueue([]);
    setWorkspaceVisible(true);
    setSessionSummaryOpen(true);
  };

  useEffect(() => {
    if (!sessionStarted) return;
    workspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [sessionStarted]);

  useEffect(() => {
    if (!sessionSummaryOpen) return;
    workspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [sessionSummaryOpen]);

  const markTopicRevised = (topicKey: string, rating: 'easy' | 'medium' | 'hard' = 'medium') => {
    const prev = progress[topicKey] || {};
    const prevStage = typeof prev.stage === 'number' ? prev.stage : 0;
    const stage = computeNextStage(prevStage, rating);
    setProgress((p) => ({
      ...p,
      [topicKey]: {
        ...prev,
        reviseLater: false,
        stage,
        lastRevisedAt: Date.now(),
        nextReviewAt: calcNextReviewAt(stage),
      },
    }));
  };

  const markReviseLater = (topicKey: string) => {
    const prev = progress[topicKey] || {};
    setProgress((p) => ({ ...p, [topicKey]: { ...prev, reviseLater: true } }));
  };

  const generateTopicPack = async (topic: TopicRef) => {
    if (topicPacks[topic.key]) return;
    setPackLoading(true);
    setPackError(null);

    try {
      const prompt = `Return ONLY a valid JSON object (no markdown, no extra text).\n\nSubject: ${topic.subjectName}\nTopic: ${topic.topicName}\n\nSchema:\n{\n  \"formulas\": [\"...\"],\n  \"coreConcept\": \"2-3 lines\",\n  \"commonMistakes\": [\"...\"],\n  \"rapidQuestions\": [ { \"q\": \"...\", \"a\": \"...\" } ]\n}\n\nRules:\n- rapidQuestions length: 2 to 3\n- Keep coreConcept short and exam-focused`;

      const { response } = await sendMessageToAIStream(prompt, { model: 'llama3' });
      const parsed = safeJsonParse<TopicPack>(response);
      if (!parsed || !Array.isArray(parsed.formulas) || typeof parsed.coreConcept !== 'string') {
        throw new Error('AI response format invalid.');
      }

      setTopicPacks((m) => ({
        ...m,
        [topic.key]: {
          formulas: Array.isArray(parsed.formulas) ? parsed.formulas.filter(Boolean) : [],
          coreConcept: parsed.coreConcept || '',
          commonMistakes: Array.isArray(parsed.commonMistakes) ? parsed.commonMistakes.filter(Boolean) : [],
          rapidQuestions: Array.isArray(parsed.rapidQuestions) ? parsed.rapidQuestions.slice(0, 3) : [],
        },
      }));
    } catch (e: any) {
      setPackError(e?.message || 'Failed to generate quick revision notes.');
    } finally {
      setPackLoading(false);
    }
  };

  const getFlashDeck = (topicKey: string | null) => {
    if (!topicKey) return [] as FlashCard[];
    const deck = Array.isArray(flashcards[topicKey]) ? flashcards[topicKey] : [];

    if (flashMode === 'normal') return deck;
    if (flashMode === 'shuffle') {
      const shuffled = [...deck];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }

    const now = Date.now();
    const due = deck.filter((c) => (c?.nextReviewAt || 0) <= now);
    if (due.length > 0) return due;
    return deck.sort((a, b) => (a.nextReviewAt || 0) - (b.nextReviewAt || 0));
  };

  const generateFlashcards = async (topic: TopicRef) => {
    setFlashGenerating(true);
    setFlashError(null);
    try {
      const prompt = `Return ONLY a valid JSON array (no markdown, no extra text).\n\nSubject: ${topic.subjectName}\nTopic: ${topic.topicName}\n\nSchema: [ { \"front\": \"...\", \"back\": \"...\" } ]\nRules:\n- Create 10-14 high-impact flashcards\n- front: definition/formula/one-liner question\n- back: short answer`;
      const { response } = await sendMessageToAIStream(prompt, { model: 'llama3' });
      const parsed = safeJsonParse<any>(response);
      if (!Array.isArray(parsed)) throw new Error('AI response format invalid.');

      const now = Date.now();
      const cards: FlashCard[] = parsed
        .filter((x) => x && typeof x.front === 'string' && typeof x.back === 'string')
        .slice(0, 16)
        .map((x, i) => ({
          id: `${topic.key}__${now}__${i}`,
          front: String(x.front).trim(),
          back: String(x.back).trim(),
          stage: 0,
          nextReviewAt: now,
        }));

      setFlashcards((m) => ({ ...m, [topic.key]: cards }));
      setFlashIndex(0);
      setFlashFlipped(false);
    } catch (e: any) {
      setFlashError(e?.message || 'Failed to generate flashcards.');
    } finally {
      setFlashGenerating(false);
    }
  };

  const rateFlashcard = (topicKey: string, cardId: string, rating: 'easy' | 'medium' | 'hard') => {
    setFlashcards((m) => {
      const deck = Array.isArray(m[topicKey]) ? [...m[topicKey]] : [];
      const idx = deck.findIndex((c) => c.id === cardId);
      if (idx === -1) return m;
      const prev = deck[idx];
      const stage = computeNextStage(prev.stage || 0, rating);
      deck[idx] = { ...prev, stage, nextReviewAt: calcNextReviewAt(stage) };
      return { ...m, [topicKey]: deck };
    });
    setFlashFlipped(false);
    setFlashIndex((i) => i + 1);
  };

  const startRapidFire = async (topic: TopicRef) => {
    setMcqLoading(true);
    setMcqError(null);
    setMcqQuestions([]);
    setMcqIndex(0);
    setMcqTimer(0);
    setMcqSelected(null);
    setMcqRevealed(false);
    setMcqCorrectCount(0);
    setMcqAnswers({});

    try {
      const res = await generatePracticeQuiz({
        userId: userId || 'anonymous',
        subjectId: topic.subjectId,
        subjectName: topic.subjectName,
        topic: topic.topicName,
        difficulty: 'Medium',
        timeMode: 'Timed',
        questionCount: todayGoal.mcqs,
        examType: 'Rapid Fire',
        questionTypes: ['MCQ_SINGLE'],
      } as any);

      const qs = Array.isArray(res?.quiz?.questions) ? (res.quiz.questions as McqQuestion[]) : [];
      const filtered = qs.filter((q) => q?.type === 'MCQ_SINGLE' && Array.isArray(q.options) && q.options.length >= 2);
      if (filtered.length === 0) throw new Error('No MCQs generated.');

      setMcqQuestions(filtered);
      setMcqIndex(0);
      setMcqSelected(null);
      setMcqRevealed(false);
      setMcqTimer(mcqPerQSec);
      setActiveTab('mcq');
    } catch (e: any) {
      setMcqError(e?.message || 'Failed to start rapid fire MCQs.');
    } finally {
      setMcqLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'mcq') return;
    if (!mcqQuestions.length) return;
    if (mcqRevealed) return;

    setMcqTimer(mcqPerQSec);
    const id = window.setInterval(() => {
      setMcqTimer((t) => {
        if (t <= 1) {
          window.clearInterval(id);
          setMcqAnswers((m) => {
            const q = mcqQuestions[mcqIndex];
            if (!q?.id) return m;
            if (m[q.id]) return m;
            return { ...m, [q.id]: { kind: 'mcq_single', value: null } };
          });
          setMcqRevealed(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [activeTab, mcqIndex, mcqPerQSec, mcqQuestions.length, mcqRevealed]);

  const submitMcq = () => {
    if (mcqRevealed) return;
    const q = mcqQuestions[mcqIndex];
    const ok = typeof q?.correctOption === 'number' && mcqSelected === q.correctOption;
    if (ok) setMcqCorrectCount((c) => c + 1);
    if (q?.id) {
      setMcqAnswers((m) => ({
        ...m,
        [q.id]: { kind: 'mcq_single', value: typeof mcqSelected === 'number' ? mcqSelected : null },
      }));
    }
    setMcqRevealed(true);
  };

  const nextMcq = () => {
    setMcqSelected(null);
    setMcqRevealed(false);
    setMcqIndex((i) => i + 1);
  };

  useEffect(() => {
    if (activeTab !== 'mcq') return;
    if (!mcqQuestions.length) return;
    if (mcqIndex < mcqQuestions.length) return;
    if (!activeTopicKey) return;

    const ratio = Math.round((mcqCorrectCount / Math.max(1, mcqQuestions.length)) * 100);
    const rating: 'easy' | 'medium' | 'hard' = ratio >= 80 ? 'easy' : ratio >= 55 ? 'medium' : 'hard';
    markTopicRevised(activeTopicKey, rating);

    try {
      const topic = topics.find((t) => t.key === activeTopicKey);
      if (!topic) return;

      const now = Date.now();
      const attempt: StoredQuizAttempt = {
        id: `${activeTopicKey}__rapid__${now}`,
        createdAt: now,
        userId: userId || 'anonymous',
        subjectId: topic.subjectId,
        subjectName: topic.subjectName,
        topicName: topic.topicName,
        difficulty: 'Medium',
        timeMode: 'Timed',
        examType: 'Rapid Fire',
        questionCount: mcqQuestions.length,
        quiz: { questions: mcqQuestions.map((q) => ({ id: q.id, type: q.type, correctOption: q.correctOption })) },
        answers: mcqAnswers,
      };

      const existing = readPreviousAttempts();
      const next = [attempt, ...existing].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      writePreviousAttempts(next);
      setAttemptsNonce((n) => n + 1);
    } catch {
      // ignore persistence errors
    }
  }, [activeTab, mcqIndex, mcqQuestions.length, mcqCorrectCount, activeTopicKey]);

  const explainQuickly = async (topic: TopicRef) => {
    setExplainLoading(true);
    setExplainError(null);
    setExplainText('');
    try {
      const prompt = `Explain this topic as if in 60 seconds. Keep it short and exam-focused.\n\nSubject: ${topic.subjectName}\nTopic: ${topic.topicName}`;
      const { response } = await sendMessageToAIStream(prompt, { model: 'llama3' });
      setExplainText(response.trim());
      const synth = window.speechSynthesis;
      if (synth) {
        synth.cancel();
        synth.speak(new SpeechSynthesisUtterance(response.trim()));
      }
    } catch (e: any) {
      setExplainError(e?.message || 'Failed to explain.');
    } finally {
      setExplainLoading(false);
    }
  };

  const pack = activeTopicKey ? topicPacks[activeTopicKey] : null;
  const flashDeck = getFlashDeck(activeTopicKey);
  const flashCard = flashDeck[flashIndex % Math.max(1, flashDeck.length)] || null;
  const mcq = mcqQuestions[mcqIndex] || null;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">Smart Revision</h2>
            <p className="text-sm text-gray-400 mt-1">Focus where you can boost score fastest.</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="px-3 py-2 text-xs font-bold rounded-lg border border-white/10 bg-white/5 text-gray-200 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <option value="all">All Subjects</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setWeakOnly((v) => !v)}
              className={`px-3 py-2 text-xs font-bold rounded-lg border transition-colors ${
                weakOnly
                  ? 'bg-red-500/15 border-red-500/40 text-red-200'
                  : 'bg-white/5 border-white/10 text-gray-200 hover:bg-white/10'
              }`}
            >
              Weak Topics Only
            </button>
            {sessionStarted ? (
              <button
                onClick={endSession}
                className="px-3 py-2 text-xs font-bold rounded-lg bg-white/10 hover:bg-white/15 text-white border border-white/10"
              >
                End Session
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-4">
            <div className="text-xs text-gray-500 flex items-center gap-2">
              <Clock size={14} /> Time available
            </div>
            <div className="mt-2 flex items-center gap-2">
              {[10, 20, 30].map((m) => (
                <button
                  key={m}
                  onClick={() => setTimeAvailableMin(m as any)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-colors ${
                    timeAvailableMin === m
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 border-transparent text-white'
                      : 'bg-white/5 border-white/10 text-gray-200 hover:bg-white/10'
                  }`}
                >
                  {m}m
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-4">
            <div className="text-xs text-gray-500">Today’s goal</div>
            <div className="text-white font-extrabold text-lg mt-1">Revise: {todayGoal.topicsCount} topics</div>
            <div className="text-gray-300 text-sm">+ {todayGoal.mcqs} rapid MCQs</div>
          </div>

          <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-4">
            <div className="text-xs text-gray-500">Pending weak topics</div>
            <div className="text-3xl font-extrabold text-white mt-1">{pendingWeakCount}</div>
            {pendingWeakCount > 0 ? (
              <div className="text-xs text-red-300 mt-2">Focus here to boost score fastest</div>
            ) : (
              <div className="text-xs text-gray-400 mt-2">No critical weaknesses detected</div>
            )}
          </div>

          <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-4">
            <div className="text-xs text-gray-500">Last revised</div>
            <div className="text-3xl font-extrabold text-white mt-1">{formatDate(lastRevisedDate)}</div>
            <div className="text-xs text-gray-400 mt-2">Spaced review stages: 1d • 3d • 7d • 21d</div>
          </div>
        </div>

        <div className="mt-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="text-sm text-gray-300">
            <div className="font-bold text-white">You have {timeAvailableMin} minutes</div>
            <div className="text-gray-400">Revise: {todayGoal.topicsCount} weak topics + {todayGoal.mcqs} MCQs</div>
          </div>
          <button
            onClick={startSmartRevision}
            disabled={pendingWeakCount === 0}
            className="inline-flex items-center px-5 py-3 rounded-xl font-extrabold text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Play size={18} className="mr-2" /> Start Smart Revision
          </button>
        </div>
      </div>

      {!workspaceVisible && !sessionSummaryOpen ? (
        <div className="bg-gray-800/30 border border-gray-700 rounded-2xl p-6 text-gray-300">
          Click <span className="font-bold text-white">Start Smart Revision</span> to begin.
        </div>
      ) : null}

      <div ref={workspaceRef} />

      {sessionSummaryOpen ? (
        <div className="bg-gray-800/30 border border-gray-700 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-extrabold text-lg">Revision Completion Feedback</div>
              <div className="text-xs text-gray-400 mt-1">Topics revised + estimated accuracy change</div>
            </div>
            <button
              onClick={() => {
                setSessionSummaryOpen(false);
                setWorkspaceVisible(false);
              }}
              className="px-3 py-2 text-xs font-bold rounded-lg bg-white/10 hover:bg-white/15 text-white border border-white/10"
            >
              Close
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            {(Object.keys(sessionBaseline) || []).slice(0, 6).map((k) => {
              const t = topics.find((x) => x.key === k);
              const before = sessionBaseline[k] ?? 0;
              const after = topicStats[k]?.accuracy ?? before;
              return (
                <div key={k} className="bg-gray-900/30 border border-gray-800 rounded-xl p-4">
                  <div className="text-white font-bold truncate">{t?.topicName || 'Topic'}</div>
                  <div className="text-xs text-gray-400 truncate">{t?.subjectName || ''}</div>
                  <div className="mt-2 text-sm text-gray-200">{before}% {'->'} {after}%</div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {workspaceVisible && !sessionSummaryOpen ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gray-800/30 border border-gray-700 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <div className="text-white font-bold">Topics</div>
            <div className="text-xs text-gray-400">{visibleTopics.length} shown</div>
          </div>
          <div className="max-h-[520px] overflow-auto">
            {visibleTopics.length === 0 ? (
              <div className="p-6 text-sm text-gray-400">No topics to show.</div>
            ) : (
              visibleTopics.map((t) => {
                const stats = topicStats[t.key];
                const acc = stats?.accuracy ?? 0;
                const total = stats?.total ?? 0;
                const p = progress[t.key];
                const isActive = activeTopicKey === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => {
                      setActiveTopicKey(t.key);
                      setPackError(null);
                      setExplainError(null);
                      setExplainText('');
                    }}
                    className={`w-full text-left p-4 border-b border-gray-800 hover:bg-white/5 transition-colors ${
                      isActive ? 'bg-gradient-to-r from-purple-500/15 to-blue-500/10' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-white font-bold truncate">{t.topicName}</div>
                        <div className="text-[11px] text-gray-400 truncate">
                          {t.subjectName}{t.chapterName ? ` • ${t.chapterName}` : ''}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div
                          className={`text-xs font-extrabold ${
                            total >= 5 && acc < 60 ? 'text-red-300' : total >= 5 && acc < 75 ? 'text-amber-300' : 'text-green-300'
                          }`}
                        >
                          {total >= 3 ? `${acc}%` : '—'}
                        </div>
                        <div className="text-[10px] text-gray-500">{total} Qs</div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="text-[10px] text-gray-500">Last revised: {formatDate(p?.lastRevisedAt)}</div>
                      {p?.reviseLater ? (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-gray-200">Later</span>
                      ) : null}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-gray-800/30 border border-gray-700 rounded-2xl overflow-hidden">
          {!activeTopic ? (
            <div className="p-6 text-gray-300">Select a topic to start.</div>
          ) : (
            <div>
              <div className="p-5 border-b border-gray-700">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-white text-xl font-extrabold truncate">{activeTopic.topicName}</div>
                    <div className="text-xs text-gray-400 mt-1">{activeTopic.subjectName}</div>
                    <div className="mt-2 text-xs text-gray-300">
                      Next review: {formatDate(progress[activeTopic.key]?.nextReviewAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => markTopicRevised(activeTopic.key, 'medium')}
                      className="px-3 py-2 text-xs font-bold rounded-lg bg-green-500/15 hover:bg-green-500/20 text-green-200 border border-green-500/30"
                    >
                      <CheckCircle size={16} className="inline mr-2" /> Mark as revised
                    </button>
                    <button
                      onClick={() => markReviseLater(activeTopic.key)}
                      className="px-3 py-2 text-xs font-bold rounded-lg bg-white/10 hover:bg-white/15 text-white border border-white/10"
                    >
                      <RotateCcw size={16} className="inline mr-2" /> Revise later
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setActiveTab('quick')}
                    className={`px-3 py-2 text-xs font-bold rounded-lg border transition-colors ${
                      activeTab === 'quick'
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 border-transparent text-white'
                        : 'bg-white/5 border-white/10 text-gray-200 hover:bg-white/10'
                    }`}
                  >
                    Quick Revision
                  </button>
                  <button
                    onClick={() => setActiveTab('flash')}
                    className={`px-3 py-2 text-xs font-bold rounded-lg border transition-colors ${
                      activeTab === 'flash'
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 border-transparent text-white'
                        : 'bg-white/5 border-white/10 text-gray-200 hover:bg-white/10'
                    }`}
                  >
                    Flashcards
                  </button>
                  <button
                    onClick={() => setActiveTab('mcq')}
                    className={`px-3 py-2 text-xs font-bold rounded-lg border transition-colors ${
                      activeTab === 'mcq'
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 border-transparent text-white'
                        : 'bg-white/5 border-white/10 text-gray-200 hover:bg-white/10'
                    }`}
                  >
                    Rapid Fire MCQs
                  </button>

                  <button
                    onClick={() => generateTopicPack(activeTopic)}
                    className="px-3 py-2 text-xs font-bold rounded-lg bg-white/10 hover:bg-white/15 text-white border border-white/10"
                  >
                    <RefreshCw size={16} className="inline mr-2" /> Generate quick revision
                  </button>
                  <button
                    onClick={() => explainQuickly(activeTopic)}
                    className="px-3 py-2 text-xs font-bold rounded-lg bg-white/10 hover:bg-white/15 text-white border border-white/10"
                  >
                    <Brain size={16} className="inline mr-2" /> Explain Quickly
                  </button>
                  <div className="ml-auto" />
                  {sessionStarted ? (
                    <button
                      onClick={endSession}
                      className="px-3 py-2 text-xs font-bold rounded-lg bg-white/10 hover:bg-white/15 text-white border border-white/10"
                    >
                      End Session
                    </button>
                  ) : null}
                </div>

                {packError ? (
                  <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm flex items-start gap-2">
                    <AlertCircle size={18} className="mt-0.5" />
                    <div>{packError}</div>
                  </div>
                ) : null}

                {packLoading ? (
                  <div className="mt-4 flex items-center gap-2 text-gray-300 text-sm">
                    <Loader2 className="animate-spin" size={18} /> Generating...
                  </div>
                ) : null}

                {explainLoading ? (
                  <div className="mt-4 flex items-center gap-2 text-gray-300 text-sm">
                    <Loader2 className="animate-spin" size={18} /> Explaining...
                  </div>
                ) : null}

                {explainError ? (
                  <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm flex items-start gap-2">
                    <AlertCircle size={18} className="mt-0.5" />
                    <div>{explainError}</div>
                  </div>
                ) : null}
              </div>

              {activeTab === 'quick' ? (
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-4">
                    <div className="text-white font-bold">Key formulas</div>
                    <div className="mt-2 text-sm text-gray-200 space-y-2">
                      {!pack ? (
                        <div className="text-gray-400">Generate quick revision to see this.</div>
                      ) : pack.formulas.length === 0 ? (
                        <div className="text-gray-400">No formulas for this topic.</div>
                      ) : (
                        pack.formulas.map((f, i) => (
                          <div key={i} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                            {f}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-4">
                    <div className="text-white font-bold">Core concept</div>
                    <div className="mt-2 text-sm text-gray-200 whitespace-pre-wrap">
                      {!pack ? 'Generate quick revision to see this.' : pack.coreConcept}
                    </div>
                  </div>

                  <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-4">
                    <div className="text-white font-bold">Common mistakes</div>
                    <div className="mt-2 text-sm text-gray-200 space-y-2">
                      {!pack ? (
                        <div className="text-gray-400">Generate quick revision to see this.</div>
                      ) : pack.commonMistakes.length === 0 ? (
                        <div className="text-gray-400">No common mistakes listed.</div>
                      ) : (
                        pack.commonMistakes.map((m, i) => (
                          <div key={i} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                            {m}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-4">
                    <div className="text-white font-bold">2–3 rapid questions</div>
                    <div className="mt-2 text-sm text-gray-200 space-y-3">
                      {!pack ? (
                        <div className="text-gray-400">Generate quick revision to see this.</div>
                      ) : pack.rapidQuestions.length === 0 ? (
                        <div className="text-gray-400">No rapid questions.</div>
                      ) : (
                        pack.rapidQuestions.map((q, i) => (
                          <div key={i} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                            <div className="font-bold">Q{i + 1}. {q.q}</div>
                            {q.a ? <div className="text-gray-300 mt-1">Ans: {q.a}</div> : null}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {explainText ? (
                    <div className="md:col-span-2 bg-gray-900/30 border border-gray-800 rounded-xl p-4">
                      <div className="text-white font-bold">AI Explain in 60 seconds</div>
                      <div className="mt-2 text-sm text-gray-200 whitespace-pre-wrap">{explainText}</div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {activeTab === 'flash' ? (
                <div className="p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <div className="text-white font-bold">Flashcards (High Impact)</div>
                      <div className="text-xs text-gray-400 mt-1">Easy / Medium / Hard updates next revision schedule</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setFlashMode('normal')}
                        className={`px-3 py-2 text-xs font-bold rounded-lg border transition-colors ${
                          flashMode === 'normal'
                            ? 'bg-gradient-to-r from-purple-600 to-blue-600 border-transparent text-white'
                            : 'bg-white/5 border-white/10 text-gray-200 hover:bg-white/10'
                        }`}
                      >
                        Normal
                      </button>
                      <button
                        onClick={() => setFlashMode('shuffle')}
                        className={`px-3 py-2 text-xs font-bold rounded-lg border transition-colors ${
                          flashMode === 'shuffle'
                            ? 'bg-gradient-to-r from-purple-600 to-blue-600 border-transparent text-white'
                            : 'bg-white/5 border-white/10 text-gray-200 hover:bg-white/10'
                        }`}
                      >
                        <Shuffle size={16} className="inline mr-2" /> Shuffle
                      </button>
                      <button
                        onClick={() => setFlashMode('spaced')}
                        className={`px-3 py-2 text-xs font-bold rounded-lg border transition-colors ${
                          flashMode === 'spaced'
                            ? 'bg-gradient-to-r from-purple-600 to-blue-600 border-transparent text-white'
                            : 'bg-white/5 border-white/10 text-gray-200 hover:bg-white/10'
                        }`}
                      >
                        Spaced
                      </button>
                      <button
                        onClick={() => generateFlashcards(activeTopic)}
                        className="px-3 py-2 text-xs font-bold rounded-lg bg-white/10 hover:bg-white/15 text-white border border-white/10"
                        disabled={flashGenerating}
                      >
                        {flashGenerating ? (
                          <span className="inline-flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> Generating</span>
                        ) : (
                          <span>Generate</span>
                        )}
                      </button>
                    </div>
                  </div>

                  {flashError ? (
                    <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm flex items-start gap-2">
                      <AlertCircle size={18} className="mt-0.5" />
                      <div>{flashError}</div>
                    </div>
                  ) : null}

                  {flashDeck.length === 0 ? (
                    <div className="mt-4 text-sm text-gray-400">Generate flashcards to start.</div>
                  ) : (
                    <div className="mt-4 bg-gray-900/30 border border-gray-800 rounded-2xl p-5">
                      <div className="text-xs text-gray-400">Card {flashIndex + 1} / {flashDeck.length}</div>
                      <button
                        onClick={() => setFlashFlipped((v) => !v)}
                        className="mt-3 w-full text-left"
                      >
                        <div className="text-white font-extrabold text-lg whitespace-pre-wrap">
                          {flashFlipped ? flashCard?.back : flashCard?.front}
                        </div>
                        <div className="text-xs text-gray-500 mt-2">Click to flip</div>
                      </button>

                      <div className="mt-5 flex flex-wrap gap-2">
                        <button
                          onClick={() => flashCard && rateFlashcard(activeTopic.key, flashCard.id, 'easy')}
                          className="px-3 py-2 text-xs font-bold rounded-lg bg-green-500/15 hover:bg-green-500/20 text-green-200 border border-green-500/30"
                        >
                          Easy
                        </button>
                        <button
                          onClick={() => flashCard && rateFlashcard(activeTopic.key, flashCard.id, 'medium')}
                          className="px-3 py-2 text-xs font-bold rounded-lg bg-amber-500/15 hover:bg-amber-500/20 text-amber-200 border border-amber-500/30"
                        >
                          Medium
                        </button>
                        <button
                          onClick={() => flashCard && rateFlashcard(activeTopic.key, flashCard.id, 'hard')}
                          className="px-3 py-2 text-xs font-bold rounded-lg bg-red-500/15 hover:bg-red-500/20 text-red-200 border border-red-500/30"
                        >
                          Hard
                        </button>
                        <div className="ml-auto text-xs text-gray-400">
                          Next review: {flashCard ? formatDate(flashCard.nextReviewAt) : '—'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {activeTab === 'mcq' ? (
                <div className="p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <div className="text-white font-bold">Rapid Fire MCQs</div>
                      <div className="text-xs text-gray-400 mt-1">Timer + instant explanation</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {[5, 8, 10].map((s) => (
                        <button
                          key={s}
                          onClick={() => setMcqPerQSec(s as any)}
                          className={`px-3 py-2 text-xs font-bold rounded-lg border transition-colors ${
                            mcqPerQSec === s
                              ? 'bg-gradient-to-r from-purple-600 to-blue-600 border-transparent text-white'
                              : 'bg-white/5 border-white/10 text-gray-200 hover:bg-white/10'
                          }`}
                        >
                          {s}s
                        </button>
                      ))}
                      <button
                        onClick={() => startRapidFire(activeTopic)}
                        className="px-3 py-2 text-xs font-bold rounded-lg bg-white/10 hover:bg-white/15 text-white border border-white/10"
                        disabled={mcqLoading}
                      >
                        {mcqLoading ? (
                          <span className="inline-flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> Loading</span>
                        ) : (
                          <span className="inline-flex items-center gap-2"><Timer size={16} /> Start</span>
                        )}
                      </button>
                    </div>
                  </div>

                  {mcqError ? (
                    <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm flex items-start gap-2">
                      <AlertCircle size={18} className="mt-0.5" />
                      <div>{mcqError}</div>
                    </div>
                  ) : null}

                  {mcqQuestions.length === 0 ? (
                    <div className="mt-4 text-sm text-gray-400">Start Rapid Fire to generate MCQs.</div>
                  ) : mcqIndex >= mcqQuestions.length ? (
                    <div className="mt-4 bg-gray-900/30 border border-gray-800 rounded-xl p-4">
                      <div className="text-white font-extrabold text-lg">Done!</div>
                      <div className="text-gray-300 mt-1">
                        Score: {mcqCorrectCount}/{mcqQuestions.length} ({Math.round((mcqCorrectCount / Math.max(1, mcqQuestions.length)) * 100)}%)
                      </div>
                      <div className="text-xs text-gray-400 mt-2">Topic schedule updated based on your score.</div>
                    </div>
                  ) : (
                    <div className="mt-4 bg-gray-900/30 border border-gray-800 rounded-2xl p-5">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-400">Q{mcqIndex + 1} / {mcqQuestions.length}</div>
                        <div className="text-xs text-gray-300 inline-flex items-center gap-2">
                          <Timer size={14} /> {formatTimeLeft(mcqTimer)}
                        </div>
                      </div>

                      <div className="mt-3 text-white font-extrabold text-lg whitespace-pre-wrap">{mcq?.question}</div>

                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                        {(mcq?.options || []).map((opt, i) => {
                          const isCorrect = typeof mcq?.correctOption === 'number' && i === mcq.correctOption;
                          const isSelected = mcqSelected === i;
                          const reveal = mcqRevealed;
                          const base = 'border-white/10 bg-white/5 text-gray-200 hover:bg-white/10';
                          const selected = 'border-purple-500/40 bg-purple-500/15 text-white';
                          const correct = 'border-green-500/40 bg-green-500/15 text-green-100';
                          const wrong = 'border-red-500/40 bg-red-500/15 text-red-100';

                          let cls = base;
                          if (isSelected) cls = selected;
                          if (reveal && isCorrect) cls = correct;
                          if (reveal && isSelected && !isCorrect) cls = wrong;

                          return (
                            <button
                              key={i}
                              disabled={mcqRevealed}
                              onClick={() => setMcqSelected(i)}
                              className={`text-left px-3 py-2 rounded-xl border transition-colors ${cls}`}
                            >
                              <div className="text-sm font-bold">{String.fromCharCode(65 + i)}.</div>
                              <div className="text-sm">{opt}</div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-4 flex items-center gap-2">
                        {!mcqRevealed ? (
                          <button
                            onClick={submitMcq}
                            className="px-3 py-2 text-xs font-bold rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                          >
                            Submit
                          </button>
                        ) : (
                          <button
                            onClick={nextMcq}
                            className="px-3 py-2 text-xs font-bold rounded-lg bg-white/10 hover:bg-white/15 text-white border border-white/10"
                          >
                            Next
                          </button>
                        )}
                        {mcqRevealed && typeof mcq?.correctOption === 'number' ? (
                          <div className="text-xs text-gray-300">
                            Correct: {String.fromCharCode(65 + mcq.correctOption)}
                          </div>
                        ) : null}
                      </div>

                      {mcqRevealed ? (
                        <div className="mt-4 bg-black/20 border border-white/10 rounded-xl p-3">
                          <div className="text-white font-bold">Explanation</div>
                          <div className="text-sm text-gray-200 mt-1 whitespace-pre-wrap">
                            {mcq?.explanation || 'Concept-based check: review why the correct option matches the definition/law, and why others fail under the same condition.'}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
      ) : null}
    </div>
  );
};

export default RevisionModeContent;
