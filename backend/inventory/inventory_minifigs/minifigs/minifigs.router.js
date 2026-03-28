import express from 'express';
import { getMinifigs, getMinifig } from './minifigs.controller.js';
const router = express.Router();
router.get('/', getMinifigs);
router.get('/:id', getMinifig);
export default router;
