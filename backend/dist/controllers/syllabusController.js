"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSyllabus = exports.updateSyllabus = exports.getSyllabuses = exports.createSyllabus = void 0;
const syllabusModel_1 = __importDefault(require("../models/syllabusModel"));
// Create a new syllabus
const createSyllabus = async (req, res) => {
    var _a, _b, _c;
    try {
        const syllabusData = {
            ...req.body,
            userId: ((_a = req.body) === null || _a === void 0 ? void 0 : _a.userId) || ((_b = req.body) === null || _b === void 0 ? void 0 : _b.uid),
            targetDate: ((_c = req.body) === null || _c === void 0 ? void 0 : _c.targetDate) ? new Date(req.body.targetDate) : undefined,
        };
        const syllabus = await syllabusModel_1.default.create(syllabusData);
        res.status(201).json(syllabus);
    }
    catch (error) {
        console.error('Error creating syllabus:', error);
        res.status(500).json({ message: 'Error creating syllabus', error: error.message });
    }
};
exports.createSyllabus = createSyllabus;
// Get all syllabuses for a user
const getSyllabuses = async (req, res) => {
    try {
        const userId = req.query.userId || req.query.uid;
        const filter = userId ? { userId } : {};
        const syllabuses = await syllabusModel_1.default.find(filter);
        res.status(200).json(syllabuses);
    }
    catch (error) {
        console.error('Error fetching syllabuses:', error);
        res.status(500).json({ message: 'Error fetching syllabuses', error: error.message });
    }
};
exports.getSyllabuses = getSyllabuses;
// Update a syllabus
const updateSyllabus = async (req, res) => {
    var _a;
    try {
        const { id } = req.params;
        const syllabus = await syllabusModel_1.default.findById(id);
        if (!syllabus) {
            return res.status(404).json({ message: 'Syllabus not found' });
        }
        const updatedSyllabus = await syllabusModel_1.default.findByIdAndUpdate(id, { ...req.body, ...(((_a = req.body) === null || _a === void 0 ? void 0 : _a.targetDate) ? { targetDate: new Date(req.body.targetDate) } : {}) }, { new: true, runValidators: true });
        res.status(200).json(updatedSyllabus);
    }
    catch (error) {
        console.error('Error updating syllabus:', error);
        res.status(500).json({ message: 'Error updating syllabus', error: error.message });
    }
};
exports.updateSyllabus = updateSyllabus;
// Delete a syllabus
const deleteSyllabus = async (req, res) => {
    try {
        const { id } = req.params;
        const syllabus = await syllabusModel_1.default.findById(id);
        if (!syllabus) {
            return res.status(404).json({ message: 'Syllabus not found' });
        }
        await syllabusModel_1.default.findByIdAndDelete(id);
        res.status(200).json({ message: 'Syllabus deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting syllabus:', error);
        res.status(500).json({ message: 'Error deleting syllabus', error: error.message });
    }
};
exports.deleteSyllabus = deleteSyllabus;
