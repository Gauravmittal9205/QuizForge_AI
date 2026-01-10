import { Router } from 'express';
import { generateQuiz } from '../controllers/quizController';

const router = Router();

router.post('/generate', generateQuiz);

export default router;
