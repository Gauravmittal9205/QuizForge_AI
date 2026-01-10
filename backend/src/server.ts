import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import connectDB from './config/db';
import userRoutes from './routes/userRoutes';
// import profileRoutes from './routes/profileRoutes';
import profileRoutes from './routes/profileRoutes';
import './models/profileModel';
import syllabusRoutes from './routes/syllabusRoutes';
import learningSessionRoutes from './routes/learningSessionRoutes';
import quizRoutes from './routes/quizRoutes';

const app = express();
const PORT = process.env.PORT || 5001; // Changed default port to 5001

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/api/syllabus', syllabusRoutes);
app.use('/api/learning-sessions', learningSessionRoutes);
app.use('/api/quiz', quizRoutes);
// Connect to MongoDB
connectDB();

// Routes
app.use('/api/users', userRoutes);
app.use('/api/profile', profileRoutes);
// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});


// Start server
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  console.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});
// In backend/src/server.ts, add the following with other route imports


// Add this with other route middleware
