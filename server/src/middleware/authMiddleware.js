import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.error('FATAL: JWT_SECRET environment variable is not set. Refusing to start in production without a secure secret.');
  process.exit(1);
}

const EFFECTIVE_JWT_SECRET = JWT_SECRET || 'nyayvault-dev-only-insecure-secret';

if (!JWT_SECRET) {
  console.warn('[SECURITY WARNING] JWT_SECRET is not set. Using insecure development fallback. Set JWT_SECRET in .env for production.');
}

/**
 * Validates JWT token from the Authorization header.
 * Uses req.originalUrl for bypass checks to correctly handle middleware mounting context.
 */
export async function authenticateUser(req, res, next) {
  const originalUrl = req.originalUrl || '';

  // Allow healthcheck to bypass auth (public endpoint)
  if (originalUrl === '/api/health') {
    return next();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. No token provided.' });
  }

  jwt.verify(token, EFFECTIVE_JWT_SECRET, (err, userPayload) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }

    // Inject user info into request
    req.user = userPayload;

    // Fallback for older endpoints that rely on x-user-id header
    req.headers['x-user-id'] = userPayload.id;

    next();
  });
}
