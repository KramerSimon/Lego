import express from 'express';
import { getSets, getSet } from './sets.controller.js';
const router = express.Router();
router.get('/', getSets);
router.get('/:id', getSet);
export default router;
