import { Router } from 'express';
import { getChatHistory, sendMessage, getUnreadCount } from '../controllers/chatController.js';
import { ensureAuthenticated } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/history/:partnerId', ensureAuthenticated, getChatHistory);
router.post('/send', ensureAuthenticated, sendMessage);
router.get('/unread', ensureAuthenticated, getUnreadCount);

export default router;
