import express from 'express';
import { login, me } from './auth.controller.js';

const router = express.Router();

router.post('/login', login);
router.get('/me', me);

export default router;
