import { Response } from 'express';
import Syllabus, { ISyllabus } from '../models/syllabusModel';
import { AuthRequest } from '../middleware/auth';

// Create a new syllabus
export const createSyllabus = async (req: AuthRequest, res: Response) => {
  try {
    const syllabusData = {
      ...req.body,
      userId: req.body?.userId || req.body?.uid,
      targetDate: req.body?.targetDate ? new Date(req.body.targetDate) : undefined,
    };

    const syllabus = await Syllabus.create(syllabusData);
    res.status(201).json(syllabus);
  } catch (error) {
    console.error('Error creating syllabus:', error);
    res.status(500).json({ message: 'Error creating syllabus', error: (error as Error).message });
  }
};

// Get all syllabuses for a user
export const getSyllabuses = async (req: AuthRequest, res: Response) => {
  try {
    const userId = (req.query.userId as string) || (req.query.uid as string);
    const filter = userId ? { userId } : {};
    const syllabuses = await Syllabus.find(filter);
    res.status(200).json(syllabuses);
  } catch (error) {
    console.error('Error fetching syllabuses:', error);
    res.status(500).json({ message: 'Error fetching syllabuses', error: (error as Error).message });
  }
};

// Update a syllabus
export const updateSyllabus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const syllabus = await Syllabus.findById(id);
    if (!syllabus) {
      return res.status(404).json({ message: 'Syllabus not found' });
    }

    const updatedSyllabus = await Syllabus.findByIdAndUpdate(
      id,
      { ...req.body, ...(req.body?.targetDate ? { targetDate: new Date(req.body.targetDate) } : {}) },
      { new: true, runValidators: true }
    );

    res.status(200).json(updatedSyllabus);
  } catch (error) {
    console.error('Error updating syllabus:', error);
    res.status(500).json({ message: 'Error updating syllabus', error: (error as Error).message });
  }
};

// Delete a syllabus
export const deleteSyllabus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const syllabus = await Syllabus.findById(id);
    if (!syllabus) {
      return res.status(404).json({ message: 'Syllabus not found' });
    }

    await Syllabus.findByIdAndDelete(id);
    res.status(200).json({ message: 'Syllabus deleted successfully' });
  } catch (error) {
    console.error('Error deleting syllabus:', error);
    res.status(500).json({ message: 'Error deleting syllabus', error: (error as Error).message });
  }
};
