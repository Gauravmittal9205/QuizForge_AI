import express from 'express';
import { getProfile, updateProfile } from '../controllers/profileController';

const router = express.Router();

// Get user profile
router.get('/', getProfile);

// Create or update user profile
router.put('/', updateProfile);

export default router;
