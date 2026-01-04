"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const ffmpeg_1 = __importDefault(require("@ffmpeg-installer/ffmpeg"));
const openai_1 = require("openai");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const os_1 = __importDefault(require("os"));
const axios_1 = __importDefault(require("axios"));
// Configure FFmpeg path
fluent_ffmpeg_1.default.setFfmpegPath(ffmpeg_1.default.path);
// Initialize OpenAI
const openai = new openai_1.OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
class VideoProcessor {
    constructor() {
        this.CHUNK_SIZE = 25 * 1024 * 1024; // 25MB chunks for Whisper API
        this.tempDir = path_1.default.join(os_1.default.tmpdir(), 'quizforge-videos');
        fs_extra_1.default.ensureDirSync(this.tempDir);
    }
    // Extract audio from video file
    async extractAudio(videoPath) {
        return new Promise((resolve, reject) => {
            const audioPath = path_1.default.join(this.tempDir, `${(0, uuid_1.v4)()}.mp3`);
            (0, fluent_ffmpeg_1.default)(videoPath)
                .outputOptions([
                '-vn', // Disable video
                '-acodec', 'libmp3lame', // Use MP3 codec
                '-ar', '16000', // Sample rate of 16kHz
                '-ac', '1', // Mono audio
                '-b:a', '32k' // Bitrate of 32k
            ])
                .on('end', () => resolve(audioPath))
                .on('error', (err) => reject(err))
                .save(audioPath);
        });
    }
    // Download video from URL
    async downloadVideo(url) {
        const response = await (0, axios_1.default)({
            method: 'GET',
            url: url,
            responseType: 'stream',
        });
        const videoPath = path_1.default.join(this.tempDir, `${(0, uuid_1.v4)()}.mp4`);
        const writer = fs_extra_1.default.createWriteStream(videoPath);
        response.data.pipe(writer);
        return new Promise((resolve, reject) => {
            writer.on('finish', () => resolve(videoPath));
            writer.on('error', reject);
        });
    }
    // Transcribe audio using Whisper API with chunking for large files
    async transcribeAudio(audioPath, language = 'en') {
        const stats = fs_extra_1.default.statSync(audioPath);
        const fileSize = stats.size;
        // If file is small enough, transcribe directly
        if (fileSize <= this.CHUNK_SIZE) {
            return this.transcribeChunk(audioPath, language);
        }
        // For larger files, split into chunks
        const chunkDir = path_1.default.join(this.tempDir, 'chunks');
        await fs_extra_1.default.ensureDir(chunkDir);
        // Split audio into chunks
        const chunkDuration = 300; // 5 minutes per chunk (in seconds)
        const chunkFiles = [];
        await new Promise((resolve, reject) => {
            let chunkIndex = 0;
            (0, fluent_ffmpeg_1.default)(audioPath)
                .on('end', () => resolve())
                .on('error', reject)
                .on('progress', (progress) => {
                var _a;
                const percent = (_a = progress.percent) !== null && _a !== void 0 ? _a : 0;
                return console.log(`Processing: ${Math.round(percent)}% done`);
            })
                .outputOptions([
                '-f', 'segment',
                '-segment_time', chunkDuration.toString(),
                '-c', 'copy',
                '-map', '0:a:0',
                '-reset_timestamps', '1',
                '-loglevel', 'warning'
            ])
                .output(path_1.default.join(chunkDir, `chunk_%03d.mp3`))
                .run();
        });
        // Get all chunk files
        const files = await fs_extra_1.default.readdir(chunkDir);
        const chunkPromises = files
            .filter(file => file.endsWith('.mp3'))
            .sort()
            .map(file => {
            const chunkPath = path_1.default.join(chunkDir, file);
            return this.transcribeChunk(chunkPath, language);
        });
        // Transcribe all chunks in parallel
        const transcriptions = await Promise.all(chunkPromises);
        // Clean up chunk files
        await fs_extra_1.default.remove(chunkDir);
        // Combine transcriptions
        return transcriptions.join('\n\n');
    }
    // Transcribe a single audio chunk
    async transcribeChunk(audioPath, language) {
        try {
            const transcription = await openai.audio.transcriptions.create({
                file: fs_extra_1.default.createReadStream(audioPath),
                model: 'whisper-1',
                language: language,
                response_format: 'text',
            });
            return transcription;
        }
        catch (error) {
            console.error('Error transcribing audio chunk:', error);
            throw new Error('Failed to transcribe audio');
        }
    }
    // Process video from URL
    async processVideoUrl(videoUrl, language = 'en') {
        try {
            // Download the video
            const videoPath = await this.downloadVideo(videoUrl);
            // Extract audio
            const audioPath = await this.extractAudio(videoPath);
            // Clean up video file
            await fs_extra_1.default.remove(videoPath);
            // Transcribe audio
            const transcript = await this.transcribeAudio(audioPath, language);
            // Clean up audio file
            await fs_extra_1.default.remove(audioPath);
            return transcript;
        }
        catch (error) {
            console.error('Error processing video URL:', error);
            throw new Error('Failed to process video URL');
        }
    }
    // Process uploaded video file
    async processVideoFile(file, language = 'en') {
        try {
            // Save uploaded file to temp location
            const tempPath = path_1.default.join(this.tempDir, file.originalname);
            await fs_extra_1.default.writeFile(tempPath, file.buffer);
            // Extract audio
            const audioPath = await this.extractAudio(tempPath);
            // Clean up temp file
            await fs_extra_1.default.remove(tempPath);
            // Transcribe audio
            const transcript = await this.transcribeAudio(audioPath, language);
            // Clean up audio file
            await fs_extra_1.default.remove(audioPath);
            return transcript;
        }
        catch (error) {
            console.error('Error processing video file:', error);
            throw new Error('Failed to process video file');
        }
    }
    // Clean up temporary files
    async cleanup() {
        try {
            await fs_extra_1.default.remove(this.tempDir);
        }
        catch (error) {
            console.error('Error cleaning up temporary files:', error);
        }
    }
}
exports.default = new VideoProcessor();
