const { signup, login, verifyOtp } = require('../Controllers/AuthController');
const { signupValidation, loginValidation } = require('../Middlewares/AuthValidation');
// Ensure 'verifyOtp' is included in the curly braces here:

const router = require('express').Router();

router.post('/login', loginValidation, login);
router.post('/signup', signupValidation, signup);
router.post('/verify-otp', verifyOtp);

module.exports = router;