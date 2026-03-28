import express from 'express';
import { getInventoryParts, getInventoryPart } from './inventory_parts.controller.js';
const router = express.Router();
router.get('/', getInventoryParts);
router.get('/:id', getInventoryPart);
export default router;
