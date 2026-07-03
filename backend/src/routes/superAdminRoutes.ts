import { Router } from 'express';
import { getPendingAdmins, getAllAdmins, approveAdmin, rejectAdmin, getAllColleges, createCollege, getPlatformStats } from '../controllers/superAdminController.js';
import { verifySuperAdmin } from '../middlewares/adminAuth.js';

const router = Router();

// Admin approval workflow
router.get('/pending-admins', verifySuperAdmin, getPendingAdmins);
router.get('/admins', verifySuperAdmin, getAllAdmins);
router.patch('/admins/:id/approve', verifySuperAdmin, approveAdmin);
router.patch('/admins/:id/reject', verifySuperAdmin, rejectAdmin);

// College management
router.get('/colleges', verifySuperAdmin, getAllColleges);
router.post('/colleges', verifySuperAdmin, createCollege);

// Platform stats
router.get('/stats', verifySuperAdmin, getPlatformStats);

export default router;
