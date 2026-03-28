import express from 'express';
import { getUserParts, getUserPart, addUserPart, updateUserPart, deleteUserPart } from './user_parts.controller.js';
const router = express.Router();
router.get('/', getUserParts);
router.get('/:id', getUserPart);
router.post('/', addUserPart);
router.put('/:id', updateUserPart);
router.delete('/:id', deleteUserPart);
export default router;