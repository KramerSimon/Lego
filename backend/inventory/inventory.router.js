import express from 'express';
import { getInventories, getInventory } from './inventory.controller.js';
const router = express.Router();
router.get('/', getInventories);
router.get('/:id', getInventory);
export default router;