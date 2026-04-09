import express from 'express';
import { login, register, me, completeOnboarding } from './auth.controller.js';

const router = express.Router();

router.post('/login', login);
router.post('/register', register);
router.get('/me', me);
router.post('/onboarding/complete', completeOnboarding);

export default router;
