import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Home,
  BookOpen,
  Folder,
  GraduationCap,
  Brain,
  ClipboardList,
  BarChart2,
  RefreshCw,
  Target,
  Bell,
  Settings as SettingsIcon,
  Plus,
  ChevronDown,
  User,
  LogOut,
  CheckCircle,
  Clock,
  XCircle,
  Lightbulb,
  BarChart,
  Bookmark,
  ArrowLeft,
  Image,
  Mic,
  X,
  Send,
  AlertCircle,
  Calendar,
  FileText,
  UploadCloud,
  Download,
  Trash2,
  Edit2,
  Sparkles,
  Eye,
  ArrowRight,
  Pause,
  Check,
  Smile,
  Meh,
  Frown,
  Loader2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import {
  startLearningSession,
  getUserSessions,
  updateLearningSession,
  completeTopicInSyllabus
} from '../../api/learningApi';
import {
  checkOllamaStatus,
  getOllamaModels,
  sendMessageToAIStream
} from '../../services/aiTutorService';
import { useAuth } from '../../contexts/AuthContext';
import React from 'react';
import { getSyllabuses, createSyllabus, updateSyllabus, deleteSyllabus } from '../../api/syllabusApi';
import Tesseract from 'tesseract.js';
import { db } from '../../firebase';
import { collection, addDoc } from 'firebase/firestore';
import PracticeQuizContent from './PracticeQuizContent';



// Helper function to parse syllabus text
const parseSyllabusText = (text: string): Chapter[] => {
  const lines = text.split('\n');
  const chapters: Chapter[] = [];
  let currentChapter: Partial<Chapter> | null = null;
  let currentDescription: string[] = [];

  // Regex patterns - Relaxed
  const explicitHeaderRegex = /(?:^|[\s|•-])(module|unit|chapter)\s+([\w\d]+)/i;
  const looseRomanRegex = /^\s*[:|•-]?\s*(I|II|III|IV|V|VI|VII|VIII|IX|X)[\s:.-]+(.*)/;
  const subUnitRegex = /^\s*([A-Z][\w\s-]{2,})\s*[:.-]\s*(.*)/;

  const saveCurrentChapter = () => {
    if (currentChapter) {
      currentChapter.description = currentDescription.join('\n\n').trim();
      currentChapter.files = [];
      currentChapter.isExpanded = true;
      if (!currentChapter.id) {
        // Generate a valid MongoDB ObjectId-like 24-char hex string
        currentChapter.id = [...Array(24)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
      }
      chapters.push(currentChapter as Chapter);
    }
  };

  const processContentLine = (line: string): string => {
    // Split by comma or semicolon to get granular topics
    const topics = line.split(/[,.;](?![^(]*\))/).map(t => t.trim()).filter(t => t.length > 2);
    if (topics.length > 1) {
      return topics.map(t => `- ${t}`).join('\n');
    }
    return line;
  };

  lines.forEach((line, i) => {
    let cleanLine = line.trim();
    if (!cleanLine) return; // Skip empty lines

    // Check for Module Headers
    let match = cleanLine.match(explicitHeaderRegex);
    let moduleFound = false;
    let remainder = '';

    if (match) {
      moduleFound = true;
      saveCurrentChapter();
      // match[1] is "Module", match[2] is "1"
      currentChapter = { name: `${match[1]} ${match[2]}` };
      currentDescription = [];

      // Check for content on same line
      const headerIndex = match.index! + match[0].length;
      if (headerIndex < cleanLine.length) {
        remainder = cleanLine.substring(headerIndex).trim();
        remainder = remainder.replace(/^[:|•-]\s*/, '');
      }
    } else {
      const romanMatch = cleanLine.match(looseRomanRegex);
      if (romanMatch) {
        moduleFound = true;
        saveCurrentChapter();
        currentChapter = { name: `Module ${romanMatch[1]}` };
        currentDescription = [];
        remainder = romanMatch[2].trim();
      }
    }

    // If we get here, it's a regular line of text
    // Check if it's a potential header (title case, no ending punctuation)
    // Relaxed rule: Just look for short, distinct lines that might be headers
    // even if they don't have "Module" kwyword, if we haven't found any modules yet.
    // Or if the line matches Roman Numeral or just a number like "1. Introduction"
    const isPotentialHeader =
      (cleanLine.length < 60 && !cleanLine.endsWith('.') && !cleanLine.endsWith(',') && !cleanLine.endsWith(';') && cleanLine.length > 3) &&
      (
        // Starts with Number or Roman Numeral
        /^\d+[\s.)]/.test(cleanLine) ||
        /^[IVX]+[\s.)]/.test(cleanLine) ||
        // Entirely Uppercase or Title Case
        (cleanLine === cleanLine.toUpperCase()) ||
        (cleanLine[0] === cleanLine[0].toUpperCase() && cleanLine.includes(' '))
      );

    if (!moduleFound && isPotentialHeader) {
      // If the next line is empty or indented, it's likely a header
      const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';

      // Heuristic: If we haven't found ANY chapters yet, be more aggressive
      // If we already have "Module 1", likely subsequent headers will look similar.
      // But if we have loose text, treat short bold-looking lines as chapters.
      if (!nextLine || nextLine.startsWith('  ') || nextLine.startsWith('\t')) {
        // Special check: Don't treat "Module No" (header of table) as a chapter if possible
        if (cleanLine.toLowerCase().includes('module no')) {
          return; // Use return instead of continue for forEach
        }

        saveCurrentChapter();
        currentChapter = { name: cleanLine };
        currentDescription = [];
        return; // Use return instead of continue for forEach
      }
    }

    if (currentChapter) {
      if (!moduleFound) {
        // Processing content for current chapter
        const subMatch = cleanLine.match(subUnitRegex);
        if (subMatch) {
          const unitTitle = subMatch[1].trim();
          const content = subMatch[2].trim();

          if (content.length > 0) {
            const formattedContent = processContentLine(content);
            cleanLine = `**${unitTitle}**:\n${formattedContent}`;
          } else {
            cleanLine = `**${unitTitle}**`;
          }
        } else {
          cleanLine = processContentLine(cleanLine);
        }

        currentDescription.push(cleanLine);
      } else if (remainder) {
        const subMatch = remainder.match(subUnitRegex);
        if (subMatch) {
          const unitTitle = subMatch[1].trim();
          const content = subMatch[2].trim();
          if (content.length > 0) {
            const formattedContent = processContentLine(content);
            cleanLine = `**${unitTitle}**:\n${formattedContent}`;
          } else {
            cleanLine = `**${unitTitle}**`;
          }
        } else {
          cleanLine = processContentLine(remainder);
        }
        currentDescription.push(cleanLine);
      }
    }
  });

  saveCurrentChapter();

  // Fallback: If no chapters found, dump all content into one "Extracted Content" chapter
  if (chapters.length === 0 && text.trim().length > 0) {
    const nonEmptyLines = text.split('\n').filter(l => l.trim().length > 0);
    if (nonEmptyLines.length > 0) {
      return [{
        id: [...Array(24)].map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
        name: "Extracted Content",
        description: nonEmptyLines.map(l => `- ${l.trim()}`).join('\n'),
        files: [],
        isExpanded: true
      }];
    }
  }

  return chapters;
};

// Helper function to extract text from images
const extractTextFromImages = async (images: (File | string)[], subjectCodeToMatch?: string): Promise<{ text: string, codeMatched: boolean }> => {
  let fullText = '';
  let codeMatched = false;
  const matchCode = subjectCodeToMatch ? subjectCodeToMatch.toLowerCase().replace(/[^a-z0-9]/g, '') : null;

  for (const image of images) {
    try {
      const { data: { text } } = await Tesseract.recognize(
        image,
        'eng',
        // { logger: m => console.log(m) } // specific logger can be added if needed
      );
      fullText += text + '\n';

      if (matchCode) {
        const cleanText = text.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanText.includes(matchCode)) {
          codeMatched = true;
        }
      }
    } catch (error) {
      console.error("Error recognizing text:", error);
    }
  }

  return { text: fullText, codeMatched: matchCode ? codeMatched : true };
};

// Content components for each section
const OverviewContent = () => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold text-white">Overview</h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-200">Overall Progress</h3>
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
            <BarChart className="text-purple-400" size={24} />
          </div>
        </div>
        <div className="text-3xl font-bold text-white">65%</div>
        <div className="mt-2 w-full bg-gray-700 rounded-full h-2.5">
          <div className="bg-gradient-to-r from-purple-500 to-blue-500 h-2.5 rounded-full" style={{ width: '65%' }}></div>
        </div>
      </div>

      <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-200">Today's Plan</h3>
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
            <Calendar className="text-green-400" size={24} />
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <CheckCircle className="text-green-400" size={16} />
            <span className="text-gray-300">Physics - Motion</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="text-yellow-400" size={16} />
            <span className="text-gray-300">Chemistry - Atomic Structure</span>
          </div>
        </div>
      </div>

      <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-200">Next Topic</h3>
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
            <Lightbulb className="text-blue-400" size={24} />
          </div>
        </div>
        <h4 className="text-xl font-semibold text-white mb-2">Work & Energy</h4>
        <p className="text-gray-400 text-sm">Recommended based on your progress</p>
      </div>
    </div>
  </div>
);

interface FileItem {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  status: 'not-started' | 'in-progress' | 'completed';
  uploadedAt: string;
}

interface Chapter {
  id: string;
  name: string;
  description?: string;
  targetDate?: string;
  files: FileItem[];
  isExpanded: boolean;
}

interface SyllabusItem {
  id: string;
  _id?: string;
  name: string;
  subjectCode?: string;
  description: string;
  targetDate: string;
  priority: 'high' | 'medium' | 'low';
  type: 'theory' | 'practical' | 'combined';
  chapters: Chapter[];
  studyMaterials: FileItem[];
  attachments: Array<{
    name: string;
    type: string;
    url: string;
  }>;
  isExpanded: boolean;
  progress: number;
  status: 'completed' | 'in-progress' | 'pending';
}

// --- Study Material Components ---

const FileItemCard: React.FC<{
  file: FileItem;
  onStatusChange: (status: FileItem['status']) => void;
  onDownload: () => void;
  onDelete: () => void;
  onView: () => void;
  onExtractTopics?: () => void;
}> = ({ file, onStatusChange, onDownload, onDelete, onView, onExtractTopics }) => {
  const statusOptions: { value: FileItem['status']; label: string; color: string }[] = [
    { value: 'not-started', label: 'Not Started', color: 'text-gray-400' },
    { value: 'in-progress', label: 'In Progress', color: 'text-yellow-400' },
    { value: 'completed', label: 'Completed', color: 'text-green-400' },
  ];

  return (
    <div className="group relative bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-purple-500/30 hover:bg-white/10">
      <div className="flex items-center space-x-4 flex-1 min-w-0">
        <div className={`p-3 rounded-xl bg-gradient-to-br ${file.type.includes('pdf') ? 'from-red-500/20 to-orange-500/20' :
          file.type.includes('ppt') ? 'from-orange-500/20 to-yellow-500/20' :
            'from-blue-500/20 to-purple-500/20'
          }`}>
          <FileText className={
            file.type.includes('pdf') ? 'text-red-400' :
              file.type.includes('ppt') ? 'text-orange-400' :
                'text-blue-400'
          } size={24} />
        </div>
        <div className="min-w-0">
          <h5 className="text-white font-bold truncate text-sm md:text-base">{file.name}</h5>
          <div className="flex items-center space-x-2 text-xs text-gray-400 mt-1">
            <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
            <span>•</span>
            <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center flex-wrap gap-2 md:gap-4">
        <div className="flex items-center bg-black/30 rounded-lg p-1 border border-white/5">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onStatusChange(opt.value)}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${file.status === opt.value
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-300'
                }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onView}
            className="p-2 text-gray-400 hover:text-purple-400 hover:bg-purple-400/10 rounded-lg transition-all"
            title="Open/View"
          >
            <Eye size={18} />
          </button>
          <button
            onClick={onDownload}
            className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all"
            title="Download"
          >
            <Download size={18} />
          </button>
          <button
            onClick={onExtractTopics}
            className="p-2 text-gray-400 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-all"
            title="Extract Topics with AI"
          >
            <Sparkles size={18} />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
            title="Delete"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

const StudyMaterialsView: React.FC<{
  subjects: SyllabusItem[];
  onUpdateSubject: (subject: SyllabusItem) => Promise<SyllabusItem>;
  onViewFile: (file: FileItem) => void;
}> = ({ subjects, onUpdateSubject, onViewFile }) => {
  const [expandedSubject, setExpandedSubject] = useState<string | null>(subjects[0]?.id || null);

  const handleUpload = async (subjectId: string, files: FileList | null) => {
    if (!files) return;
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return;

    const newMaterials: FileItem[] = [];
    const existingNames = new Set(subject.studyMaterials?.map(m => m.name) || []);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (file.size > 10 * 1024 * 1024) {
        alert(`${file.name} is too large. Max size is 10MB.`);
        continue;
      }

      const trimmedName = file.name.length > 50
        ? file.name.substring(0, 47) + '...' + file.name.substring(file.name.lastIndexOf('.'))
        : file.name;

      if (existingNames.has(trimmedName)) {
        alert(`${trimmedName} already exists in this subject.`);
        continue;
      }

      const reader = new FileReader();
      const base64: string = await new Promise((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      newMaterials.push({
        id: Math.random().toString(36).substr(2, 9),
        name: trimmedName,
        type: file.type,
        size: file.size,
        url: base64,
        status: 'not-started',
        uploadedAt: new Date().toISOString()
      });
    }

    if (newMaterials.length > 0) {
      const updatedSubject = {
        ...subject,
        studyMaterials: [...(subject.studyMaterials || []), ...newMaterials]
      };
      await onUpdateSubject(updatedSubject);
    }
  };

  const handleStatusChange = async (subjectId: string, materialId: string, newStatus: FileItem['status']) => {
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return;

    const updatedMaterials = subject.studyMaterials.map(m =>
      m.id === materialId ? { ...m, status: newStatus } : m
    );

    const updatedSubject = {
      ...subject,
      studyMaterials: updatedMaterials
    };
    await onUpdateSubject(updatedSubject);
  };

  const handleDelete = async (subjectId: string, materialId: string) => {
    if (!window.confirm('Are you sure you want to delete this material?')) return;

    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return;

    const updatedMaterials = subject.studyMaterials.filter(m => m.id !== materialId);
    const updatedSubject = {
      ...subject,
      studyMaterials: updatedMaterials
    };
    await onUpdateSubject(updatedSubject);
  };

  const handleDownload = (file: FileItem) => {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (subjects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 bg-gray-900/50 backdrop-blur-sm rounded-3xl border border-white/5 border-dashed text-center animate-fade-in">
        <Folder size={48} className="text-gray-500 mb-4" />
        <h3 className="text-xl font-bold text-white">No Subjects Found</h3>
        <p className="text-gray-400 text-sm">Add a subject in the Syllabus tab first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {subjects.map((subject) => (
        <div
          key={subject.id}
          className={`group flex flex-col bg-[#121212]/80 backdrop-blur-xl border rounded-2xl overflow-hidden transition-all duration-300 ${expandedSubject === subject.id ? 'border-purple-500/30 ring-1 ring-purple-500/20 shadow-2xl shadow-purple-500/10' : 'border-white/10 hover:border-white/20'
            }`}
        >
          <div
            className="flex items-center justify-between p-5 cursor-pointer select-none"
            onClick={() => setExpandedSubject(expandedSubject === subject.id ? null : subject.id)}
          >
            <div className="flex items-center space-x-4">
              <div className={`p-2.5 rounded-xl transition-all ${expandedSubject === subject.id ? 'bg-gradient-to-br from-purple-500 to-blue-600 text-white shadow-lg' : 'bg-white/5 text-gray-400'
                }`}>
                <Folder size={20} />
              </div>
              <div>
                <h4 className="font-bold text-white tracking-wide text-lg">{subject.name}</h4>
                <div className="flex items-center space-x-2 mt-0.5">
                  <span className="text-[10px] bg-white/5 text-gray-400 px-2 py-0.5 rounded-full uppercase font-bold tracking-tighter">
                    {subject.subjectCode || 'No Code'}
                  </span>
                  <span className="text-[10px] text-gray-600 font-bold uppercase tracking-tighter">
                    {subject.studyMaterials?.length || 0} Resources
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-2">
                <div className="h-1.5 w-24 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500"
                    style={{ width: `${(subject.studyMaterials?.filter(m => m.status === 'completed').length / (subject.studyMaterials?.length || 1)) * 100}%` }}
                  />
                </div>
              </div>
              <ChevronDown
                className={`text-gray-500 transition-transform duration-500 ${expandedSubject === subject.id ? 'rotate-180 text-white' : ''}`}
                size={20}
              />
            </div>
          </div>

          {expandedSubject === subject.id && (
            <div className="p-6 pt-0 bg-black/20 border-t border-white/5 animate-fade-in">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 mt-6">
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-1 bg-purple-500 rounded-full"></div>
                  <h5 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-200 to-gray-400 uppercase tracking-widest text-[10px]">Study Materials</h5>
                </div>
                <label className="group relative flex items-center justify-center px-5 py-2.5 bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-xl cursor-pointer hover:from-purple-600/30 hover:to-blue-600/30 hover:border-purple-500/50 transition-all shadow-lg hover:scale-[1.02]">
                  <UploadCloud size={16} className="mr-2 text-purple-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Upload Files</span>
                  <input
                    type="file"
                    className="hidden"
                    multiple
                    onChange={(e) => handleUpload(subject.id, e.target.files)}
                    accept=".pdf,.ppt,.pptx,.doc,.docx,.jpg,.jpeg,.png"
                  />
                </label>
              </div>

              <div className="space-y-3">
                {subject.studyMaterials && subject.studyMaterials.length > 0 ? (
                  subject.studyMaterials.map((material) => (
                    <FileItemCard
                      key={material.id}
                      file={material}
                      onStatusChange={(status) => handleStatusChange(subject.id, material.id, status)}
                      onDownload={() => handleDownload(material)}
                      onDelete={() => handleDelete(subject.id, material.id)}
                      onView={() => onViewFile(material)}
                    />
                  ))
                ) : (
                  <div className="text-center py-16 border border-dashed border-white/10 rounded-3xl bg-white/5">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                      <UploadCloud size={32} className="text-gray-600" />
                    </div>
                    <p className="text-gray-400 font-medium">No materials uploaded yet</p>
                    <p className="text-[10px] text-gray-600 mt-2 uppercase tracking-widest font-bold">PDF • PPT • DOC • IMAGES</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const SyllabusTrackerContent: React.FC<any> = ({
  syllabusItems,
  onUpdateSubject,
  onDeleteSubject,
  onToggleExpand,
  onAddChapter,
  onToggleChapterExpand,
  onToggleFileStatus,
  onRemoveFile,
  onDownloadFile,
  onViewFile,
  onExtractTopics,
  setSyllabusItems
}) => {
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'syllabus' | 'study-material'>('syllabus');
  const [isDragging, setIsDragging] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [syllabus, setSyllabus] = useState<Omit<SyllabusItem, 'id' | 'progress' | 'status' | 'isExpanded' | 'chapters' | 'attachments'>>({
    name: '',
    subjectCode: '',
    description: '',
    targetDate: new Date().toISOString().split('T')[0],
    priority: 'medium',
    type: 'theory',
    studyMaterials: []
  });

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(Array.from(e.target.files));
  };

  const handleFiles = (files: File[]) => {
    const validFiles = files.filter(file => {
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
      return validTypes.includes(file.type) && file.size <= 10 * 1024 * 1024;
    });

    if (validFiles.length > 0) setAttachments((prev: File[]) => [...prev, ...validFiles]);
  };

  const removeAttachment = (index: number) => setAttachments((prev: File[]) => prev.filter((_, i) => i !== index));

  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setAttachments((prev: File[]) => [...prev, ...Array.from(e.target.files!)]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSyllabus(prev => ({ ...prev, [name]: value }));
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!syllabus.name.trim() || !syllabus.targetDate || !syllabus.subjectCode?.trim()) return;

    try {
      const processedAttachments = await Promise.all(
        attachments.map(async (file) => {
          const base64 = await fileToBase64(file);
          return { name: file.name, type: file.type, url: base64 };
        })
      );
      const newSubject: SyllabusItem = {
        ...syllabus,
        id: Math.random().toString(36).substr(2, 9),
        attachments: processedAttachments,
        chapters: [],
        studyMaterials: [],
        isExpanded: true,
        progress: 0,
        status: 'pending' as const
      };

      const savedSyllabus = await createSyllabus(newSubject);
      setSyllabusItems((prev: any) => [savedSyllabus, ...prev]);
      resetForm();
      setShowForm(false);
    } catch (error) {
      console.error('Error saving syllabus:', error);
      alert('Failed to save syllabus.');
    }
  };

  const resetForm = () => {
    setSyllabus({
      name: '', subjectCode: '', description: '',
      targetDate: new Date().toISOString().split('T')[0],
      priority: 'medium', type: 'theory',
      studyMaterials: []
    });
    setAttachments([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-400 tracking-tight mb-2">
            Syllabus Tracker
          </h2>
          <p className="text-gray-400 text-sm">Manage your curriculum, extract topics with AI, and track your progress.</p>
        </div>

        <div className="flex bg-gray-900/50 backdrop-blur-sm p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setActiveTab('syllabus')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'syllabus'
              ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
          >
            <BookOpen size={18} />
            <span>Syllabus</span>
          </button>
          <button
            onClick={() => setActiveTab('study-material')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'study-material'
              ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
          >
            <Folder size={18} />
            <span>Study Materials</span>
          </button>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="group relative inline-flex items-center justify-center px-6 py-3 font-bold text-white transition-all duration-200 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl hover:from-purple-500 hover:to-blue-500 focus:outline-none ring-offset-2 focus:ring-2 ring-purple-500 shadow-lg shadow-purple-500/30 hover:scale-105"
        >
          <Plus size={20} className="mr-2 transition-transform group-hover:rotate-90" />
          <span>Add New Subject</span>
        </button>
      </div>

      {activeTab === 'syllabus' ? (
        <>
          {syllabusItems.length === 0 && !showForm && (
            <div className="flex flex-col items-center justify-center py-20 px-4 bg-gray-900/50 backdrop-blur-sm rounded-3xl border border-white/5 border-dashed text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
                <BookOpen size={48} className="text-white opacity-80" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">No Subjects Added Yet</h3>
              <p className="text-gray-400 max-w-md mb-8 leading-relaxed">
                Your learning journey starts here. Add a subject to organize your study materials and track your progress effectively.
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center px-8 py-4 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-all transform hover:scale-105 shadow-xl"
              >
                <Plus size={20} />
                <span>Add Your First Subject</span>
              </button>
            </div>
          )}

          <div className="space-y-6">
            {syllabusItems?.map((subject: any, index: number) => (
              <SubjectCard
                key={subject._id || subject.id || index}
                subject={subject}
                onToggleExpand={onToggleExpand}
                onAddChapter={onAddChapter}
                onEditSubject={onUpdateSubject}
                onDeleteSubject={onDeleteSubject}
                onToggleFileStatus={onToggleFileStatus}
                onRemoveFile={onRemoveFile}
                onDownloadFile={onDownloadFile}
                onViewFile={onViewFile}
                onToggleChapterExpand={onToggleChapterExpand}
                onExtractTopics={onExtractTopics}
              />
            ))}
          </div>
        </>
      ) : (
        <StudyMaterialsView
          subjects={syllabusItems}
          onUpdateSubject={onUpdateSubject}
          onViewFile={onViewFile}
        />
      )}

      {/* Add Subject Form */}
      {showForm && (
        <div className="relative bg-[#121212]/90 backdrop-blur-xl p-8 rounded-2xl border border-white/10 mb-8 animate-fade-in shadow-2xl">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 rounded-t-2xl"></div>
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-2xl font-bold text-white">Add New Syllabus</h3>
              <p className="text-gray-400 text-sm mt-1">Fill in the details to create a new study track.</p>
            </div>
            <button
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
            >
              <XCircle size={28} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Subject Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
                  Subject Name <span className="text-red-500">*</span>
                </label>


                <input
                  type="text"
                  className="mt-2 w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter new subject name"
                  value={syllabus.name}
                  onChange={(e) => setSyllabus({ ...syllabus, name: e.target.value })}
                  autoFocus
                />

              </div>

              <div>
                <label htmlFor="subjectCode" className="block text-sm font-medium text-gray-300 mb-1">
                  Subject Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="subjectCode"
                  name="subjectCode"
                  value={syllabus.subjectCode || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="E.g., PHY101"
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">
                Description (Optional)
              </label>
              <textarea
                id="description"
                name="description"
                value={syllabus.description}
                onChange={handleInputChange}
                rows={2}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Brief description about the syllabus"
              />
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Syllabus File (PDF, DOC, DOCX, JPG, PNG)
              </label>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${isDragging ? 'border-purple-500 bg-purple-500/10' : 'border-gray-600 hover:border-purple-500/50'
                  }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInput}
                  className="hidden"
                  accept=".pdf,image/jpeg,image/png,image/jpg,image/webp"
                  multiple
                />
                <div className="space-y-2">
                  <UploadCloud className="mx-auto h-10 w-10 text-gray-400" />
                  <p className="text-sm text-gray-400">
                    <span className="font-medium text-purple-400 hover:text-purple-300 cursor-pointer">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">PDF, JPG, PNG, or WebP (max 10MB each)</p>
                </div>
              </div>

              {attachments.length > 0 && (
                <div className="mt-2 space-y-2">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-700/50 p-2 rounded-lg">
                      <div className="flex items-center space-x-2">
                        {file.type.startsWith('image/') ? (
                          <img
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                            className="w-8 h-8 object-cover rounded"
                          />
                        ) : (
                          <FileText className="text-purple-400" size={20} />
                        )}
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-200 truncate max-w-[180px]">{file.name}</span>
                          <span className="text-xs text-gray-400">
                            {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeAttachment(index);
                        }}
                        className="text-gray-400 hover:text-red-400 p-1"
                        title="Remove file"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Target Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="targetDate" className="block text-sm font-medium text-gray-300 mb-1">
                  Target Completion Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="targetDate"
                  name="targetDate"
                  value={syllabus.targetDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-300 mb-1">
                  Priority
                </label>
                <select
                  id="priority"
                  name="priority"
                  value={syllabus.priority}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-300 mb-1">
                  Syllabus Type
                </label>
                <select
                  id="type"
                  name="type"
                  value={syllabus.type}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="theory">Theory</option>
                  <option value="practical">Practical</option>
                  <option value="combined">Combined</option>
                </select>
              </div>
            </div>

            {/* Attachments */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-300">
                  Reference Attachments (Optional)
                </label>
                <button
                  type="button"
                  onClick={() => document.getElementById('attachments')?.click()}
                  className="text-xs text-purple-400 hover:text-purple-300 flex items-center"
                >
                  <Plus size={14} className="mr-1" /> Add Files
                </button>
                <input
                  id="attachments"
                  type="file"
                  multiple
                  onChange={handleAttachmentUpload}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                />
              </div>

              {attachments.length > 0 && (
                <div className="space-y-2 mt-2">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-700/50 p-2 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <FileText className="text-gray-400" size={16} />
                        <span className="text-sm text-gray-200">{file.name}</span>
                        <span className="text-xs text-gray-400">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="text-gray-400 hover:text-red-400"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                Clear Form
              </button>
              <button
                type="submit"
                className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 rounded-lg transition-colors flex items-center justify-center"
                disabled={!syllabus.name.trim() || !syllabus.targetDate || !syllabus.subjectCode?.trim()}
              >
                <Plus size={16} className="mr-2" />
                Add Syllabus
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

const TopicGrid: React.FC<{
  text: string;
  onUpdate: (newText: string) => void;
}> = ({ text, onUpdate }) => {
  // Parse text into structured data
  const parseText = (inputText: string) => {
    const rows: { section: string; topics: { text: string; completed: boolean }[] }[] = [];
    let currentSection = "";
    let currentTopics: { text: string; completed: boolean }[] = [];

    inputText.split('\n').forEach(line => {
      const cleanLine = line.trim();
      if (!cleanLine) return;

      const isHeader = /^\*\*.*\*\*[:]?$/.test(cleanLine) || cleanLine.endsWith(':');

      if (isHeader) {
        if (currentSection || currentTopics.length > 0) {
          rows.push({ section: currentSection || "Topics", topics: currentTopics });
        }
        currentSection = cleanLine.replace(/\*\*/g, '').replace(':', '').trim();
        currentTopics = [];
      } else {
        // Check for checkbox
        const isCompleted = /^[-•*]\s*\[x\]/i.test(cleanLine);
        // Remove bullet and checkbox
        let topicText = cleanLine.replace(/^[-•*]\s*(\[[ x]\]\s*)?/, '').trim();

        if (topicText) {
          currentTopics.push({ text: topicText, completed: isCompleted });
        }
      }
    });

    if (currentSection || currentTopics.length > 0) {
      rows.push({ section: currentSection || "Topics", topics: currentTopics });
    }

    return rows;
  };

  const sections = parseText(text);

  const generateMarkdown = (newSections: typeof sections) => {
    return newSections.map(section => {
      const header = section.section !== "Topics" ? `**${section.section}**:` : "";
      const topics = section.topics.map(t =>
        `- [${t.completed ? 'x' : ' '}] ${t.text}`
      ).join('\n');
      return `${header}\n${topics}`;
    }).join('\n\n').trim();
  };

  const toggleTopic = (sectionIdx: number, topicIdx: number) => {
    const newSections = [...sections];
    newSections[sectionIdx].topics[topicIdx].completed = !newSections[sectionIdx].topics[topicIdx].completed;
    onUpdate(generateMarkdown(newSections));
  };

  const removeTopic = (sectionIdx: number, topicIdx: number) => {
    if (window.confirm('Are you sure you want to remove this topic?')) {
      const newSections = [...sections];
      newSections[sectionIdx].topics.splice(topicIdx, 1);
      // Remove section if empty
      if (newSections[sectionIdx].topics.length === 0 && newSections[sectionIdx].section === "Topics") {
        newSections.splice(sectionIdx, 1);
      }
      onUpdate(generateMarkdown(newSections));
    }
  };

  if (text.trim().length === 0) return null;

  return (
    <div className="space-y-6 mb-4">
      {sections.map((row, sectionIdx) => (
        <div key={sectionIdx} className="space-y-3">
          {row.section !== "Topics" && (
            <div className="flex items-center space-x-2 mb-2">
              <div className="h-4 w-1 bg-gradient-to-b from-purple-500 to-blue-500 rounded-full"></div>
              <h5 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-blue-300 text-sm uppercase tracking-wider">
                {row.section}
              </h5>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {row.topics.map((topic, topicIdx) => (
              <div
                key={topicIdx}
                className={`group relative flex items-start justify-between p-3 rounded-xl border backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] ${topic.completed
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/10'
                  }`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity duration-300 pointer-events-none" />

                <div className="flex items-start space-x-3 flex-1 min-w-0 z-10">
                  <button
                    onClick={() => toggleTopic(sectionIdx, topicIdx)}
                    className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-lg border flex items-center justify-center transition-all duration-300 ${topic.completed
                      ? 'bg-gradient-to-br from-green-500 to-emerald-600 border-transparent text-white shadow-[0_0_10px_rgba(34,197,94,0.4)]'
                      : 'border-gray-600 bg-gray-800/50 hover:border-purple-400 group-hover:bg-gray-800'
                      }`}
                  >
                    {topic.completed && <CheckCircle size={12} strokeWidth={4} />}
                  </button>
                  <span className={`text-sm leading-snug font-medium transition-colors duration-300 ${topic.completed ? 'text-gray-500 line-through' : 'text-gray-200 group-hover:text-white'
                    }`}>
                    {topic.text}
                  </span>
                </div>

                <button
                  onClick={() => removeTopic(sectionIdx, topicIdx)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all z-10"
                  title="Remove topic"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const ChapterItem: React.FC<{
  chapter: Chapter;
  onToggleExpand: (id: string) => void;
  onToggleFileStatus: (chapterId: string, fileId: string) => void;
  onRemoveFile: (chapterId: string, fileId: string) => void;
  onDownloadFile: (file: FileItem) => void;
  onViewFile: (file: FileItem) => void;
  onUpdateDescription: (chapterId: string, newDescription: string) => void;
}> = ({ chapter, onToggleExpand, onToggleFileStatus, onRemoveFile, onDownloadFile, onViewFile, onUpdateDescription }) => {


  const calculateProgress = () => {
    if (!chapter.description) return 0;

    let total = 0;
    let completed = 0;

    const lines = chapter.description.split('\n');
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.match(/^[-•*]\s*\[[ x]\]/i)) {
        total++;
        if (trimmed.match(/^[-•*]\s*\[x\]/i)) {
          completed++;
        }
      }
    });

    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  const progress = calculateProgress();

  return (
    <div className="border border-white/5 bg-white/5 rounded-xl overflow-hidden mb-3 transition-all duration-300 hover:border-purple-500/30">
      <div
        className="flex justify-between items-center p-4 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => onToggleExpand(chapter.id)}
      >
        <div className="flex items-center space-x-4">
          <div className={`p-1.5 rounded-lg bg-white/5 transition-transform duration-300 ${chapter.isExpanded ? 'rotate-180 bg-white/10' : ''}`}>
            <ChevronDown size={16} className="text-gray-400" />
          </div>
          <div>
            <h4 className="font-bold text-gray-200 text-sm tracking-wide">{chapter.name}</h4>
            {chapter.targetDate && (
              <div className="flex items-center mt-1 text-xs text-gray-500">
                <Calendar size={10} className="mr-1" />
                {new Date(chapter.targetDate).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex flex-col items-end">
            <span className="text-xs font-bold text-white mb-1">{progress}% Complete</span>
            <div className="w-24 bg-gray-800 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r transition-all duration-500 ${progress === 100 ? 'from-green-400 to-emerald-500' : 'from-blue-400 to-purple-500'
                  }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {chapter.isExpanded && (
        <div className="p-4 bg-black/20 border-t border-white/5">
          {chapter.description && (
            <TopicGrid
              text={chapter.description}
              onUpdate={(newDesc) => onUpdateDescription(chapter.id, newDesc)}
            />
          )}



          {chapter.files.length > 0 && (
            <div className="space-y-2 mt-3">
              {chapter.files.map((file) => (
                <div key={file.id} className="flex items-center justify-between bg-gray-700/50 p-2 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <FileText size={16} className="text-gray-400" />
                    <span className="text-sm text-gray-200">{file.name}</span>
                    <span className="text-xs text-gray-400">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onToggleFileStatus(chapter.id, file.id)}
                      className={`text-xs px-2 py-1 rounded ${file.status === 'completed'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                        }`}
                    >
                      {file.status === 'completed' ? '✓ Completed' : 'Mark as Completed'}
                    </button>
                    <button
                      onClick={() => onViewFile(file)}
                      className="text-gray-400 hover:text-purple-400"
                      title="View"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => onDownloadFile(file)}
                      className="text-gray-400 hover:text-blue-400"
                      title="Download"
                    >
                      <Download size={16} />
                    </button>
                    <button
                      onClick={() => onRemoveFile(chapter.id, file.id)}
                      className="text-gray-400 hover:text-red-400"
                      title="Remove"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const SubjectCard: React.FC<{
  subject: SyllabusItem;
  onToggleExpand: (id: string) => void;
  onAddChapter: (subjectId: string) => void;
  onEditSubject: (subject: SyllabusItem) => void;
  onDeleteSubject: (id: string) => void;
  onToggleFileStatus: (subjectId: string, chapterId: string, fileId: string) => void;
  onRemoveFile: (subjectId: string, chapterId: string, fileId: string) => void;
  onDownloadFile: (file: FileItem) => void;
  onViewFile: (file: FileItem) => void;
  onToggleChapterExpand: (subjectId: string, chapterId: string) => void;
  onExtractTopics: (subjectId: string) => void;
}> = ({
  subject,
  onToggleExpand,
  onEditSubject,
  onDeleteSubject,
  onToggleFileStatus,
  onRemoveFile,
  onDownloadFile,
  onViewFile,
  onToggleChapterExpand,
  onExtractTopics
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedName, setEditedName] = useState(subject.name);
    const [editedDescription, setEditedDescription] = useState(subject.description);

    const handleSave = () => {
      onEditSubject({
        ...subject,
        name: editedName,
        description: editedDescription
      });
      setIsEditing(false);
    };

    const getPriorityColor = () => {
      switch (subject.priority) {
        case 'high': return 'bg-red-500/20 text-red-400';
        case 'medium': return 'bg-yellow-500/20 text-yellow-400';
        case 'low': return 'bg-green-500/20 text-green-400';
        default: return 'bg-gray-700 text-gray-300';
      }
    };

    const getTypeColor = () => {
      switch (subject.type) {
        case 'theory': return 'bg-blue-500/20 text-blue-400';
        case 'practical': return 'bg-purple-500/20 text-purple-400';
        case 'combined': return 'bg-indigo-500/20 text-indigo-400';
        default: return 'bg-gray-700 text-gray-300';
      }
    };

    const isOverdue = new Date(subject.targetDate) < new Date() && subject.progress < 100;

    const handleExtractTopicsClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      onExtractTopics(subject.id);
    };

    const handleUpdateChapter = (chapterId: string, newDescription: string) => {
      const newS = { ...subject };
      const chapterIndex = newS.chapters.findIndex(c => c.id === chapterId);
      if (chapterIndex !== -1) {
        newS.chapters[chapterIndex] = {
          ...newS.chapters[chapterIndex],
          description: newDescription
        };
        onEditSubject(newS);
      }
    };

    return (
      <div className="group relative bg-[#121212] bg-opacity-80 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden transition-all duration-300 hover:border-purple-500/30 hover:shadow-[0_0_30px_rgba(168,85,247,0.15)]">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>

        <div
          className="relative p-5 cursor-pointer z-10"
          onClick={() => onToggleExpand(subject.id)}
        >
          {/* ... Subject Header ... */}
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              {isEditing ? (
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="text-2xl font-bold bg-gray-800 text-white border-b-2 border-purple-500 rounded px-2 py-1 focus:outline-none"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <h3 className="text-2xl font-bold text-white tracking-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-300 transition-all">
                  {subject.name}
                </h3>
              )}

              <div className="flex items-center space-x-3">
                {subject.subjectCode && (
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">
                    {subject.subjectCode}
                  </span>
                )}
                <div className="flex space-x-2">
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full tracking-wide shadow-sm ${getPriorityColor()}`}>
                    {subject.priority}
                  </span>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full tracking-wide shadow-sm ${getTypeColor()}`}>
                    {subject.type}
                  </span>
                </div>
              </div>

              {isEditing ? (
                <textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  className="mt-2 w-full text-sm bg-gray-800 text-gray-200 rounded p-3 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  rows={2}
                  placeholder="Add description..."
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                subject.description && (
                  <p className="mt-2 text-sm text-gray-400 line-clamp-2 max-w-2xl leading-relaxed">
                    {subject.description}
                  </p>
                )
              )}
            </div>

            <div className="flex items-center space-x-3">
              <div className="text-right">
                <div className="text-3xl font-bold text-white leading-none">
                  {subject.progress}<span className="text-sm text-gray-500 font-normal">%</span>
                </div>
                <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Completion</div>
              </div>

              <div className="relative w-14 h-14 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-gray-800" />
                  <circle
                    cx="28" cy="28" r="24"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 24}
                    strokeDashoffset={2 * Math.PI * 24 * (1 - subject.progress / 100)}
                    className={`transition-all duration-1000 ease-out ${subject.progress === 100 ? 'text-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]' :
                      subject.progress > 50 ? 'text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]' :
                        'text-purple-500 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]'
                      }`}
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4">
            <div className="flex items-center space-x-1 text-xs font-medium text-gray-400 bg-gray-800/50 px-3 py-1.5 rounded-full border border-white/5">
              <Calendar size={14} className="text-purple-400" />
              <span>Target:</span>
              <span className={isOverdue ? 'text-red-400' : 'text-gray-200'}>
                {new Date(subject.targetDate).toLocaleDateString()}
                {isOverdue && ' (Overdue)'}
              </span>
            </div>

            <div className="flex space-x-2">
              {isEditing ? (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSave();
                    }}
                    className="text-xs px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-lg shadow-blue-500/20 transition-all hover:scale-105"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditing(false);
                      setEditedName(subject.name);
                      setEditedDescription(subject.description);
                    }}
                    className="text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <div className="flex bg-gray-800/50 rounded-lg p-1 border border-white/5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditing(true);
                      }}
                      className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-all"
                      title="Edit Subject"
                    >
                      <Edit2 size={14} />
                    </button>
                    <div className="w-px bg-white/10 my-1 mx-1"></div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSubject(subject.id);
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all"
                      title="Delete subject"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {subject.chapters.length === 0 && (
                    <button
                      onClick={handleExtractTopicsClick}
                      className="ml-2 px-4 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-lg shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 flex items-center border border-white/10"
                      title="Extract Topics"
                    >
                      <Brain size={14} className="mr-2" />
                      <span>Extract Topics with AI</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {subject.isExpanded && (
          <div className="relative border-t border-white/5 bg-black/20 backdrop-blur-md animate-fade-in">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent"></div>

            <div className="p-6">


              <div className="space-y-4">
                {subject.chapters.length > 0 ? (
                  subject.chapters.map((chapter, index) => (
                    <ChapterItem
                      key={chapter.id || index}
                      chapter={chapter}
                      onToggleExpand={() => onToggleChapterExpand(subject.id, chapter.id)}
                      onToggleFileStatus={(chapterId, fileId) => onToggleFileStatus(subject.id, chapterId, fileId)}
                      onRemoveFile={(chapterId, fileId) => onRemoveFile(subject.id, chapterId, fileId)}
                      onDownloadFile={onDownloadFile}
                      onViewFile={onViewFile}
                      onUpdateDescription={handleUpdateChapter}
                    />
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 bg-white/5 rounded-2xl border border-white/5 border-dashed group hover:border-purple-500/30 transition-colors">
                    <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <BookOpen size={24} className="text-gray-500 group-hover:text-purple-400 transition-colors" />
                    </div>
                    <p className="text-gray-300 font-medium">No content extracted yet</p>
                    <p className="text-xs text-gray-500 mt-1 max-w-xs text-center">Use the AI extraction tool to automatically generate chapters from your syllabus file.</p>
                  </div>
                )}
              </div>

              {subject.attachments && subject.attachments.length > 0 && (
                <div className="mt-8 pt-6 border-t border-white/5">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Reference Files</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {subject.attachments.map((file, index) => (
                      <div key={`${file.name}-${index}`} className="group flex items-center justify-between p-3 bg-gray-800/50 hover:bg-gray-800 rounded-xl border border-white/5 hover:border-purple-500/20 transition-all cursor-pointer">
                        <div className="flex items-center space-x-3 overflow-hidden">
                          <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                            <FileText size={18} className="text-blue-400" />
                          </div>
                          <span className="text-sm text-gray-300 truncate font-medium group-hover:text-white transition-colors">{file.name}</span>
                        </div>
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-gray-500 hover:text-blue-400 bg-transparent hover:bg-blue-500/10 rounded-lg transition-all"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Download size={16} />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };


// Add more content components for other sections as needed
const AILearningContent: React.FC<any> = ({ syllabusItems, currentUser }) => {
  const [activeSession, setActiveSession] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [showNewTopicModal, setShowNewTopicModal] = useState(false);
  const [startingSession, setStartingSession] = useState(false);
  const [feedbackSession, setFeedbackSession] = useState<any>(null);

  // Load user sessions on mount
  useEffect(() => {
    if (currentUser) {
      loadSessions();
    }
  }, [currentUser]);

  const loadSessions = async () => {
    try {
      const data = await getUserSessions(currentUser.uid);
      setSessions(data);
    } catch (error) {
      console.error("Failed to load sessions:", error);
    }
  };

  const handleStartNewSession = async (formData: any) => {
    try {
      setStartingSession(true);
      const newSession = await startLearningSession({
        userId: currentUser.uid,
        ...formData
      });
      setActiveSession(newSession);
      setShowNewTopicModal(false);
      loadSessions();
    } catch (error: any) {
      console.error("Error starting learning session:", error);
      const backendError = error.response?.data?.error || error.response?.data?.message || "AI tutor is briefly unavailable. Please try again in a moment.";
      alert(`Start Session Error: ${backendError}`);
    } finally {
      setStartingSession(false);
    }
  };

  const handleResumeSession = (session: any) => {
    setActiveSession(session);
  };

  const handleUpdateSession = async (updates: any) => {
    if (!activeSession) return;
    try {
      const updated = await updateLearningSession(activeSession._id, updates);
      setActiveSession(updated);
      loadSessions();
    } catch (error) {
      console.error("Update failed:", error);
    }
  };

  const handleMarkAsLearned = async () => {
    if (!activeSession) return;
    try {
      await completeTopicInSyllabus(activeSession.subjectId, activeSession.topic);
      await handleUpdateSession({ status: 'completed' });
      setFeedbackSession(activeSession);
      setActiveSession(null);
    } catch (error) {
      alert("Failed to update syllabus.");
    }
  };

  if (activeSession) {
    return (
      <LearningSessionView
        session={activeSession}
        onUpdate={handleUpdateSession}
        onMarkAsLearned={handleMarkAsLearned}
        onBack={() => setActiveSession(null)}
      />
    );
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-extrabold text-white mb-2 tracking-tight">AI Learning</h2>
          <p className="text-gray-400">Structured AI-powered learning aligned with your syllabus.</p>
        </div>
        <button
          onClick={() => setShowNewTopicModal(true)}
          className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-2xl font-bold hover:scale-105 transition-all shadow-xl shadow-purple-500/20 flex items-center gap-2"
        >
          <Plus size={20} />
          Start New Topic
        </button>
      </div>

      {/* Continue Learning */}
      {sessions.filter(s => s.status !== 'completed').length > 0 && (
        <section className="space-y-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Clock size={20} className="text-purple-400" />
            Continue Learning
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.filter(s => s.status !== 'completed').map(session => (
              <SessionCard key={session._id} session={session} onClick={() => handleResumeSession(session)} />
            ))}
          </div>
        </section>
      )}

      {/* Recommended Topics */}
      <section className="space-y-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Sparkles size={20} className="text-yellow-400" />
          Recommended Topics
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {syllabusItems.flatMap((subject: any) =>
            subject.chapters.flatMap((chapter: any) => {
              if (!chapter.description) return [];
              return chapter.description.split('\n')
                .filter((line: string) => line.includes('[ ]'))
                .map((line: string, index: number) => {
                  const topicName = line.replace(/^[-•*]\s*\[[ x]\]\s*/i, '').trim();
                  return (
                    <RecommendationCard
                      key={`${subject.id}-${chapter.id}-${index}`}
                      subject={subject}
                      topic={topicName}
                      onStart={() => handleStartNewSession({
                        subjectId: subject.id,
                        subjectName: subject.name,
                        topic: topicName,
                        level: 'Beginner' // Default level for quick start
                      })}
                    />
                  );
                });
            })
          ).slice(0, 8)} {/* Limit to 8 recommendations */}
        </div>
        {syllabusItems.every((s: any) => s.chapters.every((c: any) => !c.description || !c.description.includes('[ ]'))) && (
          <p className="text-gray-500 text-sm italic py-4">No incomplete topics found in your syllabus tracker!</p>
        )}
      </section>


      {showNewTopicModal && (
        <StartNewTopicModal
          syllabusItems={syllabusItems}
          onClose={() => setShowNewTopicModal(false)}
          onStart={handleStartNewSession}
          loading={startingSession}
        />
      )}

      {feedbackSession && (
        <DifficultyFeedbackModal
          session={feedbackSession}
          onClose={() => setFeedbackSession(null)}
          onSubmit={async (feedback: any) => {
            await updateLearningSession(feedbackSession._id, { difficultyFeedback: feedback });
            setFeedbackSession(null);
            loadSessions();
          }}
        />
      )}
    </div>
  );
};

// --- Sub-components for AI Learning ---

const SessionCard = ({ session, onClick }: any) => (
  <button
    onClick={onClick}
    className="group bg-gray-900/40 backdrop-blur-xl border border-white/5 p-6 rounded-3xl text-left hover:border-purple-500/30 transition-all hover:scale-[1.02]"
  >
    <div className="flex justify-between items-start mb-4">
      <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-all">
        <BookOpen size={24} />
      </div>
      <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{session.level}</span>
    </div>
    <h4 className="text-xl font-bold text-white mb-1 group-hover:text-purple-400 transition-colors line-clamp-1">{session.topic}</h4>
    <p className="text-sm text-gray-400 mb-4">{session.subjectName}</p>
    <div className="space-y-2">
      <div className="flex justify-between text-xs font-bold">
        <span className="text-gray-500">PROGRESS</span>
        <span className="text-purple-400">{session.progress}%</span>
      </div>
      <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all" style={{ width: `${session.progress}%` }} />
      </div>
    </div>
  </button>
);

const RecommendationCard = ({ subject, topic, onStart }: any) => (
  <div className="bg-gray-900/40 backdrop-blur-xl border border-white/5 p-5 rounded-3xl flex flex-col justify-between hover:border-blue-500/30 transition-all group">
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 rounded-full bg-blue-500" />
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest truncate">{subject.name}</span>
      </div>
      <h4 className="text-sm font-bold text-white line-clamp-2 mb-4 group-hover:text-blue-400 transition-colors uppercase tracking-tight">{topic}</h4>
    </div>
    <button
      onClick={onStart}
      className="w-full py-2 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
    >
      <Plus size={14} />
      Start Learning
    </button>
  </div>
);


const StartNewTopicModal = ({ syllabusItems, onClose, onStart, loading }: any) => {
  const [formData, setFormData] = useState({
    subjectId: syllabusItems[0]?.id || '',
    subjectName: syllabusItems[0]?.name || '',
    topic: '',
    level: 'Beginner'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.topic.trim()) return;
    onStart(formData);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative bg-[#121212] border border-white/10 w-full max-w-md rounded-[40px] p-8 space-y-6 shadow-2xl animate-scale-in overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-blue-500" />
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-bold text-white">New Learning Session</h3>
          <button type="button" onClick={onClose} className="p-2 text-gray-500 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Select Subject</label>
            <select
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none text-white appearance-none"
              value={formData.subjectId}
              onChange={(e) => {
                const sub = syllabusItems.find((s: any) => s.id === e.target.value);
                setFormData({ ...formData, subjectId: e.target.value, subjectName: sub?.name || '' });
              }}
            >
              {syllabusItems.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Enter Topic</label>
            <input
              type="text"
              placeholder="e.g. Linked List"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:border-purple-500 outline-none text-white"
              value={formData.topic}
              onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Select Level</label>
            <div className="grid grid-cols-3 gap-3">
              {['Beginner', 'Intermediate', 'Exam-Oriented'].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setFormData({ ...formData, level: lvl })}
                  className={`px-3 py-3 rounded-xl text-[10px] font-bold uppercase tracking-tighter transition-all border ${formData.level === lvl
                    ? 'bg-purple-500 border-purple-400 text-white'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                    }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 disabled:opacity-50 text-white py-5 rounded-2xl font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 text-lg shadow-lg shadow-purple-500/20"
        >
          {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
          {loading ? 'Generating Path...' : 'Start Learning'}
        </button>
      </form>
    </div>
  );
};

const LearningSessionView = ({ session, onUpdate, onMarkAsLearned, onBack }: any) => {
  const currentSection = session.sections[session.currentSectionIndex];
  const [notes, setNotes] = useState(session.notes);
  const [isBookmarked, setIsBookmarked] = useState(false);

  useEffect(() => {
    setIsBookmarked(false);
  }, [session?._id]);

  const handleToggleBookmark = () => {
    setIsBookmarked((prev) => !prev);
  };

  const handleNext = () => {
    if (session.currentSectionIndex < session.sections.length - 1) {
      const nextIndex = session.currentSectionIndex + 1;
      const progress = Math.round((nextIndex / session.sections.length) * 100);
      onUpdate({ currentSectionIndex: nextIndex, progress });
    }
  };

  const handlePrev = () => {
    if (session.currentSectionIndex > 0) {
      const prevIndex = session.currentSectionIndex - 1;
      const progress = Math.round((prevIndex / session.sections.length) * 100);
      onUpdate({ currentSectionIndex: prevIndex, progress });
    }
  };

  return (
    <div className="flex h-[calc(100vh-120px)] animate-fade-in gap-6 p-4">
      {/* LEFT: Main Learning Area */}
      <div className="flex-1 bg-gray-900/40 backdrop-blur-xl border border-white/5 rounded-[40px] flex flex-col overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 text-gray-400 hover:text-white transition-colors">
              <XCircle size={24} />
            </button>
            <div>
              <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-xl text-purple-400">
                  <BookOpen size={20} />
                </div>
                {session.topic}
                {isBookmarked && (
                  <Bookmark size={18} className="text-yellow-400" fill="currentColor" />
                )}
              </h3>
              <p className="text-gray-500 text-sm font-bold uppercase tracking-widest mt-1">
                Section {session.currentSectionIndex + 1}: {currentSection.title}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-12 lg:px-24 prose prose-invert max-w-none prose-purple prose-headings:text-white prose-p:text-gray-300">
          <ReactMarkdown>{currentSection.content}</ReactMarkdown>
        </div>

        <div className="p-8 border-t border-white/5 flex justify-between gap-4 bg-white/5">
          <button
            onClick={() => onUpdate({ status: 'paused' })}
            className="px-6 py-3 bg-white/5 text-gray-300 font-bold rounded-2xl border border-white/10 hover:bg-white/10 transition-all flex items-center gap-2"
          >
            <Pause size={18} /> Pause Learning
          </button>
          <div className="flex gap-4">
            {session.currentSectionIndex > 0 && (
              <button
                onClick={handlePrev}
                className="px-8 py-3 bg-white/5 text-gray-300 font-bold rounded-2xl border border-white/10 hover:bg-white/10 transition-all flex items-center gap-2"
              >
                <ArrowLeft size={18} /> Previous
              </button>
            )}
            {session.currentSectionIndex < session.sections.length - 1 ? (
              <button
                onClick={handleNext}
                className="px-10 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-2xl hover:scale-105 transition-all shadow-lg flex items-center gap-2"
              >
                Next Section <ArrowRight size={18} />
              </button>
            ) : (
              <button
                onClick={onMarkAsLearned}
                className="px-10 py-3 bg-green-500 text-white font-bold rounded-2xl hover:scale-105 transition-all shadow-lg flex items-center gap-2"
              >
                <Check size={18} /> Mark as Learned
              </button>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT: Learning Controls Panel */}
      <div className="w-96 flex flex-col gap-6">
        <div className="bg-gray-900/40 backdrop-blur-xl border border-white/5 p-8 rounded-[40px] shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-lg font-bold text-white">Stats</h4>
            <BarChart2 size={20} className="text-purple-400" />
          </div>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-xs font-bold mb-3">
                <span className="text-gray-500 uppercase tracking-widest">Progress</span>
                <span className="text-purple-400">{session.progress}%</span>
              </div>
              <div className="h-3 w-full bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-700" style={{ width: `${session.progress}%` }} />
              </div>
            </div>

            <button
              onClick={handleToggleBookmark}
              className={`w-full p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between transition-all hover:bg-white/10 ${
                isBookmarked ? 'text-yellow-300' : 'text-gray-400 hover:text-white'
              }`}
            >
              <span className="font-bold text-sm uppercase tracking-widest">Bookmark Topic</span>
              <Bookmark size={18} fill={isBookmarked ? 'currentColor' : 'none'} />
            </button>
          </div>
        </div>

        <div className="flex-1 bg-gray-900/40 backdrop-blur-xl border border-white/5 p-8 rounded-[40px] flex flex-col shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-lg font-bold text-white">Notes</h4>
            <FileText size={20} className="text-blue-400" />
          </div>
          <textarea
            className="flex-1 bg-white/5 border border-white/10 rounded-[20px] p-6 text-gray-300 outline-none focus:border-blue-500 transition-all resize-none text-sm leading-relaxed"
            placeholder="Write your notes here..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => onUpdate({ notes })}
          />
        </div>
      </div>
    </div>
  );
};

const DifficultyFeedbackModal = ({ session, onClose, onSubmit }: any) => {
  const options = [
    { label: 'Easy', icon: <Smile size={48} />, color: 'text-green-400', val: 'Easy' },
    { label: 'Medium', icon: <Meh size={48} />, color: 'text-yellow-400', val: 'Medium' },
    { label: 'Hard', icon: <Frown size={48} />, color: 'text-red-400', val: 'Hard' }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-[#121212] border border-white/10 w-full max-w-lg rounded-[40px] p-12 text-center shadow-2xl animate-scale-in">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
          <CheckCircle size={40} className="text-green-400" />
        </div>
        <h3 className="text-3xl font-extrabold text-white mb-2">Great Job!</h3>
        <p className="text-gray-400 mb-10">You've successfully completed <b>{session.topic}</b>. How was it?</p>

        <div className="grid grid-cols-3 gap-6">
          {options.map((opt) => (
            <button
              key={opt.val}
              onClick={() => onSubmit(opt.val)}
              className="group flex flex-col items-center gap-4 p-6 rounded-3xl bg-white/5 border border-white/10 hover:border-purple-500/50 hover:bg-white/10 transition-all"
            >
              <div className={`${opt.color} group-hover:scale-110 transition-transform`}>{opt.icon}</div>
              <span className="text-sm font-bold uppercase tracking-widest text-gray-500 group-hover:text-white">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  isError?: boolean;
}

const AITutorContent = () => {
  const [question, setQuestion] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ollamaStatus, setOllamaStatus] = useState<boolean | null>(null);
  const [context, setContext] = useState<number[]>([]);
  const [model, setModel] = useState('llama2');
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Check Ollama status on component mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await checkOllamaStatus();
        setOllamaStatus(status);
        if (!status) {
          setError('Ollama is not running. Please start Ollama locally to use the AI Tutor.');
          setAvailableModels([]);
          return;
        }

        const models = await getOllamaModels();
        setAvailableModels(models);

        if (!models.length) {
          setError('No Ollama models found. Please install a model (e.g., run: ollama pull mistral).');
          return;
        }

        if (!models.includes(model)) {
          setModel(models[0]);
        }
      } catch (err) {
        console.error('Error checking Ollama status:', err);
        setOllamaStatus(false);
        setAvailableModels([]);
        setError('Failed to connect to Ollama. Please make sure it is running.');
      }
    };

    checkStatus();
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedImage(file);
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleToggleMic = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Voice input is not supported in this browser. Please use Chrome/Edge.');
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop?.();
      } catch (err) {
        console.error('Error stopping speech recognition:', err);
      }
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const transcript = event?.results?.[0]?.[0]?.transcript;
      if (transcript) {
        setQuestion((prev) => (prev ? `${prev} ${transcript}` : transcript));
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setError(`Speech recognition error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    setIsListening(true);
    recognition.start();
  };

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop?.();
      } catch {
        // ignore
      }

      try {
        abortControllerRef.current?.abort();
      } catch {
        // ignore
      }
    };
  }, []);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    const userText = question.trim();
    if (!userText && !selectedImage) return;
    if (!ollamaStatus) {
      setError('Ollama is not running. Please start Ollama locally to use the AI Tutor.');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: selectedImage
        ? `${userText || '[Image]'}\n\n[Image: ${selectedImage.name}]`
        : userText,
      isUser: true,
      timestamp: new Date(),
    };

    const aiMessageId = (Date.now() + 1).toString();
    const aiPlaceholder: Message = {
      id: aiMessageId,
      content: '',
      isUser: false,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage, aiPlaceholder]);
    setQuestion('');
    setIsLoading(true);
    setError(null);

    try {
      abortControllerRef.current?.abort();
    } catch {
      // ignore
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      let prompt = userText;
      if (selectedImage) {
        try {
          const ocr = await (Tesseract as any).recognize(selectedImage, 'eng');
          const extractedText = (ocr?.data?.text ?? '').toString().trim();
          if (extractedText) {
            prompt = `${userText ? `${userText}\n\n` : ''}Text extracted from the image:\n${extractedText}`;
          } else {
            prompt = `${userText ? `${userText}\n\n` : ''}I attached an image, but no readable text was extracted. Please respond based on the image context if possible.`;
          }
        } catch (ocrErr) {
          console.error('OCR failed:', ocrErr);
          throw new Error('Failed to process the uploaded image. Please try a clearer image.');
        }
      }

      const { response: aiResponse, newContext, doneReason } = await sendMessageToAIStream(prompt, {
        model,
        context,
        signal: controller.signal,
        onDelta: (delta) => {
          if (!delta) return;
          setMessages((prev) =>
            prev.map((m) => (m.id === aiMessageId ? { ...m, content: `${m.content}${delta}` } : m))
          );
        },
      });

      setContext(newContext);
      const finalResponse =
        doneReason === 'length'
          ? `${aiResponse}\n\n(Answer truncated. Send "continue" to get the rest.)`
          : aiResponse;
      setMessages((prev) =>
        prev.map((m) => (m.id === aiMessageId ? { ...m, content: finalResponse } : m))
      );

      if (selectedImage) {
        handleRemoveImage();
      }
    } catch (err) {
      console.error('Error getting AI response:', err);
      setError(err instanceof Error ? err.message : 'Failed to get response from AI');

      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMessageId
            ? {
                ...m,
                content: 'Sorry, I encountered an error. Please try again later.',
                isError: true,
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <h2 className="text-2xl font-bold text-white">AI Tutor</h2>
      
      {error && (
        <div className="bg-red-900/20 border border-red-700 text-red-300 px-4 py-3 rounded-lg flex items-start gap-2">
          <AlertCircle className="mt-0.5 flex-shrink-0" size={18} />
          <span>{error}</span>
        </div>
      )}
      
      {ollamaStatus === false && (
        <div className="bg-yellow-900/20 border border-yellow-700 text-yellow-300 px-4 py-3 rounded-lg">
          <p>Ollama is not running. Please make sure Ollama is installed and running locally.</p>
          <p className="text-sm mt-1 text-yellow-400">
            Download Ollama from <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer" className="underline">ollama.ai</a> and run it in your terminal.
          </p>
        </div>
      )}

      <div className="bg-gray-800/50 rounded-xl border border-gray-700 flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-purple-500/10 p-2 rounded-full">
                <Brain className="text-purple-400" size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-white">AI Tutor</h3>
                <p className="text-xs text-gray-400">
                  {ollamaStatus ? 'Connected to Ollama' : 'Not connected'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <select
                value={model}
                onChange={(e) => {
                  setModel(e.target.value);
                  setContext([]);
                }}
                className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={isLoading}
              >
                {availableModels.length ? (
                  availableModels.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))
                ) : (
                  <option value={model}>{model}</option>
                )}
              </select>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-400">
              <Brain className="w-12 h-12 mb-4 text-gray-600" />
              <h3 className="text-xl font-semibold text-white mb-2">How can I help you today?</h3>
              <p className="max-w-md">
                Ask me anything about your studies, and I'll do my best to help you understand the concepts better.
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-3xl rounded-2xl px-4 py-3 ${
                    message.isUser
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                      : message.isError
                      ? 'bg-red-900/30 border border-red-800 text-red-200'
                      : 'bg-gray-700/50 text-gray-100'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  <div className="text-xs mt-1 opacity-60 text-right">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-gray-700">
          <form onSubmit={handleSendMessage} className="space-y-3">
            {selectedImage && (
              <div className="flex items-center justify-between bg-gray-700/40 border border-gray-600 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Image size={16} className="text-gray-300 flex-shrink-0" />
                  <span className="text-sm text-gray-300 truncate">{selectedImage.name}</span>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="p-1 text-gray-300 hover:text-white"
                  title="Remove image"
                  disabled={isLoading}
                >
                  <X size={16} />
                </button>
              </div>
            )}

            <div className="flex space-x-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleSelectImage}
                disabled={isLoading}
              />
              
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="bg-gray-700 border border-gray-600 text-white p-2 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Upload image"
                disabled={isLoading}
              >
                <Image size={18} />
              </button>

              <div className="flex-1 relative">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isListening ? 'Listening...' : 'Type your question...'}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 pr-12 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
                  disabled={isLoading || !ollamaStatus}
                />
                <button
                  type="button"
                  onClick={handleToggleMic}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full ${
                    isListening
                      ? 'text-white bg-red-500'
                      : 'text-gray-300 hover:text-white hover:bg-gray-600'
                  }`}
                  title={isListening ? 'Stop voice input' : 'Voice input'}
                  disabled={isLoading || !ollamaStatus}
                >
                  <Mic size={18} />
                </button>
              </div>

              <button
                type="submit"
                disabled={!question.trim() || isLoading || !ollamaStatus}
                className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[100px]"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Send</span>
                    <Send size={16} className="ml-2" />
                  </>
                )}
              </button>
            </div>
          </form>
          
          <p className="text-xs text-gray-500 mt-2 text-center">
            Press Enter to send, Shift+Enter for a new line
          </p>
        </div>
      </div>
    </div>
  );
};

 

// Add more content components for other sections
const ProgressAnalyticsContent = () => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold text-white">Progress & Analytics</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Study Time</h3>
        <div className="h-64 flex items-center justify-center bg-gray-900/30 rounded-lg">
          <p className="text-gray-500">Study time chart will be displayed here</p>
        </div>
      </div>
      <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Performance</h3>
        <div className="space-y-4">
          {[
            { name: 'Physics', score: 78, color: 'from-purple-500 to-blue-500' },
            { name: 'Chemistry', score: 65, color: 'from-green-500 to-teal-500' },
            { name: 'Mathematics', score: 82, color: 'from-yellow-500 to-orange-500' },
            { name: 'Biology', score: 45, color: 'from-red-500 to-pink-500' },
          ].map((subject, index) => (
            <div key={index} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">{subject.name}</span>
                <span className="font-medium text-white">{subject.score}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full bg-gradient-to-r ${subject.color}`}
                  style={{ width: `${subject.score}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// Map of section names to their corresponding content components
// Map of section names to their corresponding content components
const sectionComponents: Record<string, React.FC<any>> = {
  'Home / Overview': OverviewContent,
  'Syllabus Tracker': SyllabusTrackerContent,
  'Study Materials': (props: any) => (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <div className="mb-6">
        <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-400 tracking-tight">
          Study Materials
        </h2>
        <p className="text-gray-400 text-sm mt-2">Access and manage all your learning resources in one place.</p>
      </div>
      <StudyMaterialsView
        subjects={props.syllabusItems}
        onUpdateSubject={props.onUpdateSubject}
        onViewFile={props.onViewFile}
      />
    </div>
  ),
  'AI Learning': AILearningContent,
  'AI Tutor': AITutorContent,
  'Practice & Quiz': PracticeQuizContent,
  'Progress & Analytics': ProgressAnalyticsContent,
  // Add more sections as needed
};

interface NavItem {
  name: string;
  icon: React.ReactNode;
  path: string;
}

const FilePreviewModal: React.FC<{
  file: FileItem | null;
  onClose: () => void;
}> = ({ file, onClose }) => {
  if (!file) return null;

  const isImage = file.type.startsWith('image/');
  const isPDF = file.type.includes('pdf');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 animate-fade-in">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-5xl h-full max-h-[90vh] bg-[#121212] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-scale-in">
        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/5">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <FileText className="text-purple-400" size={20} />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm tracking-wide truncate max-w-[200px] md:max-w-md">
                {file.name}
              </h3>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                {file.type.split('/')[1] || 'File'} • {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-auto bg-black/40 flex items-center justify-center p-4">
          {isImage ? (
            <img
              src={file.url}
              alt={file.name}
              className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
            />
          ) : isPDF ? (
            <iframe
              src={file.url}
              className="w-full h-full border-0 rounded-lg"
              title={file.name}
            />
          ) : (
            <div className="text-center">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText size={40} className="text-gray-500" />
              </div>
              <h4 className="text-white font-bold mb-2">Preview not available</h4>
              <p className="text-gray-400 text-sm mb-6">This file type cannot be previewed on-screen.</p>
              <a
                href={file.url}
                download={file.name}
                className="inline-flex items-center px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-xl hover:from-purple-500 hover:to-blue-500 transition-all shadow-lg shadow-purple-500/20"
              >
                <Download size={18} className="mr-2" />
                Download to View
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const DashboardLayout = () => {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('Home / Overview');
  const navigate = useNavigate();
  const { currentUser, signOut } = useAuth();
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);

  // Moved Syllabus State
  const [syllabusItems, setSyllabusItems] = useState<SyllabusItem[]>([]);

  // Load syllabuses on component mount
  useEffect(() => {
    const loadSyllabuses = async () => {
      try {
        const response = await getSyllabuses();
        if (Array.isArray(response)) {
          setSyllabusItems(response as SyllabusItem[]);
        }
      } catch (error) {
        console.error('Error loading syllabuses:', error);
      }
    };

    if (currentUser) {
      loadSyllabuses();
    }
  }, [currentUser]);

  // Update subject progress whenever syllabusItems length changes (simplified trigger)
  useEffect(() => {
    if (syllabusItems.length > 0) {
      // Manual trigger for progress calculation if needed, 
      // though it's often better to calculate on the fly or during updates.
    }
  }, [syllabusItems.length]);

  const updateSubject = async (updatedSubject: SyllabusItem) => {
    try {
      const response = await updateSyllabus(updatedSubject.id, updatedSubject);
      const updated = response as SyllabusItem;
      setSyllabusItems(prev =>
        prev.map(item => item.id === updated.id ? updated : item)
      );
      return updated;
    } catch (error) {
      console.error('Error updating syllabus:', error);
      alert('Failed to update syllabus. Please try again.');
      throw error;
    }
  };

  const removeSubject = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this subject and all its chapters?')) {
      try {
        await deleteSyllabus(id);
        setSyllabusItems(prev => prev.filter(item => item.id !== id));
        return true;
      } catch (error) {
        console.error('Error deleting syllabus:', error);
        alert('Failed to delete syllabus. Please try again.');
        return false;
      }
    }
    return false;
  };

  const parseSyllabusWithAI = async (text: string): Promise<Chapter[]> => {
    const models = [
      "google/gemini-2.0-flash-exp:free",
      "meta-llama/llama-3.2-11b-vision-instruct:free",
      "huggingfaceh4/zephyr-7b-beta:free",
      "mistralai/mistral-7b-instruct:free"
    ];

    const makeRequest = async (model: string, attempt: number = 1): Promise<any> => {
      try {
        const completion = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": "Bearer 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",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:5173",
          },
          body: JSON.stringify({
            "model": model,
            "messages": [
              {
                "role": "system",
                "content": "You are a precise syllabus parser. Extract modules and topics as valid JSON array of objects with 'name' and 'description' (markdown list of topics)."
              },
              {
                "role": "user",
                "content": text
              }
            ]
          })
        });

        if (completion.status === 429 && attempt < 4) {
          const delay = attempt * 3000;
          await new Promise(resolve => setTimeout(resolve, delay));
          return makeRequest(model, attempt + 1);
        }

        if (!completion.ok) throw new Error(`AI API Error: ${completion.statusText}`);
        return await completion.json();
      } catch (error) { throw error; }
    };

    for (const model of models) {
      try {
        const data = await makeRequest(model);
        if (!data.choices?.[0]?.message) continue;
        const aiContent = data.choices[0].message.content;
        const cleanJson = aiContent.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsedData = JSON.parse(cleanJson);

        return parsedData.map((item: any) => ({
          id: Math.random().toString(36).substr(2, 9),
          name: item.name,
          description: item.description,
          files: [],
          isExpanded: true
        }));
      } catch (error) { console.warn(`Model ${model} failed:`, error); }
    }
    throw new Error("All AI models failed");
  };

  const handleExtractTopics = async (subjectId: string) => {
    try {
      const subject = syllabusItems.find(s => s.id === subjectId);
      if (!subject) return;

      const imageAttachments = subject.attachments?.filter(att =>
        att.type.startsWith('image/') || att.type === 'application/pdf'
      ) || [];

      if (imageAttachments.length === 0) {
        alert('No image or PDF attachments found.');
        return;
      }

      alert('Extracting text from images...');
      const urls = imageAttachments.map(att => att.url);
      const { text, codeMatched } = await extractTextFromImages(urls, subject.subjectCode);

      if (subject.subjectCode && !codeMatched) {
        alert('Subject code not found.');
        return;
      }

      let newChapters: Chapter[] = [];
      try {
        newChapters = await parseSyllabusWithAI(text);
      } catch (aiError) {
        newChapters = parseSyllabusText(text);
        alert("AI extraction failed. Fallback to manual.");
      }

      const updatedSubject = {
        ...subject,
        chapters: [...(subject.chapters || []), ...newChapters],
        isExpanded: true
      };

      await updateSubject(updatedSubject);

      try {
        await addDoc(collection(db, "syllabuses"), {
          subjectName: subject.name,
          subjectCode: subject.subjectCode || "N/A",
          extractedContent: newChapters,
          userId: currentUser?.uid || "anonymous",
          createdAt: new Date().toISOString(),
          originalSubjectId: subject.id
        });
      } catch (fbError) { console.error("Firestore save failed:", fbError); }

      alert(`Successfully extracted ${newChapters.length} chapters.`);
    } catch (error) {
      alert(`Extraction failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  };

  // Move to DashboardLayout
  const calculateSubjectProgress = useCallback((subject: SyllabusItem) => {
    if (subject.chapters.length === 0) return 0;
    let totalTopics = 0;
    let completedTopics = 0;
    subject.chapters.forEach(chapter => {
      if (!chapter.description) return;
      const lines = chapter.description.split('\n');
      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.match(/^[-•*]\s*\[[ x]\]/i)) {
          totalTopics++;
          if (trimmed.match(/^[-•*]\s*\[x\]/i)) completedTopics++;
        }
      });
    });
    return totalTopics === 0 ? 0 : Math.round((completedTopics / totalTopics) * 100);
  }, []);

  useEffect(() => {
    setSyllabusItems(prev => {
      let changed = false;
      const updated = prev.map(subject => {
        const newProgress = calculateSubjectProgress(subject);
        const newStatus: 'completed' | 'in-progress' | 'pending' = subject.chapters.length === 0 ? 'pending' : (newProgress === 100 ? 'completed' : 'in-progress');
        if (subject.progress !== newProgress || subject.status !== newStatus) {
          changed = true;
          return { ...subject, progress: newProgress, status: newStatus };
        }
        return subject;
      });
      return changed ? updated : prev;
    });
  }, [syllabusItems.length, calculateSubjectProgress]);

  const toggleSubjectExpanded = (id: string) => {
    setSyllabusItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, isExpanded: !item.isExpanded } : item
      )
    );
  };

  const addNewChapter = (subjectId: string) => {
    const newChapter: Chapter = {
      id: Math.random().toString(36).substr(2, 9),
      name: `Chapter ${syllabusItems.find(s => s.id === subjectId)?.chapters.length || 0 + 1}`,
      files: [],
      isExpanded: true
    };

    setSyllabusItems(prev =>
      prev.map(item =>
        item.id === subjectId
          ? { ...item, chapters: [...item.chapters, newChapter], isExpanded: true }
          : item
      )
    );
  };

  const toggleChapterExpanded = (subjectId: string, chapterId: string) => {
    setSyllabusItems(prev =>
      prev.map(subject =>
        subject.id === subjectId
          ? {
            ...subject,
            chapters: subject.chapters.map(chapter =>
              chapter.id === chapterId ? { ...chapter, isExpanded: !chapter.isExpanded } : chapter
            )
          }
          : subject
      )
    );
  };

  const toggleFileStatus = (subjectId: string, chapterId: string, fileId: string) => {
    setSyllabusItems(prev =>
      prev.map(subject =>
        subject.id === subjectId
          ? {
            ...subject,
            chapters: subject.chapters.map(chapter =>
              chapter.id === chapterId
                ? {
                  ...chapter,
                  files: chapter.files.map(file =>
                    file.id === fileId
                      ? { ...file, status: file.status === 'completed' ? 'not-started' : 'completed' }
                      : file
                  )
                }
                : chapter
            )
          }
          : subject
      )
    );
  };

  const removeChapterFile = (subjectId: string, chapterId: string, fileId: string) => {
    setSyllabusItems(prev =>
      prev.map(subject =>
        subject.id === subjectId
          ? {
            ...subject,
            chapters: subject.chapters.map(chapter =>
              chapter.id === chapterId
                ? { ...chapter, files: chapter.files.filter(file => file.id !== fileId) }
                : chapter
            )
          }
          : subject
      )
    );
  };

  const downloadChapterFile = (file: FileItem) => {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenFile = (file: FileItem) => {
    setPreviewFile(file);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems: NavItem[] = [
    {
      name: 'Home / Overview',
      icon: <Home size={20} />,
      path: 'overview'
    },
    {
      name: 'Syllabus Tracker',
      icon: <BookOpen size={20} />,
      path: 'syllabus'
    },
    {
      name: 'Study Materials',
      icon: <Folder size={20} />,
      path: 'materials'
    },
    {
      name: 'AI Learning',
      icon: <GraduationCap size={20} />,
      path: 'learning'
    },
    {
      name: 'AI Tutor',
      icon: <Brain size={20} />,
      path: 'tutor'
    },
    {
      name: 'Practice & Quiz',
      icon: <ClipboardList size={20} />,
      path: 'quiz'
    },
    {
      name: 'Progress & Analytics',
      icon: <BarChart2 size={20} />,
      path: 'analytics'
    },
    {
      name: 'Revision Mode',
      icon: <RefreshCw size={20} />,
      path: 'revision'
    },
    {
      name: 'Study Plan',
      icon: <Target size={20} />,
      path: 'plan'
    },
    {
      name: 'Notifications',
      icon: <Bell size={20} />,
      path: 'notifications'
    },
    {
      name: 'Settings',
      icon: <SettingsIcon size={20} />,
      path: 'settings'
    },
  ];



  const handleSectionClick = (item: NavItem) => {
    setActiveSection(item.name);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Failed to sign out', error);
    }
  };

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-gray-100 overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-[#111111] border-r border-gray-800 flex flex-col">
        {/* Top Profile Section */}
        <div className="p-4 border-b border-gray-800">
          <div
            ref={profileMenuRef}
            className="relative"
          >
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-800/50 transition-colors group"
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold text-sm">
                    {currentUser?.displayName?.[0] || currentUser?.email?.[0] || 'U'}
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#111111]"></div>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-gray-100 truncate">
                    {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User'}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {currentUser?.email || 'user@example.com'}
                  </p>
                </div>
                <ChevronDown
                  size={16}
                  className={`text-gray-400 flex-shrink-0 transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`}
                />
              </div>
            </button>

            {profileMenuOpen && (
              <div className="absolute left-0 right-0 mt-2 bg-[#1a1a1a] border border-gray-800 rounded-lg shadow-xl z-50 overflow-hidden">
                <div className="py-1">
                  <Link
                    to="/profile"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 transition-colors"
                  >
                    <User size={16} className="mr-3" />
                    My Profile
                  </Link>
                  <Link
                    to="/dashboard/settings"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 transition-colors"
                  >
                    <SettingsIcon size={16} className="mr-3" />
                    Settings
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center px-4 py-2 text-sm text-red-400 hover:bg-gray-800 transition-colors border-t border-gray-800"
                  >
                    <LogOut size={16} className="mr-3" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Menu */}
        <nav className="flex-1 overflow-y-visible py-4 px-3">
          <div className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => handleSectionClick(item)}
                className={`w-full text-left flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all ${activeSection === item.name
                  ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-white border border-purple-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  }`}
              >
                <span className={activeSection === item.name ? 'text-purple-400' : ''}>
                  {item.icon}
                </span>
                <span className="text-sm font-medium">{item.name}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6">
          {activeSection && sectionComponents[activeSection] ? (
            <div className="animate-fade-in">
              {React.createElement(sectionComponents[activeSection], {
                syllabusItems,
                setSyllabusItems,
                onUpdateSubject: updateSubject,
                onDeleteSubject: removeSubject,
                onToggleExpand: toggleSubjectExpanded,
                onAddChapter: addNewChapter,
                onToggleChapterExpand: toggleChapterExpanded,
                onToggleFileStatus: toggleFileStatus,
                onRemoveFile: removeChapterFile,
                onDownloadFile: downloadChapterFile,
                onViewFile: handleOpenFile,
                onExtractTopics: handleExtractTopics,
                currentUser: currentUser
              })}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-4">📚</div>
                <h2 className="text-2xl font-bold text-white mb-2">Welcome to Your Dashboard</h2>
                <p className="text-gray-400">Select a section to get started</p>
              </div>
            </div>
          )}
        </div>
      </div>
      <FilePreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />
    </div>
  );
};

export default DashboardLayout;
