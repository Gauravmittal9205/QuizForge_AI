import mongoose, { Document, Schema } from 'mongoose';

export interface ILearningSection {
    title: string;
    content: string;
}

export interface ILearningSession extends Document {
    userId: string;
    subjectId: string;
    subjectName: string;
    topic: string;
    level: 'Beginner' | 'Intermediate' | 'Exam-Oriented';
    sections: ILearningSection[];
    currentSectionIndex: number;
    progress: number;
    status: 'active' | 'paused' | 'completed';
    notes: string;
    difficultyFeedback?: 'Easy' | 'Medium' | 'Hard';
    createdAt: Date;
    updatedAt: Date;
}

const LearningSectionSchema = new Schema({
    title: { type: String, required: true },
    content: { type: String, required: true }
});

const LearningSessionSchema = new Schema({
    userId: { type: String, required: true },
    subjectId: { type: String, required: true },
    subjectName: { type: String, required: true },
    topic: { type: String, required: true },
    level: {
        type: String,
        enum: ['Beginner', 'Intermediate', 'Exam-Oriented'],
        required: true
    },
    sections: [LearningSectionSchema],
    currentSectionIndex: { type: Number, default: 0 },
    progress: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ['active', 'paused', 'completed'],
        default: 'active'
    },
    notes: { type: String, default: '' },
    difficultyFeedback: {
        type: String,
        enum: ['Easy', 'Medium', 'Hard']
    }
}, { timestamps: true });

export default mongoose.model<ILearningSession>('LearningSession', LearningSessionSchema);
