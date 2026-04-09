import userSetModel from './user_sets.model.js';

function authContext(request) {
  return {
    userId: Number(request.auth?.user_id),
    isAdmin: Number(request.auth?.is_admin ?? 0) > 0
  };
}

async function ensureOwnerOrAdmin(request, userSetId) {
  const { userId, isAdmin } = authContext(request);
  if (isAdmin) {
    return true;
  }
  const ownerId = await userSetModel.getOwnerUserId(userSetId);
  if (!ownerId) {
    return null;
  }
  return ownerId === userId;
}

function getUserSets(request, response) {
  const { userId, isAdmin } = authContext(request);
  const nextQuery = isAdmin ? request.query : { ...request.query, user_id: userId };

  userSetModel.getAll(nextQuery)
    .then(items => {
      response.json(items);
    })
    .catch(error => {
      response.status(500).json({ error: 'Failed to retrieve user sets' });
    });
}

function getSetParts(request, response) {
  const setNum = request.params.setNum;
  userSetModel.getSetParts(setNum)
    .then((result) => {
      response.json(result);
    })
    .catch(() => {
      response.status(500).json({ error: 'Failed to retrieve set parts' });
    });
}

function addUserSetWithParts(request, response) {
  const { userId, isAdmin } = authContext(request);
  const payload = request.body ?? {};
  const targetUserId = Number(payload?.user_set?.user_id);

  if (!isAdmin && Number.isFinite(targetUserId) && targetUserId > 0 && targetUserId !== userId) {
    response.status(403).json({ error: 'You can only add sets to your own account' });
    return;
  }

  payload.user_set = {
    ...(payload.user_set ?? {}),
    user_id: isAdmin
      ? payload?.user_set?.user_id
      : userId
  };

  userSetModel.addWithParts(payload)
    .then((result) => {
      response.status(201).json(result);
    })
    .catch((error) => {
      response.status(500).json({ error: error?.message || 'Failed to add user set with parts' });
    });
}

function getUserSetBreakdown(request, response) {
  const userSetId = Number(request.params.id);
  ensureOwnerOrAdmin(request, userSetId)
    .then((allowed) => {
      if (allowed === null) {
        response.status(404).json({ error: 'User set not found' });
        return;
      }
      if (!allowed) {
        response.status(403).json({ error: 'You can only access your own set breakdown' });
        return;
      }
      return userSetModel.getBreakdown(userSetId)
        .then((result) => {
          if (!result) {
            response.status(404).json({ error: 'User set not found' });
            return;
          }
          response.json(result);
        });
    })
    .catch((error) => {
      response.status(500).json({ error: error?.message || 'Failed to retrieve user set breakdown' });
    });
}

function updateUserSetBreakdownPart(request, response) {
  const userSetId = Number(request.params.id);
  const kind = String(request.params.kind || '').toLowerCase();
  const rowId = Number(request.params.rowId);
  const quantity = Number(request.body?.quantity);
  const { isAdmin } = authContext(request);

  if (!['available', 'missing'].includes(kind)) {
    response.status(400).json({ error: 'kind must be available or missing' });
    return;
  }

  if (!isAdmin && kind !== 'missing') {
    response.status(403).json({ error: 'You can only edit missing parts of your own sets' });
    return;
  }

  ensureOwnerOrAdmin(request, userSetId)
    .then((allowed) => {
      if (allowed === null) {
        response.status(404).json({ error: 'User set not found' });
        return;
      }
      if (!allowed) {
        response.status(403).json({ error: 'You can only edit missing parts of your own sets' });
        return;
      }
      return userSetModel.updateBreakdownPart(userSetId, kind, rowId, quantity)
        .then((updated) => {
          if (!updated) {
            response.status(404).json({ error: 'Part row not found for this user set' });
            return;
          }
          response.json({ message: 'Part row updated' });
        });
    })
    .catch((error) => {
      response.status(500).json({ error: error?.message || 'Failed to update part row' });
    });
}

function deleteUserSetBreakdownPart(request, response) {
  const userSetId = Number(request.params.id);
  const kind = String(request.params.kind || '').toLowerCase();
  const rowId = Number(request.params.rowId);
  const { isAdmin } = authContext(request);

  if (!['available', 'missing'].includes(kind)) {
    response.status(400).json({ error: 'kind must be available or missing' });
    return;
  }

  if (!isAdmin && kind !== 'missing') {
    response.status(403).json({ error: 'You can only edit missing parts of your own sets' });
    return;
  }

  ensureOwnerOrAdmin(request, userSetId)
    .then((allowed) => {
      if (allowed === null) {
        response.status(404).json({ error: 'User set not found' });
        return;
      }
      if (!allowed) {
        response.status(403).json({ error: 'You can only edit missing parts of your own sets' });
        return;
      }
      return userSetModel.deleteBreakdownPart(userSetId, kind, rowId)
        .then((deleted) => {
          if (!deleted) {
            response.status(404).json({ error: 'Part row not found for this user set' });
            return;
          }
          response.json({ message: 'Part row deleted' });
        });
    })
    .catch((error) => {
      response.status(500).json({ error: error?.message || 'Failed to delete part row' });
    });
}
function getUserSet(request, response) {
  const id = Number(request.params.id);
  ensureOwnerOrAdmin(request, id)
    .then((allowed) => {
      if (allowed === null) {
        response.status(404).json({ error: 'User set not found' });
        return;
      }
      if (!allowed) {
        response.status(403).json({ error: 'You can only access your own sets' });
        return;
      }

      return userSetModel.getItem(id)
        .then(item => {
          if (item) {
            response.json(item);
          } else {
            response.status(404).json({ error: 'User set not found' });
          }
        });
    })
    .catch(error => {
      response.status(500).json({ error: 'Failed to retrieve user set' });
    });
}
function addUserSet(request, response) {
  const { userId, isAdmin } = authContext(request);
  const newItem = { ...(request.body ?? {}) };
  const targetUserId = Number(newItem.user_id);
  if (!isAdmin && Number.isFinite(targetUserId) && targetUserId > 0 && targetUserId !== userId) {
    response.status(403).json({ error: 'You can only add sets to your own account' });
    return;
  }
  if (!isAdmin) {
    newItem.user_id = userId;
  }
  userSetModel.add(newItem)
    .then(item => {
      response.status(201).json(item);
    })
    .catch(error => {
      response.status(500).json({ error: 'Failed to add user set' });
    });
}
function updateUserSet(request, response) {
  const id = request.params.id;
  const userSetId = Number(id);
  const { userId, isAdmin } = authContext(request);
  const updatedItem = { ...(request.body ?? {}) };

  ensureOwnerOrAdmin(request, userSetId)
    .then((allowed) => {
      if (allowed === null) {
        response.status(404).json({ error: 'User set not found' });
        return;
      }
      if (!allowed) {
        response.status(403).json({ error: 'You can only edit your own sets' });
        return;
      }

      if (!isAdmin) {
        updatedItem.user_id = userId;
      }

      return userSetModel.update(id, updatedItem)
        .then(item => {
          if (item) {
            response.json(item);
          } else {
            response.status(404).json({ error: 'User set not found' });
          }
        });
    })
    .catch(error => {
      response.status(500).json({ error: 'Failed to update user set' });
    });
}
function deleteUserSet(request, response) {
  const id = request.params.id;
  const userSetId = Number(id);
  ensureOwnerOrAdmin(request, userSetId)
    .then((allowed) => {
      if (allowed === null) {
        response.status(404).json({ error: 'User set not found' });
        return;
      }
      if (!allowed) {
        response.status(403).json({ error: 'You can only delete your own sets' });
        return;
      }
      return userSetModel.delete(id)
        .then(result => {
          if (result) {
            response.json({ message: 'User set deleted successfully' });
          } else {
            response.status(404).json({ error: 'User set not found' });
          }
        });
    })
    .catch(error => {
      response.status(500).json({ error: 'Failed to delete user set' });
    });
}
export {
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
};