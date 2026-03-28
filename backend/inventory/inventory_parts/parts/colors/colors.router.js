import express from 'express';
import { getColors, getColor } from './colors.controller.js';
const router = express.Router();
router.get('/', getColors);
router.get('/:id', getColor);
export default router;
