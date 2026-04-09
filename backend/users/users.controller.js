import userModel from './users.model.js';

function asBaseUrl(request) {
  return `${request.protocol}://${request.get('host')}`;
}

function getUsers(request, response) {
  userModel.getAll(request.query)
    .then(inventory => {
      response.json(inventory);
    })
    .catch(error => {
      response.status(500).json({ error: 'Failed to retrieve users' });
    });
}

function getMyUser(request, response) {
  const userId = Number(request.auth?.user_id);
  if (!Number.isFinite(userId) || userId <= 0) {
    response.status(401).json({ error: 'Unauthorized' });
    return;
  }

  userModel.getSelf(userId)
    .then((user) => {
      if (!user) {
        response.status(404).json({ error: 'User not found' });
        return;
      }
      response.json({ user });
    })
    .catch(() => {
      response.status(500).json({ error: 'Failed to retrieve account details' });
    });
}

function updateMyUser(request, response) {
  const userId = Number(request.auth?.user_id);
  if (!Number.isFinite(userId) || userId <= 0) {
    response.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const payload = {
    username: request.body?.username,
    email: request.body?.email,
    full_name: request.body?.full_name,
    password: request.body?.password
  };

  if (request.file?.filename) {
    payload.profile_image_url = `${asBaseUrl(request)}/uploads/profile-images/${request.file.filename}`;
  }

  userModel.updateSelf(userId, payload)
    .then((user) => {
      response.json({ user });
    })
    .catch((error) => {
      if (error?.code === 'ER_DUP_ENTRY') {
        response.status(409).json({ error: 'Username or email already exists' });
        return;
      }
      response.status(500).json({ error: 'Failed to update account details' });
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
export { getUsers, getUser, addUser, updateUser, deleteUser, getMyUser, updateMyUser };