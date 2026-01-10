import mongoose, { Document, Schema } from 'mongoose';

export interface IChapter {
  id: string;
  name: string;
  description?: string;
  targetDate?: string;
  files: Array<{
    id: string;
    name: string;
    type: string;
    size: number;
    url: string;
    status: 'not-started' | 'in-progress' | 'completed';
    uploadedAt: string;
  }>;
  isExpanded: boolean;
}

export interface ISyllabus extends Document {
  userId?: string;
  name: string;
  subjectCode?: string;
  description: string;
  targetDate: Date;
  priority: 'high' | 'medium' | 'low';
  type: 'theory' | 'practical' | 'combined';
  chapters: IChapter[];
  studyMaterials: Array<{
    id: string;
    name: string;
    type: string;
    size: number;
    url: string;
    status: 'not-started' | 'in-progress' | 'completed';
    uploadedAt: string;
  }>;
  isExpanded: boolean;
  progress: number;
  status: 'completed' | 'in-progress' | 'pending';
  createdAt: Date;
  updatedAt: Date;
}

const FileSchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  url: { type: String, required: true },
});

const StudyMaterialSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  type: { type: String, required: true },
  size: { type: Number, required: true },
  url: { type: String, required: true },
  status: {
    type: String,
    enum: ['not-started', 'in-progress', 'completed'],
    default: 'not-started'
  },
  uploadedAt: { type: Date, default: Date.now }
});

const ChapterSchema = new Schema({
  name: { type: String, required: true },
  description: String,
  targetDate: Date,
  files: [StudyMaterialSchema],
  isExpanded: { type: Boolean, default: true }
});

const SyllabusSchema = new Schema({
  userId: { type: String },
  name: { type: String, required: true },
  subjectCode: { type: String, required: true },
  description: { type: String, default: '' },
  targetDate: { type: Date, required: true },
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  },
  type: {
    type: String,
    enum: ['theory', 'practical', 'combined'],
    default: 'theory'
  },
  chapters: [ChapterSchema],
  studyMaterials: [StudyMaterialSchema],
  attachments: [FileSchema],
  isExpanded: { type: Boolean, default: true },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  status: {
    type: String,
    enum: ['completed', 'in-progress', 'pending'],
    default: 'pending'
  }
}, { timestamps: true });

export default mongoose.model<ISyllabus>('Syllabus', SyllabusSchema);
