import { Router } from 'express';
import {
    startSession,
    getSession,
    getUserSessions,
    updateSession,
    completeTopicInSyllabus
} from '../controllers/learningSessionController';

const router = Router();

router.post('/start', startSession);
router.get('/user/:userId', getUserSessions);
router.get('/:id', getSession);
router.put('/:id', updateSession);
router.post('/complete-topic', completeTopicInSyllabus);

export default router;
