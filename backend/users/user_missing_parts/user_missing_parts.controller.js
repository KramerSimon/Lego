import userMissingPartModel from './user_missing_parts.model.js';

function getUserMissingPartsCatalog(request, response) {
  userMissingPartModel.getCatalog(request.query)
    .then(items => {
      response.json(items);
    })
    .catch(() => {
      response.status(500).json({ error: 'Failed to retrieve missing parts catalog' });
    });
}

function getUserMissingParts(request, response) {
  userMissingPartModel.getAll(request.query)
    .then(items => {
      response.json(items);
    })
    .catch(error => {
      response.status(500).json({ error: 'Failed to retrieve user missing parts' });
    });
}
function getUserMissingPart(request, response) {
  const id = request.params.id;
  userMissingPartModel.getItem(id)
    .then(item => {
      if (item) {
        response.json(item);
      } else {
        response.status(404).json({ error: 'User missing part not found' });
      }
    })
    .catch(error => {
      response.status(500).json({ error: 'Failed to retrieve user missing part' });
    });
}
function addUserMissingPart(request, response) {
  const newItem = request.body;
  userMissingPartModel.add(newItem)
    .then(item => {
      response.status(201).json(item);
    })
    .catch(error => {
      response.status(500).json({ error: 'Failed to add user missing part' });
    });
}
function updateUserMissingPart(request, response) {
  const id = request.params.id;
  const updatedItem = request.body;
  userMissingPartModel.update(id, updatedItem)
    .then(item => {
      if (item) {
        response.json(item);
      } else {
        response.status(404).json({ error: 'User missing part not found' });
      }
    })
    .catch(error => {
      response.status(500).json({ error: 'Failed to update user missing part' });
    });
}
function deleteUserMissingPart(request, response) {
  const id = request.params.id;
  userMissingPartModel.delete(id)
    .then(result => {
      if (result) {
        response.json({ message: 'User missing part deleted successfully' });
      } else {
        response.status(404).json({ error: 'User missing part not found' });
      }
    })
    .catch(error => {
      response.status(500).json({ error: 'Failed to delete user missing part' });
    });
}
export { getUserMissingPartsCatalog, getUserMissingParts, getUserMissingPart, addUserMissingPart, updateUserMissingPart, deleteUserMissingPart };