import authModel from './auth.model.js';

function getBearerToken(request) {
  const authHeader = String(request.headers.authorization ?? '').trim();
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return null;
  }
  return authHeader.slice(7).trim();
}

function login(request, response) {
  const identifier = request.body?.identifier;
  const password = request.body?.password;

  authModel.login(identifier, password)
    .then((result) => {
      response.json(result);
    })
    .catch((error) => {
      const message = error?.message || 'Authentication failed';
      if (message === 'Invalid credentials') {
        response.status(401).json({ error: message });
        return;
      }
      response.status(500).json({ error: message });
    });
}

function me(request, response) {
  const token = getBearerToken(request);
  if (!token) {
    response.status(401).json({ error: 'Missing bearer token' });
    return;
  }

  authModel.getMe(token)
    .then((user) => {
      response.json({ user });
    })
    .catch((error) => {
      const message = error?.message || 'Unauthorized';
      if (message === 'Missing token' || message === 'invalid token' || message === 'jwt malformed' || message === 'jwt expired') {
        response.status(401).json({ error: 'Unauthorized' });
        return;
      }
      if (message === 'User not found') {
        response.status(404).json({ error: message });
        return;
      }
      response.status(500).json({ error: message });
    });
}

export { login, me };
