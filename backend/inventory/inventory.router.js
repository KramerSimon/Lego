import express from 'express';
import { getInventory, addInventory, updateInventory, deleteInventory } from './inventory.controller.js';
const router = express.Router();
router.get('/', getInventory);
router.post('/', addInventory);
router.put('/:id', updateInventory);
router.delete('/:id', deleteInventory);
export default router;