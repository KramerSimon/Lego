import express from 'express';
import { getUsers, getUser, addUser, updateUser, deleteUser, getMyUser, updateMyUser } from './users.controller.js';
import { profileImageUpload } from './users.upload.js';
const router = express.Router();
router.get('/', getUsers);
router.get('/me', getMyUser);
router.put('/me', profileImageUpload.single('profile_image'), updateMyUser);
router.get('/:id', getUser);
router.post('/', addUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

router.use((error, _request, response, next) => {
	if (!error) {
		next();
		return;
	}
	response.status(400).json({ error: error.message || 'Invalid upload request' });
});

export default router;