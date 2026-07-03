import { Router } from 'express';
import { getActiveQuestions, submitPreferences, getUserProfile } from '../controllers/userController.js';
import { ensureAuthenticated } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/questions', ensureAuthenticated, getActiveQuestions);
router.post('/preferences', ensureAuthenticated, submitPreferences);
router.get('/profile', ensureAuthenticated, getUserProfile);

export default router;