// src/modules/auth/auth.service.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../../config/db');

/**
 * WHY a service layer?
 * Controllers handle HTTP (req/res). Services handle business logic.
 * This separation means you can test business logic without spinning up Express.
 * It also means if you ever switch from REST to GraphQL, your service layer is reusable.
 */

const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN,
  });
};

const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
  });
};

const registerUser = async ({ name, email, password, role, phone }) => {
  // 1. Check if email already exists
  const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    const error = new Error('Email already in use');
    error.statusCode = 409; // Conflict
    throw error;
  }

  // 2. Hash password
  // WHY 12 rounds? bcrypt cost factor. 10 is minimum acceptable, 12 is production standard.
  // Each increment doubles the work. 12 = ~300ms on average hardware. Slow enough to resist
  // brute force, fast enough for UX. Never go below 10 in production.
  const passwordHash = await bcrypt.hash(password, 12);

  // 3. Insert user
  const result = await db.query(
    `INSERT INTO users (name, email, password_hash, role, phone)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, email, role, created_at`,
    [name, email, passwordHash, role, phone]
  );

  return result.rows[0];
};

const loginUser = async ({ email, password }) => {
  // 1. Find user by email
  const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = result.rows[0];

  // WHY the same error message for both cases?
  // If you say "email not found" vs "wrong password", you're telling attackers
  // which emails are registered. Always use a generic message.
  if (!user) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  // 2. Compare passwords
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  // 3. Generate tokens
  const tokenPayload = { userId: user.id, role: user.role };
  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  // 4. Store refresh token in DB
  // WHY store it? So we can revoke it. Stateless refresh tokens defeat the purpose.
  // expires_at = now + 7 days, matching the JWT expiry
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.query(
    `INSERT INTO refresh_tokens (user_id, token, expires_at)
     VALUES ($1, $2, $3)`,
    [user.id, refreshToken, expiresAt]
  );

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};

const refreshAccessToken = async (refreshToken) => {
  if (!refreshToken) {
    const error = new Error('Refresh token required');
    error.statusCode = 401;
    throw error;
  }

  // 1. Verify JWT signature and expiry
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    const error = new Error('Invalid or expired refresh token');
    error.statusCode = 403;
    throw error;
  }

  // 2. Check if token exists in DB (not revoked)
  const result = await db.query(
    `SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()`,
    [refreshToken]
  );

  if (result.rows.length === 0) {
    const error = new Error('Refresh token not found or expired');
    error.statusCode = 403;
    throw error;
  }

  // 3. Issue new access token
  const newAccessToken = generateAccessToken({ userId: decoded.userId, role: decoded.role });

  return { accessToken: newAccessToken };
};

const logoutUser = async (refreshToken) => {
  // Delete the refresh token from DB — this is what "logout" actually means
  // The access token will expire on its own (15min). Nothing to do for it.
  await db.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
};

module.exports = { registerUser, loginUser, refreshAccessToken, logoutUser };