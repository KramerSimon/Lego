import express from 'express';
import {
	getUserMissingPartsCatalog,
	getUserMissingParts,
	getUserMissingPart,
	addUserMissingPart,
	updateUserMissingPart,
	deleteUserMissingPart
} from './user_missing_parts.controller.js';
const router = express.Router();
router.get('/catalog', getUserMissingPartsCatalog);
router.get('/', getUserMissingParts);
router.get('/:id', getUserMissingPart);
router.post('/', addUserMissingPart);
router.put('/:id', updateUserMissingPart);
router.delete('/:id', deleteUserMissingPart);
export default router;