// src/modules/auth/auth.controller.js
const authService = require('./auth.service');

/**
 * WHY keep controllers thin?
 * A controller's job is: extract data from request → call service → send response.
 * No business logic here. If you put logic in controllers, you can't test or reuse it.
 */

const register = async (req, res, next) => {
  try {
    const { name, email, password, role, phone } = req.body;

    // Basic input validation — keep it simple for now, Phase 8 will add proper validation middleware
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'name, email, password, and role are required' });
    }

    // Validate role is one of the allowed values
    const allowedRoles = ['admin', 'producer', 'supplier', 'warehouse_manager', 'distributor', 'retailer'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: `role must be one of: ${allowedRoles.join(', ')}` });
    }

    const user = await authService.registerUser({ name, email, password, role, phone });

    res.status(201).json({
      message: 'User registered successfully',
      user,
    });
  } catch (err) {
    next(err); // Pass to error handling middleware
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'email and password are required' });
    }

    const { accessToken, refreshToken, user } = await authService.loginUser({ email, password });

    res.status(200).json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user,
    });
  } catch (err) {
    next(err);
  }
};

const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refreshAccessToken(refreshToken);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    await authService.logoutUser(refreshToken);
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, refresh, logout };