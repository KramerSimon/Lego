import express from 'express';
import { getThemes, getTheme } from './themes.controller.js';
const router = express.Router();
router.get('/', getThemes);
router.get('/:id', getTheme);
export default router;
