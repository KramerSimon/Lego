import express from 'express';
import { getPartRelationships, getPartRelationship } from './part_relationships.controller.js';
const router = express.Router();
router.get('/', getPartRelationships);
router.get('/:id', getPartRelationship);
export default router;
