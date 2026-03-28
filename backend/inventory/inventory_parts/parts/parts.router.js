import express from 'express';
import { getParts, getPart } from './parts.controller.js';
const router = express.Router();
router.get('/', getParts);
router.get('/:id', getPart);
export default router;
