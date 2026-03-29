import express from 'express';
import {
	getUserSets,
	getUserSet,
	getSetParts,
	getUserSetBreakdown,
	updateUserSetBreakdownPart,
	deleteUserSetBreakdownPart,
	addUserSet,
	addUserSetWithParts,
	updateUserSet,
	deleteUserSet
} from './user_sets.controller.js';
const router = express.Router();
router.get('/', getUserSets);
router.get('/set-parts/:setNum', getSetParts);
router.get('/:id/breakdown', getUserSetBreakdown);
router.put('/:id/parts/:kind/:rowId', updateUserSetBreakdownPart);
router.delete('/:id/parts/:kind/:rowId', deleteUserSetBreakdownPart);
router.get('/:id', getUserSet);
router.post('/', addUserSet);
router.post('/with-parts', addUserSetWithParts);
router.put('/:id', updateUserSet);
router.delete('/:id', deleteUserSet);
export default router;