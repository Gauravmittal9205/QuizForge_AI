import { useState, useRef, useCallback } from 'react';
import { 
  Video,
  Upload,
  Link as LinkIcon,
  Settings,
  Play,
  Download,
  Edit,
  Loader2,
  FileVideo,
  X,
  CheckCircle
} from 'lucide-react';

interface QuizConfig {
  difficulty: 'easy' | 'medium' | 'hard';
  numQuestions: number;
  language: 'english' | 'hindi';
  questionType: 'mcq' | 'true-false' | 'mixed';
  examOriented: boolean;
}

interface Question {
  id: string;
  question: string;
  type: 'mcq' | 'true-false';
  options?: string[];
  correctAnswer: number | boolean;
  explanation?: string;
}

const CreateQuiz = () => {
  const [activeTab, setActiveTab] = useState<'link' | 'upload'>('link');
  const [videoLink, setVideoLink] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [quizConfig, setQuizConfig] = useState<QuizConfig>({
    difficulty: 'medium',
    numQuestions: 10,
    language: 'english',
    questionType: 'mixed',
    examOriented: false,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
      setUploadedFile(file);
      setActiveTab('upload');
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setUploadedFile(file);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!videoLink.trim() && !uploadedFile) {
      alert('Please provide a video link or upload a video file');
      return;
    }

    setIsGenerating(true);
    setShowPreview(false);
    setGenerationStep('Processing video...');

    try {
      // Step 1: Extract audio using ffmpeg
      setGenerationStep('Extracting audio from video...');
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Step 2: Transcribe audio using Whisper
      setGenerationStep('Transcribing audio with Whisper AI...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 3: Generate quiz from transcript
      setGenerationStep('Generating quiz questions with AI...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock generated questions
      const mockQuestions: Question[] = [
        {
          id: '1',
          question: 'What is the main topic discussed in this video?',
          type: 'mcq',
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswer: 0,
          explanation: 'The video primarily focuses on Option A as mentioned in the beginning.'
        },
        {
          id: '2',
          question: 'True or False: The speaker mentioned three key points.',
          type: 'true-false',
          correctAnswer: true,
          explanation: 'Yes, the speaker outlined three main points during the presentation.'
        },
        {
          id: '3',
          question: 'Which tool was recommended for this task?',
          type: 'mcq',
          options: ['Tool X', 'Tool Y', 'Tool Z', 'Tool W'],
          correctAnswer: 1,
          explanation: 'Tool Y was specifically recommended by the expert in the video.'
        },
      ];

      setGeneratedQuestions(mockQuestions);
      setShowPreview(true);
      setGenerationStep('Quiz generated successfully!');
    } catch (error) {
      console.error('Error generating quiz:', error);
      alert('Failed to generate quiz. Please try again.');
      setGenerationStep('');
    } finally {
      setIsGenerating(false);
      setTimeout(() => setGenerationStep(''), 2000);
    }
  };

  const handleDownloadQuiz = () => {
    // TODO: Implement download functionality
    const quizData = {
      config: quizConfig,
      questions: generatedQuestions,
    };
    const blob = new Blob([JSON.stringify(quizData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'quiz.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col overflow-auto bg-[#0a0a0a]">
      <div className="flex-1 overflow-auto px-6 py-8">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Page Header */}
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Video to Quiz</h1>
            <p className="text-gray-400">Turn any video into an interactive quiz using AI</p>
          </div>

          {/* Video Input Section */}
          <div className="bg-[#111111] border border-gray-800 rounded-xl p-6">
            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-gray-800">
              <button
                onClick={() => {
                  setActiveTab('link');
                  setUploadedFile(null);
                }}
                className={`px-4 py-2 font-medium text-sm transition-colors relative ${
                  activeTab === 'link'
                    ? 'text-purple-400'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <LinkIcon size={18} />
                  <span>Paste Video Link</span>
                </div>
                {activeTab === 'link' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500"></div>
                )}
              </button>
              <button
                onClick={() => {
                  setActiveTab('upload');
                  setVideoLink('');
                }}
                className={`px-4 py-2 font-medium text-sm transition-colors relative ${
                  activeTab === 'upload'
                    ? 'text-purple-400'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Upload size={18} />
                  <span>Upload Video</span>
                </div>
                {activeTab === 'upload' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500"></div>
                )}
              </button>
            </div>

            {/* Link Input */}
            {activeTab === 'link' && (
              <div className="space-y-4">
                <div className="relative">
                  <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    value={videoLink}
                    onChange={(e) => setVideoLink(e.target.value)}
                    placeholder="Paste YouTube, Vimeo, or any video URL here"
                    className="w-full bg-[#1a1a1a] border border-gray-800 rounded-xl px-12 py-3.5 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all"
                    disabled={isGenerating}
                  />
                  {videoLink && (
                    <button
                      onClick={() => setVideoLink('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Upload Input */}
            {activeTab === 'upload' && (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  isDragging
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-gray-800 hover:border-gray-700'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isGenerating}
                />
                
                {uploadedFile ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-3 p-4 bg-gray-800/50 rounded-lg">
                      <FileVideo size={24} className="text-purple-400" />
                      <div className="flex-1 text-left">
                        <p className="text-gray-100 font-medium">{uploadedFile.name}</p>
                        <p className="text-gray-400 text-sm">
                          {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setUploadedFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="text-gray-400 hover:text-gray-200 transition-colors"
                      >
                        <X size={20} />
                      </button>
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-purple-400 hover:text-purple-300 text-sm font-medium"
                    >
                      Choose different file
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <div className="p-4 bg-gray-800/50 rounded-full">
                        <Upload size={32} className="text-gray-400" />
                      </div>
                    </div>
                    <div>
                      <p className="text-gray-300 font-medium mb-1">
                        Drag and drop your video here
                      </p>
                      <p className="text-gray-500 text-sm mb-4">or</p>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-6 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-400 rounded-lg font-medium transition-colors"
                      >
                        Browse Files
                      </button>
                    </div>
                    <p className="text-gray-500 text-xs">
                      Supports MP4, AVI, MOV, MKV (Max 500MB)
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quiz Configuration Section */}
          <div className="bg-[#111111] border border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <Settings size={20} className="text-purple-400" />
              <h2 className="text-xl font-semibold text-white">Quiz Configuration</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Difficulty Level */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Difficulty Level
                </label>
                <div className="flex gap-2">
                  {(['easy', 'medium', 'hard'] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => setQuizConfig({ ...quizConfig, difficulty: level })}
                      disabled={isGenerating}
                      className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${
                        quizConfig.difficulty === level
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
                      }`}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Number of Questions */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Number of Questions: {quizConfig.numQuestions}
                </label>
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={quizConfig.numQuestions}
                  onChange={(e) => setQuizConfig({ ...quizConfig, numQuestions: parseInt(e.target.value) })}
                  disabled={isGenerating}
                  className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>5</span>
                  <span>50</span>
                </div>
              </div>

              {/* Language Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Language
                </label>
                <div className="flex gap-2">
                  {(['english', 'hindi'] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setQuizConfig({ ...quizConfig, language: lang })}
                      disabled={isGenerating}
                      className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${
                        quizConfig.language === lang
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
                      }`}
                    >
                      {lang.charAt(0).toUpperCase() + lang.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Type */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Question Type
                </label>
                <select
                  value={quizConfig.questionType}
                  onChange={(e) => setQuizConfig({ ...quizConfig, questionType: e.target.value as any })}
                  disabled={isGenerating}
                  className="w-full bg-[#1a1a1a] border border-gray-800 rounded-lg px-4 py-2.5 text-gray-100 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all"
                >
                  <option value="mcq">MCQ Only</option>
                  <option value="true-false">True/False Only</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>
            </div>

            {/* Exam Oriented Toggle */}
            <div className="mt-6 pt-6 border-t border-gray-800">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={quizConfig.examOriented}
                  onChange={(e) => setQuizConfig({ ...quizConfig, examOriented: e.target.checked })}
                  disabled={isGenerating}
                  className="w-5 h-5 rounded border-gray-700 bg-[#1a1a1a] text-purple-500 focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-0 focus:ring-offset-gray-900 cursor-pointer"
                />
                <span className="text-sm font-medium text-gray-300">
                  Exam Oriented Mode
                </span>
                <span className="text-xs text-gray-500">(More challenging questions)</span>
              </label>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerateQuiz}
            disabled={isGenerating || (!videoLink.trim() && !uploadedFile)}
            className="w-full px-6 py-4 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-xl font-semibold text-lg transition-all shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {isGenerating ? (
              <>
                <Loader2 size={24} className="animate-spin" />
                <span>{generationStep || 'Generating Quiz...'}</span>
              </>
            ) : (
              <>
                <Video size={24} />
                <span>Generate Quiz with AI</span>
              </>
            )}
          </button>

          {/* Generation Steps Indicator */}
          {isGenerating && generationStep && (
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Loader2 size={20} className="animate-spin text-purple-400" />
                <span className="text-purple-300 font-medium">{generationStep}</span>
              </div>
            </div>
          )}

          {/* Quiz Preview Section */}
          {showPreview && generatedQuestions.length > 0 && (
            <div className="bg-[#111111] border border-gray-800 rounded-xl p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-1">Generated Quiz Preview</h2>
                  <p className="text-gray-400 text-sm">
                    {generatedQuestions.length} question(s) generated
                  </p>
                </div>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-gray-400 hover:text-gray-200 transition-colors"
                >
                  {showPreview ? <X size={20} /> : <Play size={20} />}
                </button>
              </div>

              <div className="space-y-4">
                {generatedQuestions.map((q, index) => (
                  <div
                    key={q.id}
                    className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <p className="text-gray-100 font-medium flex-1">
                        {index + 1}. {q.question}
                      </p>
                      <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs font-medium rounded">
                        {q.type === 'mcq' ? 'MCQ' : 'T/F'}
                      </span>
                    </div>
                    
                    {q.type === 'mcq' && q.options && (
                      <div className="space-y-2 ml-4">
                        {q.options.map((option, optIndex) => (
                          <div
                            key={optIndex}
                            className={`p-2 rounded ${
                              optIndex === q.correctAnswer
                                ? 'bg-green-500/20 border border-green-500/30'
                                : 'bg-gray-800/50'
                            }`}
                          >
                            <span className="text-gray-300 text-sm">
                              {String.fromCharCode(65 + optIndex)}. {option}
                              {optIndex === q.correctAnswer && (
                                <CheckCircle size={16} className="inline ml-2 text-green-400" />
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {q.explanation && (
                      <div className="ml-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded">
                        <p className="text-blue-300 text-sm">
                          <strong>Explanation:</strong> {q.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {showPreview && generatedQuestions.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                className="flex-1 px-6 py-3.5 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-xl font-semibold transition-all shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 flex items-center justify-center gap-2"
              >
                <Play size={20} />
                <span>Perform Quiz</span>
              </button>
              <button
                onClick={handleDownloadQuiz}
                className="flex-1 px-6 py-3.5 bg-gray-800 hover:bg-gray-700 text-gray-100 rounded-xl font-semibold transition-all border border-gray-700 flex items-center justify-center gap-2"
              >
                <Download size={20} />
                <span>Download Quiz</span>
              </button>
              <button
                className="flex-1 px-6 py-3.5 bg-gray-800 hover:bg-gray-700 text-gray-100 rounded-xl font-semibold transition-all border border-gray-700 flex items-center justify-center gap-2"
              >
                <Edit size={20} />
                <span>Edit Quiz</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateQuiz;

