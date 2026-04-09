import express from 'express';
import { getSets, getSet, getSetParts, getSetInstructions } from './sets.controller.js';
const router = express.Router();
router.get('/', getSets);
router.get('/:id/parts', getSetParts);
router.get('/:id/instructions', getSetInstructions);
router.get('/:id', getSet);
export default router;
