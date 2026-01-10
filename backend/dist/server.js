"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const db_1 = __importDefault(require("./config/db"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
// import profileRoutes from './routes/profileRoutes';
const profileRoutes_1 = __importDefault(require("./routes/profileRoutes"));
require("./models/profileModel");
const syllabusRoutes_1 = __importDefault(require("./routes/syllabusRoutes"));
const learningSessionRoutes_1 = __importDefault(require("./routes/learningSessionRoutes"));
const quizRoutes_1 = __importDefault(require("./routes/quizRoutes"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5001; // Changed default port to 5001
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
app.use('/api/syllabus', syllabusRoutes_1.default);
app.use('/api/learning-sessions', learningSessionRoutes_1.default);
app.use('/api/quiz', quizRoutes_1.default);
// Connect to MongoDB
(0, db_1.default)();
// Routes
app.use('/api/users', userRoutes_1.default);
app.use('/api/profile', profileRoutes_1.default);
// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});
// Start server
const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
    server.close(() => process.exit(1));
});
// In backend/src/server.ts, add the following with other route imports
// Add this with other route middleware
