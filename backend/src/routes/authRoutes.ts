import { Router } from 'express';
import { signup, login, verifyOtp } from '../controllers/authController.js';
import { signupValidation, loginValidation } from '../middlewares/authValidation.js';

const router = Router();
router.post('/login', loginValidation, login);
router.post('/signup', signupValidation, signup);
router.post('/verify-otp', verifyOtp);
export default router;