import express from 'express';
import { getInventorySets, getInventorySet } from './inventory_sets.controller.js';
const router = express.Router();
router.get('/', getInventorySets);
router.get('/:id', getInventorySet);
export default router;
