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
export { getUserSets, getUserSet, addUserSet, updateUserSet, deleteUserSet };