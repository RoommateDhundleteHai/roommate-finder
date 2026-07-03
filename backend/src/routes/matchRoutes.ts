import { Router } from 'express';
import { getMatches } from '../controllers/matchController.js';
import { ensureAuthenticated } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/', ensureAuthenticated, getMatches);

export default router;