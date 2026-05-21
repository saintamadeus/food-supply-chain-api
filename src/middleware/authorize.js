// src/middleware/authorize.js

/**
 * authorize() returns a middleware function that checks if the
 * authenticated user's role is in the allowed list.
 *
 * Usage: router.get('/route', authenticate, authorize('admin', 'producer'), controller)
 *
 * WHY a factory function (a function that returns a function)?
 * Because middleware must be a function with (req, res, next) signature.
 * We need to pass roles into it. A factory lets us do:
 *   authorize('admin', 'producer')
 * which returns the actual middleware with those roles baked in.
 */

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    // authenticate middleware must run first — req.user must exist
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
      });
    }

    next();
  };
};

module.exports = authorize;