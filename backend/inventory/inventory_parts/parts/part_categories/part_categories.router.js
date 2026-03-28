import express from 'express';
import { getPartCategorys, getPartCategory } from './part_categories.controller.js';
const router = express.Router();
router.get('/', getPartCategorys);
router.get('/:id', getPartCategory);
export default router;
