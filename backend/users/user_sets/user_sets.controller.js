import userSetModel from './user_sets.model.js';

function getUserSets(request, response) {
  userSetModel.getAll(request.query)
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
  const payload = request.body;
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
  userSetModel.getBreakdown(userSetId)
    .then((result) => {
      if (!result) {
        response.status(404).json({ error: 'User set not found' });
        return;
      }
      response.json(result);
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

  if (!['available', 'missing'].includes(kind)) {
    response.status(400).json({ error: 'kind must be available or missing' });
    return;
  }

  userSetModel.updateBreakdownPart(userSetId, kind, rowId, quantity)
    .then((updated) => {
      if (!updated) {
        response.status(404).json({ error: 'Part row not found for this user set' });
        return;
      }
      response.json({ message: 'Part row updated' });
    })
    .catch((error) => {
      response.status(500).json({ error: error?.message || 'Failed to update part row' });
    });
}

function deleteUserSetBreakdownPart(request, response) {
  const userSetId = Number(request.params.id);
  const kind = String(request.params.kind || '').toLowerCase();
  const rowId = Number(request.params.rowId);

  if (!['available', 'missing'].includes(kind)) {
    response.status(400).json({ error: 'kind must be available or missing' });
    return;
  }

  userSetModel.deleteBreakdownPart(userSetId, kind, rowId)
    .then((deleted) => {
      if (!deleted) {
        response.status(404).json({ error: 'Part row not found for this user set' });
        return;
      }
      response.json({ message: 'Part row deleted' });
    })
    .catch((error) => {
      response.status(500).json({ error: error?.message || 'Failed to delete part row' });
    });
}
function getUserSet(request, response) {
  const id = request.params.id;
  userSetModel.getItem(id)
    .then(item => {
      if (item) {
        response.json(item);
      } else {
        response.status(404).json({ error: 'User set not found' });
      }
    })
    .catch(error => {
      response.status(500).json({ error: 'Failed to retrieve user set' });
    });
}
function addUserSet(request, response) {
  const newItem = request.body;
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
  const updatedItem = request.body;
  userSetModel.update(id, updatedItem)
    .then(item => {
      if (item) {
        response.json(item);
      } else {
        response.status(404).json({ error: 'User set not found' });
      }
    })
    .catch(error => {
      response.status(500).json({ error: 'Failed to update user set' });
    });
}
function deleteUserSet(request, response) {
  const id = request.params.id;
  userSetModel.delete(id)
    .then(result => {
      if (result) {
        response.json({ message: 'User set deleted successfully' });
      } else {
        response.status(404).json({ error: 'User set not found' });
      }
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