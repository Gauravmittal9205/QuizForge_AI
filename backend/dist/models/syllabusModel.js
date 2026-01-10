"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const FileSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    type: { type: String, required: true },
    url: { type: String, required: true },
});
const StudyMaterialSchema = new mongoose_1.Schema({
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
const ChapterSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    description: String,
    targetDate: Date,
    files: [StudyMaterialSchema],
    isExpanded: { type: Boolean, default: true }
});
const SyllabusSchema = new mongoose_1.Schema({
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
exports.default = mongoose_1.default.model('Syllabus', SyllabusSchema);
