import { Router } from 'express';
import { addQuestion, getAllQuestions, toggleQuestionStatus, getCurrentCycle, updateQuestion, createCycle, updateCycleStatus } from '../controllers/adminController.js';
import { runMatchingEngine } from '../controllers/matchController.js';
import { verifyAdmin } from '../middlewares/adminAuth.js';

const router = Router();

// Question management
router.post('/questions', verifyAdmin, addQuestion);
router.get('/questions', verifyAdmin, getAllQuestions);
router.patch('/questions/:id/status', verifyAdmin, toggleQuestionStatus);
router.put('/questions/:id', verifyAdmin, updateQuestion);

// Cycle lifecycle
router.get('/cycle/current', verifyAdmin, getCurrentCycle);
router.post('/cycle', verifyAdmin, createCycle);
router.patch('/cycle/:id/status', verifyAdmin, updateCycleStatus);

// Matching engine
router.post('/engine/run', verifyAdmin, runMatchingEngine);

export default router;