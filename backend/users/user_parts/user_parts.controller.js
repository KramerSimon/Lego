import userPartModel from './user_parts.model.js';
function getUserParts(request, response) {
  userPartModel.getAll(request.query)
    .then(items => {
      response.json(items);
    })
    .catch(error => {
      response.status(500).json({ error: 'Failed to retrieve user parts' });
    });
}
function getUserPart(request, response) {
  const id = request.params.id;
  userPartModel.getItem(id)
    .then(item => {
      if (item) {
        response.json(item);
      } else {
        response.status(404).json({ error: 'User part not found' });
      }
    })
    .catch(error => {
      response.status(500).json({ error: 'Failed to retrieve user part' });
    });
}
function addUserPart(request, response) {
  const newItem = request.body;
  userPartModel.add(newItem)
    .then(item => {
      response.status(201).json(item);
    })
    .catch(error => {
      response.status(500).json({ error: 'Failed to add user part' });
    });
}
function updateUserPart(request, response) {
  const id = request.params.id;
  const updatedItem = request.body;
  userPartModel.update(id, updatedItem)
    .then(item => {
      if (item) {
        response.json(item);
      } else {
        response.status(404).json({ error: 'User part not found' });
      }
    })
    .catch(error => {
      response.status(500).json({ error: 'Failed to update user part' });
    });
}
function deleteUserPart(request, response) {
  const id = request.params.id;
  userPartModel.delete(id)
    .then(result => {
      if (result) {
        response.json({ message: 'User part deleted successfully' });
      } else {
        response.status(404).json({ error: 'User part not found' });
      }
    })
    .catch(error => {
      response.status(500).json({ error: 'Failed to delete user part' });
    });
}
export { getUserParts, getUserPart, addUserPart, updateUserPart, deleteUserPart };