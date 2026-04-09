import userMissingPartModel from './user_missing_parts.model.js';

function authContext(request) {
  return {
    userId: Number(request.auth?.user_id),
    isAdmin: Number(request.auth?.is_admin ?? 0) > 0
  };
}

async function ensureOwnerOrAdmin(request, missingPartId) {
  const { userId, isAdmin } = authContext(request);
  if (isAdmin) {
    return true;
  }
  const ownerId = await userMissingPartModel.getOwnerUserId(missingPartId);
  if (!ownerId) {
    return null;
  }
  return ownerId === userId;
}

function getUserMissingPartsCatalog(request, response) {
  const { userId, isAdmin } = authContext(request);
  const nextQuery = isAdmin ? request.query : { ...request.query, user_id: userId };

  userMissingPartModel.getCatalog(nextQuery)
    .then(items => {
      response.json(items);
    })
    .catch(() => {
      response.status(500).json({ error: 'Failed to retrieve missing parts catalog' });
    });
}

function getUserMissingParts(request, response) {
  const { userId, isAdmin } = authContext(request);
  const nextQuery = isAdmin ? request.query : { ...request.query, user_id: userId };

  userMissingPartModel.getAll(nextQuery)
    .then(items => {
      response.json(items);
    })
    .catch(error => {
      response.status(500).json({ error: 'Failed to retrieve user missing parts' });
    });
}
function getUserMissingPart(request, response) {
  const id = Number(request.params.id);
  ensureOwnerOrAdmin(request, id)
    .then((allowed) => {
      if (allowed === null) {
        response.status(404).json({ error: 'User missing part not found' });
        return;
      }
      if (!allowed) {
        response.status(403).json({ error: 'You can only access missing parts from your own sets' });
        return;
      }
      return userMissingPartModel.getItem(id)
        .then(item => {
          if (item) {
            response.json(item);
          } else {
            response.status(404).json({ error: 'User missing part not found' });
          }
        });
    })
    .catch(error => {
      response.status(500).json({ error: 'Failed to retrieve user missing part' });
    });
}
function addUserMissingPart(request, response) {
  const { userId, isAdmin } = authContext(request);
  const newItem = { ...(request.body ?? {}) };
  const targetUserId = Number(newItem.user_id);
  if (!isAdmin && Number.isFinite(targetUserId) && targetUserId > 0 && targetUserId !== userId) {
    response.status(403).json({ error: 'You can only add missing parts to your own account' });
    return;
  }
  if (!isAdmin) {
    newItem.user_id = userId;
  }
  userMissingPartModel.add(newItem)
    .then(item => {
      response.status(201).json(item);
    })
    .catch(error => {
      response.status(500).json({ error: 'Failed to add user missing part' });
    });
}
function updateUserMissingPart(request, response) {
  const id = Number(request.params.id);
  const updatedItem = request.body;
  ensureOwnerOrAdmin(request, id)
    .then((allowed) => {
      if (allowed === null) {
        response.status(404).json({ error: 'User missing part not found' });
        return;
      }
      if (!allowed) {
        response.status(403).json({ error: 'You can only edit missing parts from your own sets' });
        return;
      }
      return userMissingPartModel.update(id, updatedItem)
        .then(item => {
          if (item) {
            response.json(item);
          } else {
            response.status(404).json({ error: 'User missing part not found' });
          }
        });
    })
    .catch(error => {
      response.status(500).json({ error: 'Failed to update user missing part' });
    });
}
function deleteUserMissingPart(request, response) {
  const id = Number(request.params.id);
  ensureOwnerOrAdmin(request, id)
    .then((allowed) => {
      if (allowed === null) {
        response.status(404).json({ error: 'User missing part not found' });
        return;
      }
      if (!allowed) {
        response.status(403).json({ error: 'You can only delete missing parts from your own sets' });
        return;
      }
      return userMissingPartModel.delete(id)
        .then(result => {
          if (result) {
            response.json({ message: 'User missing part deleted successfully' });
          } else {
            response.status(404).json({ error: 'User missing part not found' });
          }
        });
    })
    .catch(error => {
      response.status(500).json({ error: 'Failed to delete user missing part' });
    });
}
export { getUserMissingPartsCatalog, getUserMissingParts, getUserMissingPart, addUserMissingPart, updateUserMissingPart, deleteUserMissingPart };