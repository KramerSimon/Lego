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
      if (message === 'Email not verified. Please verify your email before logging in.') {
        response.status(403).json({ error: message });
        return;
      }
      if (message.startsWith('Failed to send verification email.') || message.startsWith('Failed to send 2FA code.')) {
        response.status(502).json({ error: message });
        return;
      }
      response.status(500).json({ error: message });
    });
}

function verifyTwoFactor(request, response) {
  const twoFactorToken = request.body?.two_factor_token;
  const code = request.body?.code;

  authModel.verifyTwoFactor(twoFactorToken, code)
    .then((result) => {
      response.json(result);
    })
    .catch((error) => {
      const message = error?.message || 'Two-factor verification failed';
      if (message === 'Two-factor token and code are required') {
        response.status(400).json({ error: message });
        return;
      }
      if (
        message === 'Invalid two-factor token'
        || message === 'Two-factor code is invalid or expired'
      ) {
        response.status(401).json({ error: message });
        return;
      }
      if (message === 'Two-factor authentication is not enabled for this account') {
        response.status(400).json({ error: message });
        return;
      }
      response.status(500).json({ error: message });
    });
}

function resendTwoFactor(request, response) {
  const twoFactorToken = request.body?.two_factor_token;

  authModel.resendTwoFactor(twoFactorToken)
    .then((result) => {
      response.json(result);
    })
    .catch((error) => {
      const message = error?.message || 'Unable to resend two-factor code';
      if (message === 'Two-factor token is required' || message === 'Invalid two-factor token') {
        response.status(400).json({ error: message });
        return;
      }
      if (message === 'Two-factor authentication is not enabled for this account') {
        response.status(400).json({ error: message });
        return;
      }
      if (message.startsWith('Failed to send 2FA code.')) {
        response.status(502).json({ error: message });
        return;
      }
      response.status(500).json({ error: message });
    });
}

function register(request, response) {
  authModel.register(request.body ?? {})
    .then((result) => {
      response.status(201).json(result);
    })
    .catch((error) => {
      const message = error?.message || 'Registration failed';
      if (
        message === 'username, email and password are required'
        || message === 'Password must be at least 8 characters long'
      ) {
        response.status(400).json({ error: message });
        return;
      }
      if (message === 'Username already exists' || message === 'Email already exists') {
        response.status(409).json({ error: message });
        return;
      }
      if (message.startsWith('Failed to send verification email.')) {
        response.status(502).json({ error: message });
        return;
      }
      response.status(500).json({ error: message });
    });
}

function verifyEmail(request, response) {
  const token = request.body?.token;
  authModel.verifyEmailToken(token)
    .then((result) => {
      response.json(result);
    })
    .catch((error) => {
      const message = error?.message || 'Email verification failed';
      if (message === 'Verification token is required') {
        response.status(400).json({ error: message });
        return;
      }
      if (message === 'Verification link is invalid or expired') {
        response.status(400).json({ error: message });
        return;
      }
      response.status(500).json({ error: message });
    });
}

function verifyEmailFromLink(request, response) {
  const token = request.query?.token;
  authModel.verifyEmailToken(token)
    .then(() => {
      response.type('html').send('<html><body><h2>Email verified successfully</h2><p>You can return to the app and log in now.</p></body></html>');
    })
    .catch(() => {
      response.status(400).type('html').send('<html><body><h2>Verification failed</h2><p>The verification link is invalid or expired.</p></body></html>');
    });
}

function resendVerification(request, response) {
  const identifier = request.body?.email || request.body?.identifier;
  authModel.resendVerificationEmail(identifier)
    .then((result) => {
      response.json(result);
    })
    .catch((error) => {
      const message = error?.message || 'Unable to resend verification email';
      if (message === 'Email or username is required' || message === 'User with this email/username was not found') {
        response.status(400).json({ error: message });
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

function completeOnboarding(request, response) {
  const token = getBearerToken(request);
  if (!token) {
    response.status(401).json({ error: 'Missing bearer token' });
    return;
  }

  authModel.completeOnboarding(token)
    .then((user) => {
      response.json({ user });
    })
    .catch((error) => {
      const message = error?.message || 'Unable to mark onboarding as completed';
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

export { login, register, me, completeOnboarding, verifyEmail, verifyEmailFromLink, resendVerification, verifyTwoFactor, resendTwoFactor };
