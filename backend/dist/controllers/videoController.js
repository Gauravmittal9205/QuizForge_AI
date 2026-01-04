"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const videoProcessor_1 = __importDefault(require("../services/videoProcessor"));
const openai_1 = require("openai");
// Initialize OpenAI for quiz generation
const openai = new openai_1.OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
class VideoController {
    // Process video from URL
    async processVideoUrl(req, res) {
        try {
            const { videoUrl, language } = req.body;
            if (!videoUrl) {
                return res.status(400).json({ error: 'Video URL is required' });
            }
            const transcript = await videoProcessor_1.default.processVideoUrl(videoUrl, language || 'en');
            // Generate quiz from transcript
            const quiz = await this.generateQuizFromTranscript(transcript, language || 'en');
            res.json({
                success: true,
                transcript,
                quiz
            });
        }
        catch (error) {
            console.error('Error processing video URL:', error);
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            res.status(500).json({
                error: 'Failed to process video URL',
                details: errorMessage
            });
        }
    }
    // Process uploaded video file
    async processVideoFile(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No video file uploaded' });
            }
            const { language } = req.body;
            const transcript = await videoProcessor_1.default.processVideoFile(req.file, language || 'en');
            // Generate quiz from transcript
            const quiz = await this.generateQuizFromTranscript(transcript, language || 'en');
            res.json({
                success: true,
                transcript,
                quiz
            });
        }
        catch (error) {
            console.error('Error processing video file:', error);
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            res.status(500).json({
                error: 'Failed to process video file',
                details: errorMessage
            });
        }
    }
    // Generate quiz from transcript using GPT-4
    async generateQuizFromTranscript(transcript, language = 'en') {
        var _a, _b;
        try {
            const prompt = this.getQuizGenerationPrompt(transcript, language);
            const response = await openai.chat.completions.create({
                model: 'gpt-4',
                messages: [
                    { role: 'system', content: 'You are a helpful assistant that generates educational quizzes based on video transcripts.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 2000,
            });
            const quizContent = (_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content;
            if (!quizContent) {
                throw new Error('Failed to generate quiz');
            }
            // Parse the JSON response
            return JSON.parse(quizContent);
        }
        catch (error) {
            console.error('Error generating quiz:', error);
            throw new Error('Failed to generate quiz from transcript');
        }
    }
    // Generate prompt for quiz generation
    getQuizGenerationPrompt(transcript, language = 'en') {
        const languageName = language === 'en' ? 'English' : 'Hindi';
        return `
    Generate a quiz based on the following video transcript. The quiz should be in ${languageName}.
    
    Transcript:
    ${transcript}
    
    Please generate a JSON object with the following structure:
    {
      "title": "Quiz Title",
      "description": "Brief description of the quiz",
      "questions": [
        {
          "question": "The question text",
          "type": "multiple_choice", // or "true_false"
          "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
          "correctAnswer": 0, // Index of the correct option (0-based)
          "explanation": "Explanation of the correct answer"
        }
      ]
    }
    
    Include 10 questions in total, with a mix of multiple choice and true/false questions.
    Make sure the questions are relevant to the content of the video and test the viewer's understanding.
    `;
    }
}
exports.default = new VideoController();
