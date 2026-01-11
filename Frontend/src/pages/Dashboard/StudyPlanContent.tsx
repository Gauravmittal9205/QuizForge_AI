import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Clock,
  Target,
  TrendingUp,
  Brain,
  Play,
  SkipForward,
  RotateCcw,
  Zap,
  AlertCircle,
  CheckCircle,
  Loader2,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { sendMessageToAIStream } from '../../services/aiTutorService';

type Props = {
  syllabusItems?: any[];
  currentUser?: any;
};

type StudyPlan = {
  id: string;
  examDate: string;
  targetScore: number;
  studyHoursPerDay: number;
  selectedSubjects: SelectedSubject[];
  dailyPlan: DailyPlan[];
  weeklyPlan: WeeklyPlan[];
  createdAt: number;
  updatedAt: number;
};

type SelectedSubject = {
  id: string;
  name: string;
  targetDate: string;
  priority: 'high' | 'medium' | 'low';
  chapters: string[];
};

type DailyPlan = {
  id: string;
  date: string;
  timeSlots: TimeSlot[];
  completed: boolean;
  totalProgress: number;
};

type TimeSlot = {
  id: string;
  startTime: string;
  endTime: string;
  subject: string;
  topic: string;
  type: 'study' | 'quiz' | 'revision';
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  estimatedDuration: number;
};

type WeeklyPlan = {
  id: string;
  weekStart: string;
  days: DayPlan[];
};

type DayPlan = {
  date: string;
  subjects: SubjectPlan[];
  totalHours: number;
};

type SubjectPlan = {
  subject: string;
  topics: string[];
  hours: number;
  priority: 'high' | 'medium' | 'low';
};

const STUDY_PLAN_KEY = 'study_plan_v1';

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

const formatDate = (date: string | Date) => {
  return new Date(date).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatTime = (time: string) => {
  return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const getDaysDifference = (date1: string, date2: string) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
  switch (priority) {
    case 'high':
      return 'text-red-300 bg-red-500/15 border-red-500/30';
    case 'medium':
      return 'text-amber-300 bg-amber-500/15 border-amber-500/30';
    case 'low':
      return 'text-green-300 bg-green-500/15 border-green-500/30';
    default:
      return 'text-gray-300 bg-gray-500/15 border-gray-500/30';
  }
};

const getSubjectColor = (subject: string) => {
  const colors = [
    'bg-purple-500/20 border-purple-500/40',
    'bg-blue-500/20 border-blue-500/40',
    'bg-green-500/20 border-green-500/40',
    'bg-amber-500/20 border-amber-500/40',
    'bg-red-500/20 border-red-500/40',
    'bg-pink-500/20 border-pink-500/40',
  ];
  const index = subject.charCodeAt(0) % colors.length;
  return colors[index];
};

const StudyPlanContent: React.FC<Props> = ({ syllabusItems = [] }) => {
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(() =>
    readLocalJson(STUDY_PLAN_KEY, null)
  );

  const [activeTab, setActiveTab] = useState<'overview' | 'daily' | 'weekly' | 'generator'>('overview');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // AI Generator States
  const [examDate, setExamDate] = useState('');
  const [targetScore, setTargetScore] = useState(85);
  const [studyHoursPerDay, setStudyHoursPerDay] = useState(6);
  const [selectedSubjects, setSelectedSubjects] = useState<SelectedSubject[]>([]);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  // Weekly Planner States
  const [currentWeek, setCurrentWeek] = useState(0);

  useEffect(() => {
    if (studyPlan) {
      writeLocalJson(STUDY_PLAN_KEY, studyPlan);
    }
  }, [studyPlan]);

  const todayPlan = useMemo(() => {
    if (!studyPlan) return null;
    return studyPlan.dailyPlan.find(plan => plan.date === selectedDate);
  }, [studyPlan, selectedDate]);

  const overallProgress = useMemo(() => {
    if (!studyPlan) return 0;
    const totalSlots = studyPlan.dailyPlan.reduce((acc, day) => acc + day.timeSlots.length, 0);
    const completedSlots = studyPlan.dailyPlan.reduce((acc, day) => 
      acc + day.timeSlots.filter(slot => slot.completed).length, 0);
    return totalSlots > 0 ? Math.round((completedSlots / totalSlots) * 100) : 0;
  }, [studyPlan]);

  const daysLeft = useMemo(() => {
    if (!studyPlan?.examDate) return 0;
    return getDaysDifference(new Date().toISOString().split('T')[0], studyPlan.examDate);
  }, [studyPlan]);

  const syllabusProgress = useMemo(() => {
    if (!studyPlan) return 0;
    const totalTopics = syllabusItems.reduce((acc, subject) => {
      const chapters = Array.isArray(subject?.chapters) ? subject.chapters : [];
      return acc + chapters.length;
    }, 0);
    const coveredTopics = studyPlan.dailyPlan.reduce((acc, day) => 
      acc + day.timeSlots.filter(slot => slot.completed).length, 0);
    return totalTopics > 0 ? Math.round((coveredTopics / totalTopics) * 100) : 0;
  }, [studyPlan, syllabusItems]);

  const addSubject = (subject: any, priority: 'high' | 'medium' | 'low') => {
    const chapters = Array.isArray(subject?.chapters) ? subject.chapters.map((c: any) => c.name || 'Chapter') : [];
    const newSubject: SelectedSubject = {
      id: subject?.id || subject?._id || Date.now().toString(),
      name: subject?.name || 'Unknown Subject',
      targetDate: subject?.targetDate || new Date().toISOString().split('T')[0],
      priority,
      chapters,
    };
    setSelectedSubjects([...selectedSubjects.filter(s => s.id !== newSubject.id), newSubject]);
  };

  const removeSubject = (subjectId: string) => {
    setSelectedSubjects(selectedSubjects.filter(s => s.id !== subjectId));
  };

  const updateSubjectPriority = (subjectId: string, priority: 'high' | 'medium' | 'low') => {
    setSelectedSubjects(selectedSubjects.map(s => 
      s.id === subjectId ? { ...s, priority } : s
    ));
  };

  const getAvailableSubjects = useMemo(() => {
    return syllabusItems.filter((subject: any) => 
      !selectedSubjects.find(s => s.id === subject.id) && 
      subject.targetDate >= examDate
    );
  }, [syllabusItems, selectedSubjects, examDate]);

  const generateAIPlan = async () => {
    if (!examDate || selectedSubjects.length === 0) {
      setPlanError('Please select exam date and at least one subject');
      return;
    }

    setGeneratingPlan(true);
    setPlanError(null);

    try {
      const prompt = `You are a study plan generator. Create a JSON study plan only.

User:
- Exam Date: ${examDate}
- Target Score: ${targetScore}%
- Study Hours Per Day: ${studyHoursPerDay}

Selected Subjects:
${selectedSubjects.map(subject => `- ${subject.name} (Priority: ${subject.priority}, Due: ${subject.targetDate}, Chapters: ${subject.chapters.join(', ')})`).join('\n')}

Generate ONLY this JSON:
{
  "dailyPlan": [
    {
      "date": "YYYY-MM-DD",
      "timeSlots": [
        {
          "startTime": "HH:MM",
          "endTime": "HH:MM", 
          "subject": "Subject Name",
          "topic": "Specific Topic",
          "type": "study",
          "priority": "high",
          "estimatedDuration": 60
        }
      ]
    }
  ],
  "weeklyPlan": [
    {
      "weekStart": "YYYY-MM-DD",
      "days": [
        {
          "date": "YYYY-MM-DD",
          "subjects": [
            {
              "subject": "Subject Name",
              "topics": ["Topic1"],
              "hours": 2,
              "priority": "high"
            }
          ],
          "totalHours": 6
        }
      ]
    }
  ]
}

Rules:
- High priority subjects get more time
- Earlier due dates get priority
- Include revision and quiz days
- Max ${studyHoursPerDay} hours per day
- Return ONLY JSON, no text`;

      const { response } = await sendMessageToAIStream(prompt, { model: 'phi3:mini' });
      
      console.log('AI Response:', response);
      
      // Try to extract JSON from the response
      let parsed;
      try {
        // First try direct JSON parse
        parsed = JSON.parse(response);
      } catch (e) {
        console.log('Direct JSON parse failed, trying extraction...');
        // If that fails, try to extract JSON from markdown code blocks
        const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[1]);
            console.log('Parsed JSON from markdown:', parsed);
          } catch (e2) {
            // If still fails, try to find the first JSON object in the text
            const jsonObjectMatch = response.match(/\{[\s\S]*\}/);
            if (jsonObjectMatch) {
              try {
                parsed = JSON.parse(jsonObjectMatch[0]);
                console.log('Parsed JSON from object match:', parsed);
              } catch (e3) {
                throw new Error('AI response format invalid. Could not parse JSON.');
              }
            } else {
              throw new Error('AI response format invalid. No JSON found.');
            }
          }
        } else {
          throw new Error('AI response format invalid. No JSON found.');
        }
      }
      
      if (!parsed || !parsed.dailyPlan) {
        console.log('Parsed data:', parsed);
        throw new Error('AI response missing required data structure.');
      }
      
      const newPlan: StudyPlan = {
        id: Date.now().toString(),
        examDate,
        targetScore,
        studyHoursPerDay,
        selectedSubjects,
        dailyPlan: parsed.dailyPlan || [],
        weeklyPlan: parsed.weeklyPlan || [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      setStudyPlan(newPlan);
      setActiveTab('daily');
    } catch (error: any) {
      setPlanError(error?.message || 'Failed to generate study plan');
    } finally {
      setGeneratingPlan(false);
    }
  };

  const markTimeSlotComplete = (date: string, slotId: string) => {
    if (!studyPlan) return;
    
    const updatedPlan = { ...studyPlan };
    const dayIndex = updatedPlan.dailyPlan.findIndex(day => day.date === date);
    
    if (dayIndex !== -1) {
      const slotIndex = updatedPlan.dailyPlan[dayIndex].timeSlots.findIndex(slot => slot.id === slotId);
      if (slotIndex !== -1) {
        updatedPlan.dailyPlan[dayIndex].timeSlots[slotIndex].completed = true;
        updatedPlan.updatedAt = Date.now();
        setStudyPlan(updatedPlan);
      }
    }
  };

  const skipTimeSlot = (date: string, slotId: string) => {
    // AI auto-adjust logic would go here
    console.log('Skipping time slot:', date, slotId);
  };

  const rescheduleTimeSlot = (date: string, slotId: string) => {
    // AI reschedule logic would go here
    console.log('Rescheduling time slot:', date, slotId);
  };

  const startTodaysPlan = () => {
    setActiveTab('daily');
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">📚 Study Plan</h2>
            <p className="text-sm text-gray-400 mt-1">AI-powered personalized study scheduler</p>
          </div>
          <div className="flex items-center gap-2">
            {['overview', 'daily', 'weekly', 'generator'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-3 py-2 text-xs font-bold rounded-lg border transition-colors ${
                  activeTab === tab
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 border-transparent text-white'
                    : 'bg-white/5 border-white/10 text-gray-200 hover:bg-white/10'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Study Plan Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-gray-800/30 border border-gray-700 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Brain className="text-purple-400" size={24} />
              <h3 className="text-xl font-extrabold text-white">🧠 Study Plan Overview</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-4">
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  <Calendar size={14} /> Exam date
                </div>
                <div className="text-2xl font-extrabold text-white mt-2">
                  {studyPlan ? formatDate(studyPlan.examDate) : 'Not set'}
                </div>
                <div className="text-xs text-gray-400 mt-1">{daysLeft} days left</div>
              </div>

              <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-4">
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  <Target size={14} /> Target score
                </div>
                <div className="text-2xl font-extrabold text-white mt-2">
                  {studyPlan ? `${studyPlan.targetScore}%` : 'Not set'}
                </div>
                <div className="text-xs text-gray-400 mt-1">Goal</div>
              </div>

              <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-4">
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  <TrendingUp size={14} /> Overall progress
                </div>
                <div className="text-2xl font-extrabold text-white mt-2">{overallProgress}%</div>
                <div className="text-xs text-gray-400 mt-1">Completed</div>
              </div>

              <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-4">
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  <Clock size={14} /> Syllabus
                </div>
                <div className="text-2xl font-extrabold text-white mt-2">{syllabusProgress}%</div>
                <div className="text-xs text-gray-400 mt-1">Completed</div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-xl">
              <div className="text-sm text-gray-200">
                <div className="font-bold text-white">Today's Focus</div>
                <div className="mt-1">
                  {todayPlan ? (
                    <>
                      {todayPlan.timeSlots.filter(slot => !slot.completed).length} topics + {todayPlan.timeSlots.filter(slot => slot.type === 'quiz').length} quiz
                    </>
                  ) : (
                    'No plan for today. Generate a study plan to get started!'
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              <button
                onClick={startTodaysPlan}
                disabled={!todayPlan}
                className="inline-flex items-center px-6 py-3 rounded-xl font-extrabold text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Play size={18} className="mr-2" /> Start Today's Plan
              </button>
            </div>
          </div>

          {/* Priority & Subject Focus */}
          {studyPlan && (
            <div className="bg-gray-800/30 border border-gray-700 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <AlertCircle className="text-red-400" size={24} />
                <h3 className="text-xl font-extrabold text-white">🔴 Priority & Subject Focus</h3>
              </div>

              <div className="space-y-4">
                {studyPlan.selectedSubjects.map((subject, index) => (
                  <div key={index} className={`flex items-center gap-3 p-3 border rounded-lg ${getPriorityColor(subject.priority)}`}>
                    <div className={`w-2 h-2 rounded-full ${
                      subject.priority === 'high' ? 'bg-red-400' :
                      subject.priority === 'medium' ? 'bg-amber-400' : 'bg-green-400'
                    }`}></div>
                    <div className="flex-1">
                      <div className="font-bold text-sm">{subject.name}</div>
                      <div className="text-xs opacity-75">Due: {formatDate(subject.targetDate)}</div>
                      <div className="text-xs opacity-75">Chapters: {subject.chapters.length}</div>
                    </div>
                    <div className="text-xs font-bold uppercase">
                      {subject.priority} Priority
                    </div>
                  </div>
                ))}
                {studyPlan.selectedSubjects.length === 0 && (
                  <div className="text-center text-gray-400 py-4">No subjects selected</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Daily Study Plan */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
          <div className="bg-gray-800/30 border border-gray-700 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Calendar className="text-blue-400" size={24} />
                <h3 className="text-xl font-extrabold text-white">📅 Daily Study Plan</h3>
              </div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg border border-white/10 bg-white/5 text-gray-200"
              />
            </div>

            {todayPlan ? (
              <div className="space-y-4">
                {todayPlan.timeSlots.map((slot) => (
                  <div
                    key={slot.id}
                    className={`p-4 border rounded-xl transition-all ${
                      slot.completed
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-gray-900/30 border-gray-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-sm font-bold text-white">
                            {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(slot.priority)}`}>
                            {slot.priority}
                          </span>
                          <span className="px-2 py-1 text-xs rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-200">
                            {slot.type}
                          </span>
                        </div>
                        <div className="text-white font-bold">{slot.subject}</div>
                        <div className="text-gray-300 text-sm">{slot.topic}</div>
                        <div className="text-xs text-gray-400 mt-1">Duration: {slot.estimatedDuration} min</div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!slot.completed && (
                          <>
                            <button
                              onClick={() => markTimeSlotComplete(todayPlan.date, slot.id)}
                              className="p-2 rounded-lg bg-green-500/15 hover:bg-green-500/20 text-green-200 border border-green-500/30"
                            >
                              <CheckCircle size={16} />
                            </button>
                            <button
                              onClick={() => skipTimeSlot(todayPlan.date, slot.id)}
                              className="p-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/20 text-amber-200 border border-amber-500/30"
                            >
                              <SkipForward size={16} />
                            </button>
                            <button
                              onClick={() => rescheduleTimeSlot(todayPlan.date, slot.id)}
                              className="p-2 rounded-lg bg-blue-500/15 hover:bg-blue-500/20 text-blue-200 border border-blue-500/30"
                            >
                              <RotateCcw size={16} />
                            </button>
                          </>
                        )}
                        {slot.completed && (
                          <div className="px-3 py-1 text-xs rounded-full bg-green-500/15 border border-green-500/30 text-green-200">
                            ✅ Completed
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400">No study plan for {formatDate(selectedDate)}</div>
                <button
                  onClick={() => setActiveTab('generator')}
                  className="mt-4 px-4 py-2 rounded-lg bg-purple-500/15 hover:bg-purple-500/20 text-purple-200 border border-purple-500/30"
                >
                  Generate Study Plan
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Weekly Planner */}
      {activeTab === 'weekly' && (
        <div className="space-y-6">
          <div className="bg-gray-800/30 border border-gray-700 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Calendar className="text-green-400" size={24} />
                <h3 className="text-xl font-extrabold text-white">📆 Weekly Planner</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentWeek(currentWeek - 1)}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/15 text-white"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm text-gray-300">Week {currentWeek + 1}</span>
                <button
                  onClick={() => setCurrentWeek(currentWeek + 1)}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/15 text-white"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {studyPlan?.weeklyPlan && studyPlan.weeklyPlan.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                {studyPlan.weeklyPlan[currentWeek]?.days?.map((day) => (
                  <div key={day.date} className="bg-gray-900/30 border border-gray-800 rounded-xl p-4">
                    <div className="text-xs text-gray-400 mb-2">
                      {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div className="text-sm font-bold text-white mb-3">
                      {new Date(day.date).getDate()}
                    </div>
                    <div className="space-y-2">
                      {day.subjects.map((subject, index) => (
                        <div
                          key={index}
                          className={`p-2 rounded-lg border cursor-move ${getSubjectColor(subject.subject)}`}
                        >
                          <div className="text-xs font-bold text-white truncate">{subject.subject}</div>
                          <div className="text-xs text-gray-300">{subject.hours}h</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 text-xs text-gray-400">{day.totalHours}h total</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400">No weekly plan available</div>
                <button
                  onClick={() => setActiveTab('generator')}
                  className="mt-4 px-4 py-2 rounded-lg bg-purple-500/15 hover:bg-purple-500/20 text-purple-200 border border-purple-500/30"
                >
                  Generate Study Plan
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Smart Plan Generator */}
      {activeTab === 'generator' && (
        <div className="space-y-6">
          <div className="bg-gray-800/30 border border-gray-700 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Zap className="text-yellow-400" size={24} />
              <h3 className="text-xl font-extrabold text-white">🧠 AI Smart Plan Generator</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Exam Date</label>
                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-gray-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Target Score (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={targetScore}
                  onChange={(e) => setTargetScore(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-gray-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Study Hours Per Day</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={studyHoursPerDay}
                  onChange={(e) => setStudyHoursPerDay(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-gray-200"
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">Select Subjects & Set Priorities</label>
              
              {/* Available Subjects */}
              <div className="mb-4">
                <div className="text-xs text-gray-400 mb-2">Available Subjects (Due after exam date)</div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {getAvailableSubjects.length > 0 ? (
                    getAvailableSubjects.map((subject: any) => (
                      <div key={subject.id} className="flex items-center gap-3 p-3 bg-gray-900/30 border border-gray-800 rounded-lg">
                        <div className="flex-1">
                          <div className="text-white font-bold text-sm">{subject.name}</div>
                          <div className="text-xs text-gray-400">Due: {formatDate(subject.targetDate)}</div>
                          <div className="text-xs text-gray-400">
                            {Array.isArray(subject.chapters) ? subject.chapters.length : 0} chapters
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            onChange={(e) => addSubject(subject, e.target.value as any)}
                            className="px-2 py-1 text-xs rounded border border-white/10 bg-white/5 text-gray-200"
                            defaultValue=""
                          >
                            <option value="" disabled>Select Priority</option>
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                          </select>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-400 py-4">
                      {examDate ? 'No subjects available for selected exam date' : 'Please select exam date first'}
                    </div>
                  )}
                </div>
              </div>

              {/* Selected Subjects */}
              {selectedSubjects.length > 0 && (
                <div>
                  <div className="text-xs text-gray-400 mb-2">Selected Subjects</div>
                  <div className="space-y-2">
                    {selectedSubjects.map((subject) => (
                      <div key={subject.id} className={`flex items-center gap-3 p-3 border rounded-lg ${getPriorityColor(subject.priority)}`}>
                        <div className="flex-1">
                          <div className="text-white font-bold text-sm">{subject.name}</div>
                          <div className="text-xs opacity-75">Due: {formatDate(subject.targetDate)}</div>
                          <div className="text-xs opacity-75">{subject.chapters.length} chapters</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={subject.priority}
                            onChange={(e) => updateSubjectPriority(subject.id, e.target.value as any)}
                            className="px-2 py-1 text-xs rounded border border-white/10 bg-white/5 text-gray-200"
                          >
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                          </select>
                          <button
                            onClick={() => removeSubject(subject.id)}
                            className="p-1 rounded text-red-300 hover:text-red-200"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {planError && (
              <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm">
                {planError}
              </div>
            )}

            <div className="mt-6 flex justify-center">
              <button
                onClick={generateAIPlan}
                disabled={generatingPlan || !examDate || selectedSubjects.length === 0}
                className="inline-flex items-center px-6 py-3 rounded-xl font-extrabold text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {generatingPlan ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={18} />
                    Generating...
                  </>
                ) : (
                  <>
                    <Zap size={18} className="mr-2" />
                    Generate Smart Plan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyPlanContent;
