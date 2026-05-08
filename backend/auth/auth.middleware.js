import jwt from 'jsonwebtoken';
import env from '../config/env.js';

function getJwtSecret() {
  return env.authJwtSecret;
}

function authenticateRequest(request, response, next) {
  if (request.method === 'OPTIONS') {
    next();
    return;
  }

  const authHeader = String(request.headers.authorization ?? '').trim();
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    response.status(401).json({ error: 'Missing bearer token' });
    return;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    response.status(401).json({ error: 'Missing bearer token' });
    return;
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    request.auth = decoded;
    next();
  } catch {
    response.status(401).json({ error: 'Unauthorized' });
  }
}

function requireAdmin(request, response, next) {
  const isAdmin = Number(request.auth?.is_admin ?? 0) > 0;
  if (!isAdmin) {
    response.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}

export { authenticateRequest, requireAdmin };
