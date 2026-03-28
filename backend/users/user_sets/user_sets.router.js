import express from 'express';
import { getUserSets, getUserSet, addUserSet, updateUserSet, deleteUserSet } from './user_sets.controller.js';
const router = express.Router();
router.get('/', getUserSets);
router.get('/:id', getUserSet);
router.post('/', addUserSet);
router.put('/:id', updateUserSet);
router.delete('/:id', deleteUserSet);
export default router;