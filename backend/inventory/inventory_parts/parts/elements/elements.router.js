import express from 'express';
import { getElements, getElement } from './elements.controller.js';
const router = express.Router();
router.get('/', getElements);
router.get('/:id', getElement);
export default router;
