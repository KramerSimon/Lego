import express from 'express';
import { getInventoryMinifigs, getInventoryMinifig } from './inventory_minifigs.controller.js';
const router = express.Router();
router.get('/', getInventoryMinifigs);
router.get('/:id', getInventoryMinifig);
export default router;
