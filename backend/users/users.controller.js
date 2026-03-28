import userModel from './users.model.js';
function getUsers(request, response) {
  userModel.getAll(request.query)
    .then(inventory => {
      response.json(inventory);
    })
    .catch(error => {
      response.status(500).json({ error: 'Failed to retrieve users' });
    });
}
function getUser(request, response) {
  const id = request.params.id;
  userModel.getItem(id)
    .then(item => {
      if (item) {
        response.json(item);
      } else {
        response.status(404).json({ error: 'User not found' });
      }
    })
    .catch(error => {
      response.status(500).json({ error: 'Failed to retrieve user' });
    });
}
function addUser(request, response) {
  const newUser = request.body;
  userModel.add(newUser)
    .then(user => {
      response.status(201).json(user);
    })
    .catch(error => {
      response.status(500).json({ error: 'Failed to add user' });
    });
}
function updateUser(request, response) {
  const id = request.params.id;
  const updatedUser = request.body;
  userModel.update(id, updatedUser)
    .then(user => {
      if (user) {
        response.json(user);
      } else {
        response.status(404).json({ error: 'User not found' });
      }
    })
    .catch(error => {
      response.status(500).json({ error: 'Failed to update user' });
    });
}
function deleteUser(request, response) {
  const id = request.params.id;
  userModel.delete(id)
    .then(result => {
      if (result) {
        response.json({ message: 'User deleted successfully' });
      } else {
        response.status(404).json({ error: 'User not found' });
      }
    })
    .catch(error => {
      response.status(500).json({ error: 'Failed to delete user' });
    });
}
export { getUsers, getUser, addUser, updateUser, deleteUser };