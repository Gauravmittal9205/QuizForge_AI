import express from 'express';
import { createOrUpdateUser, getUser } from '../controllers/userController';

const router = express.Router();

// Create or update user
router.post('/', createOrUpdateUser);

// Get user by UID
router.get('/:uid', getUser);

export default router;
