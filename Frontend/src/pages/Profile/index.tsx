import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';
import ProfileHeader from './components/ProfileHeader.tsx';
import PersonalInfo from './components/PersonalInfo.tsx';
import AIUsage from './components/AIUsage.tsx';
import ActivitySummary from './components/ActivitySummary.tsx';
import Subscription from './components/Subscription.tsx';
import { getSyllabuses } from '../../api/syllabusApi';

const Profile = () => {
  const { currentUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  type SyllabusChapter = {
    id?: string;
    name: string;
    description?: string;
    targetDate?: string;
  };

  type SyllabusItem = {
    id: string;
    _id?: string;
    userId?: string;
    name: string;
    subjectCode?: string;
    description?: string;
    targetDate?: string;
    priority?: 'high' | 'medium' | 'low';
    type?: 'theory' | 'practical' | 'combined';
    chapters?: SyllabusChapter[];
    progress?: number;
    status?: 'completed' | 'in-progress' | 'pending';
  };

  type QuizTypeKey = 'MCQ_SINGLE' | 'MCQ_MULTI' | 'SHORT' | 'NUMERICAL' | 'ASSERTION_REASON' | 'FILL_BLANK';

  type QuizQuestion = {
    id: string;
    type: QuizTypeKey;
    question: string;
    options?: string[];
    correctOption?: number;
    correctOptions?: number[];
    expectedKeywords?: string[];
    numerical?: { finalAnswer: number; tolerance: number; unit?: string };
    assertionReason?: { correctOption: 'A' | 'B' | 'C' | 'D' };
    fillBlank?: { answer: string };
  };

  type QuizPayload = {
    title?: string;
    subject?: string;
    topic?: string;
    questions: QuizQuestion[];
  };

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

  const scoreAttempt = (attempt: StoredQuizAttempt) => {
    const questions = attempt?.quiz?.questions || [];
    let total = 0;
    let correct = 0;

    for (const q of questions) {
      total += 1;
      const a = attempt.answers?.[q.id];
      if (!a) continue;
      const r = evaluateAnswer(q, a);
      if (r === true) correct += 1;
    }

    const accuracy = total ? Math.round((correct / total) * 100) : 0;
    return { total, correct, accuracy };
  };

  const PREVIOUS_ATTEMPTS_KEY = 'practice_quiz_previous_attempts_v1';

  // Mock user data - in a real app, this would come from your backend
  const [userData, setUserData] = useState({
    fullName: currentUser?.displayName || 'User Name',
    email: currentUser?.email || '',
    photoURL: currentUser?.photoURL || '',
    phone: '',
    country: 'India',
    language: 'English',
    bio: '',
    role: 'Free User',
    joinDate: currentUser?.metadata?.creationTime
      ? new Date(currentUser.metadata.creationTime).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
      : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
    syllabusSubjects: 0,
    syllabusTopicsTotal: 0,
    syllabusTopicsCompleted: 0,
    syllabusProgress: 0,
    practiceAttempts: 0,
    bestAccuracy: 0,
    lastAttemptDate: '',
    weeklyAttempts: 0,
    studyStreakDays: 0,
  });

  const [recentAttempts, setRecentAttempts] = useState<
    Array<
      StoredQuizAttempt & {
        score: { total: number; correct: number; accuracy: number };
      }
    >
  >([]);

  const [syllabusItems, setSyllabusItems] = useState<SyllabusItem[]>([]);

  const countTopicsInDescription = (desc: string) => {
    let total = 0;
    let completed = 0;
    const lines = desc.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.match(/^[-•*]\s*\[[ x]\]/i)) continue;
      total += 1;
      if (trimmed.match(/^[-•*]\s*\[x\]/i)) completed += 1;
    }
    return { total, completed };
  };

  const calculateSubjectTopicCounts = (subject: SyllabusItem) => {
    const chapters = Array.isArray(subject?.chapters) ? subject.chapters : [];
    let total = 0;
    let completed = 0;
    for (const chapter of chapters) {
      const desc = typeof chapter?.description === 'string' ? chapter.description : '';
      if (!desc) continue;
      const c = countTopicsInDescription(desc);
      total += c.total;
      completed += c.completed;
    }
    return { total, completed };
  };

  const calculateSubjectProgress = (subject: SyllabusItem) => {
    if (typeof subject.progress === 'number') return Math.max(0, Math.min(100, subject.progress));
    const counts = calculateSubjectTopicCounts(subject);
    if (!counts.total) return 0;
    return Math.round((counts.completed / counts.total) * 100);
  };

  const getDueStatus = (subject: SyllabusItem) => {
    const raw = subject?.targetDate;
    if (!raw) return { kind: 'none' as const, label: 'No target' };
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return { kind: 'none' as const, label: 'No target' };
    const now = new Date();
    const progress = calculateSubjectProgress(subject);

    const msPerDay = 24 * 60 * 60 * 1000;
    const days = Math.ceil((d.getTime() - now.getTime()) / msPerDay);

    if (progress >= 100) return { kind: 'done' as const, label: `Completed` };
    if (days < 0) return { kind: 'overdue' as const, label: `Overdue by ${Math.abs(days)}d` };
    if (days <= 7) return { kind: 'dueSoon' as const, label: `Due in ${days}d` };
    return { kind: 'onTrack' as const, label: `Due in ${days}d` };
  };

  useEffect(() => {
    const loadSyllabusProgress = async () => {
      if (!currentUser?.uid) return;
      try {
        const syllabuses: any[] = (await getSyllabuses(currentUser.uid)) as any[];
        const subjects = (Array.isArray(syllabuses) ? syllabuses : []) as SyllabusItem[];

        setSyllabusItems(subjects);

        let totalTopics = 0;
        let completedTopics = 0;

        for (const subject of subjects) {
          const chapters = Array.isArray(subject?.chapters) ? subject.chapters : [];
          for (const chapter of chapters) {
            const desc = typeof chapter?.description === 'string' ? chapter.description : '';
            if (!desc) continue;
            const lines = desc.split('\n');
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.match(/^[-•*]\s*\[[ x]\]/i)) continue;
              totalTopics += 1;
              if (trimmed.match(/^[-•*]\s*\[x\]/i)) completedTopics += 1;
            }
          }
        }

        const progress = totalTopics ? Math.round((completedTopics / totalTopics) * 100) : 0;

        setUserData((prev) => ({
          ...prev,
          syllabusSubjects: subjects.length,
          syllabusTopicsTotal: totalTopics,
          syllabusTopicsCompleted: completedTopics,
          syllabusProgress: progress,
        }));
      } catch (error) {
        console.error('Error loading syllabus progress:', error);
      }
    };

    loadSyllabusProgress();
  }, [currentUser?.uid]);

  const syllabusOverview = useMemo(() => {
    const subjects = syllabusItems;
    let overdue = 0;
    let dueSoon = 0;
    let completedSubjects = 0;

    for (const s of subjects) {
      const progress = calculateSubjectProgress(s);
      if (progress >= 100) completedSubjects += 1;
      const due = getDueStatus(s);
      if (due.kind === 'overdue') overdue += 1;
      if (due.kind === 'dueSoon') dueSoon += 1;
    }

    return {
      overdue,
      dueSoon,
      completedSubjects,
    };
  }, [syllabusItems]);

  const subjectCards = useMemo(() => {
    return [...syllabusItems]
      .map((s) => {
        const counts = calculateSubjectTopicCounts(s);
        const progress = calculateSubjectProgress(s);
        const due = getDueStatus(s);
        return {
          id: s.id,
          name: s.name,
          subjectCode: s.subjectCode || '—',
          priority: s.priority || 'medium',
          type: s.type || 'theory',
          progress,
          totalTopics: counts.total,
          completedTopics: counts.completed,
          targetDate: s.targetDate,
          due,
        };
      })
      .sort((a, b) => {
        const rank = (k: string) => (k === 'overdue' ? 0 : k === 'dueSoon' ? 1 : k === 'onTrack' ? 2 : 3);
        return rank(a.due.kind) - rank(b.due.kind) || b.progress - a.progress;
      });
  }, [syllabusItems]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    try {
      const raw = localStorage.getItem(PREVIOUS_ATTEMPTS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const attempts: StoredQuizAttempt[] = Array.isArray(parsed) ? parsed : [];
      const mine = attempts.filter((a) => a?.userId === currentUser.uid).slice(0, 50);

      const withScores = mine
        .map((a) => ({ ...a, score: scoreAttempt(a) }))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      const bestAccuracy = withScores.reduce((m, a) => Math.max(m, a.score.accuracy || 0), 0);
      const lastAttemptDate = withScores[0]?.createdAt ? new Date(withScores[0].createdAt).toISOString() : '';

      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const weeklyAttempts = withScores.filter((a) => (a.createdAt || 0) >= weekAgo).length;

      const uniqueDays = Array.from(
        new Set(
          withScores
            .map((a) => new Date(a.createdAt).toISOString().slice(0, 10))
            .filter(Boolean)
        )
      ).sort();

      let streak = 0;
      const todayKey = new Date().toISOString().slice(0, 10);
      const daySet = new Set(uniqueDays);
      for (let i = 0; i < 365; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        if (i === 0 && key !== todayKey) break;
        if (!daySet.has(key)) break;
        streak += 1;
      }

      setRecentAttempts(withScores.slice(0, 8));
      setUserData((prev) => ({
        ...prev,
        practiceAttempts: withScores.length,
        bestAccuracy,
        lastAttemptDate,
        weeklyAttempts,
        studyStreakDays: streak,
      }));
    } catch {
      // ignore
    }
  }, [currentUser?.uid]);

  const lastAttemptLabel = useMemo(() => {
    if (!userData.lastAttemptDate) return '—';
    try {
      return new Date(userData.lastAttemptDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '—';
    }
  }, [userData.lastAttemptDate]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!currentUser?.uid) return;

      try {
        const res = await fetch(`http://localhost:5001/api/profile?uid=${encodeURIComponent(currentUser.uid)}`);
        if (!res.ok) {
          return;
        }

        const profile = await res.json();

        setUserData(prev => ({
          ...prev,
          fullName: profile.fullName ?? prev.fullName,
          email: profile.email ?? prev.email,
          phone: profile.phone ?? prev.phone,
          country: profile.country ?? prev.country,
          language: profile.language ?? prev.language,
          photoURL: profile.photoURL ?? prev.photoURL,
        }));
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    fetchProfile();
  }, [currentUser?.uid]);

  const compressImage = async (file: File): Promise<File> => {
    const options = {
      maxSizeMB: 0.5, // Max size in MB (500KB)
      maxWidthOrHeight: 800, // Max width/height in pixels
      useWebWorker: true,
    };

    try {
      // @ts-ignore - We'll handle the type mismatch
      const compressedFile = await import('browser-image-compression').then(module => 
        module.default(file, options)
      );
      console.log('Compressed file size:', (compressedFile.size / 1024 / 1024).toFixed(2), 'MB');
      return compressedFile as File;
    } catch (error) {
      console.error('Error compressing image:', error);
      return file; // Return original if compression fails
    }
  };

  const handleImageChange = async (file: File) => {
    try {
      // Compress the image first
      const compressedFile = await compressImage(file);
      
      // Create a base64 string from the compressed file
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        
        // Update local state immediately
        setUserData(prev => ({
          ...prev,
          photoURL: base64String
        }));
        
        // If not in edit mode, save immediately
        if (!isEditing) {
          try {
            await handleSave({ photoURL: base64String });
          } catch (error) {
            console.error('Failed to save image:', error);
            // Optionally show error to user
          }
        }
      };
      
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      console.error('Error processing image:', error);
      // Optionally show error to user
    }
  };

  const handleSave = async (updatedData: any = {}) => {
    console.log('Starting save with data:', updatedData);
    
    // Only update state if there's actual data to update
    const hasUpdates = Object.keys(updatedData).length > 0;
    const nextData = hasUpdates ? { ...userData, ...updatedData } : userData;

    if (hasUpdates) {
      console.log('Updating local state with:', updatedData);
      setUserData(nextData);
    }

    if (!currentUser?.uid) {
      console.error('No user ID available');
      setIsEditing(false);
      return;
    }

    try {
      setIsSaving(true);
      console.log('Saving profile...');

      // Prepare the data to send to the server
      const dataToSend = {
        uid: currentUser.uid,
        fullName: nextData.fullName,
        email: nextData.email,
        phone: nextData.phone || '',
        country: nextData.country || '',
        language: nextData.language || 'en',
        photoURL: nextData.photoURL || '',
        bio: nextData.bio || ''
      };

      console.log('Sending data to server:', dataToSend);

      const res = await fetch('http://localhost:5001/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      const responseData = await res.json().catch(() => ({}));
      console.log('Server response:', { status: res.status, data: responseData });

      if (!res.ok) {
        console.error('Profile save failed with status:', res.status);
        throw new Error(responseData.message || `Server responded with status ${res.status}`);
      }

      // Only update state if we get a response
      if (responseData) {
        console.log('Profile saved successfully:', responseData);
        setUserData(prev => ({
          ...prev,
          fullName: responseData.fullName ?? prev.fullName,
          email: responseData.email ?? prev.email,
          phone: responseData.phone ?? prev.phone,
          country: responseData.country ?? prev.country,
          language: responseData.language ?? prev.language,
          photoURL: responseData.photoURL ?? prev.photoURL,
          bio: responseData.bio ?? prev.bio,
        }));
      }
      
      // Only exit edit mode if this was a manual save (not an auto-save from image upload)
      if (Object.keys(updatedData).length === 0) {
        console.log('Exiting edit mode');
        setIsEditing(false);
      }
      
      return responseData;
    } catch (error) {
      console.error('Error in handleSave:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      // Re-throw the error so it can be handled by the caller if needed
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 pt-24 pb-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Profile Header */}
        <ProfileHeader 
          userData={userData} 
          isEditing={isEditing} 
          onEditToggle={() => setIsEditing(!isEditing)}
          onSave={() => {
            if (!isSaving) {
              void handleSave();
            }
          }}
          onImageChange={handleImageChange}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Personal Information */}
            <PersonalInfo 
              userData={userData} 
              isEditing={isEditing} 
              onInputChange={(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
                const { name, value } = e.target;
                setUserData(prev => ({
                  ...prev,
                  [name]: value
                }));
              }}
            />

            {/* AI Usage & Limits */}
            <AIUsage userData={{
              practiceAttempts: userData.practiceAttempts,
              weeklyAttempts: userData.weeklyAttempts,
              bestAccuracy: userData.bestAccuracy,
              studyStreakDays: userData.studyStreakDays,
            }} />

            {/* Activity Summary */}
            <ActivitySummary userData={{
              practiceAttempts: userData.practiceAttempts,
              lastAttemptLabel,
              weeklyAttempts: userData.weeklyAttempts,
              bestAccuracy: userData.bestAccuracy,
              recentAttempts,
            }} />
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Subscription & Billing */}
            <Subscription userData={{
              syllabusSubjects: userData.syllabusSubjects,
              syllabusProgress: userData.syllabusProgress,
              syllabusTopicsCompleted: userData.syllabusTopicsCompleted,
              syllabusTopicsTotal: userData.syllabusTopicsTotal,
              studyStreakDays: userData.studyStreakDays,
            }} />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="bg-white rounded-2xl shadow-sm p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">My Subjects</h2>
                  <p className="text-xs text-gray-500 mt-1">EduTrack AI syllabus tracker overview</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded-full bg-red-50 text-red-700 border border-red-100">
                    Overdue: {syllabusOverview.overdue}
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                    Due soon: {syllabusOverview.dueSoon}
                  </span>
                </div>
              </div>

              {subjectCards.length === 0 ? (
                <div className="text-sm text-gray-500">No subjects found. Add a subject in Syllabus Tracker.</div>
              ) : (
                <div className="space-y-3">
                  {subjectCards.slice(0, 6).map((s) => (
                    <div key={s.id} className="border border-gray-100 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{s.name}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {s.subjectCode} • {s.type} • {s.priority}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-gray-900">{s.progress}%</div>
                          <div
                            className={`text-xs mt-1 ${s.due.kind === 'overdue'
                              ? 'text-red-600'
                              : s.due.kind === 'dueSoon'
                                ? 'text-amber-600'
                                : 'text-gray-500'
                              }`}
                          >
                            {s.due.label}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${s.progress >= 100
                              ? 'bg-green-500'
                              : s.progress >= 50
                                ? 'bg-blue-500'
                                : 'bg-purple-500'
                              }`}
                            style={{ width: `${Math.max(0, Math.min(100, s.progress))}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                          <span>
                            Topics: {s.completedTopics}/{s.totalTopics}
                          </span>
                          <span>
                            {s.targetDate ? new Date(s.targetDate).toLocaleDateString() : 'No target'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {subjectCards.length > 6 ? (
                    <a href="/dashboard" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline">
                      View all subjects →
                    </a>
                  ) : null}
                </div>
              )}
            </motion.div>
            
            {/* Quick Actions */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-2xl shadow-sm p-6"
            >
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <a href="/dashboard" className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                  <span className="text-gray-700">Open Dashboard</span>
                  <span className="text-indigo-600">→</span>
                </a>
                <a href="/dashboard" className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                  <span className="text-gray-700">Start Practice Quiz</span>
                  <span className="text-indigo-600">→</span>
                </a>
                <a href="/dashboard" className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                  <span className="text-gray-700">View Progress & Analytics</span>
                  <span className="text-indigo-600">→</span>
                </a>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="bg-white rounded-2xl shadow-sm p-6"
            >
              <h2 className="text-lg font-semibold text-gray-900 mb-4">At a glance</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white border border-gray-100 rounded-xl p-4">
                  <div className="text-xs text-gray-500">Syllabus progress</div>
                  <div className="text-2xl font-extrabold text-gray-900 mt-1">{userData.syllabusProgress}%</div>
                </div>
                <div className="bg-white border border-gray-100 rounded-xl p-4">
                  <div className="text-xs text-gray-500">Best accuracy</div>
                  <div className="text-2xl font-extrabold text-gray-900 mt-1">{userData.bestAccuracy}%</div>
                </div>
                <div className="bg-white border border-gray-100 rounded-xl p-4">
                  <div className="text-xs text-gray-500">Attempts</div>
                  <div className="text-2xl font-extrabold text-gray-900 mt-1">{userData.practiceAttempts}</div>
                </div>
                <div className="bg-white border border-gray-100 rounded-xl p-4">
                  <div className="text-xs text-gray-500">Last attempt</div>
                  <div className="text-2xl font-extrabold text-gray-900 mt-1">{lastAttemptLabel}</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
