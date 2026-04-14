import express from 'express';
import { login, register, me, completeOnboarding, verifyEmail, verifyEmailFromLink, resendVerification } from './auth.controller.js';

const router = express.Router();

router.post('/login', login);
router.post('/register', register);
router.post('/verify-email', verifyEmail);
router.get('/verify-email', verifyEmailFromLink);
router.post('/resend-verification', resendVerification);
router.get('/me', me);
router.post('/onboarding/complete', completeOnboarding);

export default router;
