// src/middleware/authenticate.js
const jwt = require('jsonwebtoken');

/**
 * This middleware runs BEFORE protected route handlers.
 * It verifies the access token and attaches the decoded user to req.user.
 * If the token is missing or invalid, it short-circuits with 401.
 */

const authenticate = (req, res, next) => {
  // WHY Bearer scheme? It's the RFC 6750 standard for JWT in HTTP.
  // The format is: Authorization: Bearer <token>
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access token required' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = decoded; // { userId, role, iat, exp }
    req.user.id = decoded.userId; // Ensure req.user.id works across the codebase
    next();
  } catch (err) {
    // WHY 401 vs 403?
    // 401 = Unauthenticated (who are you?)
    // 403 = Unauthorized (I know who you are, but you can't do this)
    // Expired/invalid token = 401
    return res.status(401).json({ message: 'Invalid or expired access token' });
  }
};

module.exports = authenticate;