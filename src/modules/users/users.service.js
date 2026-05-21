// src/modules/users/users.service.js
const db = require('../../config/db');
const bcrypt = require('bcryptjs');

const getAllUsers = async () => {
  const result = await db.query(
    `SELECT id, name, email, role, phone, created_at FROM users ORDER BY created_at DESC`
  );
  return result.rows;
};

const getUserById = async (id) => {
  const result = await db.query(
    `SELECT id, name, email, role, phone, created_at FROM users WHERE id = $1`,
    [id]
  );
  if (result.rows.length === 0) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }
  return result.rows[0];
};

const updateUser = async (id, { name, phone, role }) => {
  const result = await db.query(
    `UPDATE users SET name = COALESCE($1, name),
                      phone = COALESCE($2, phone),
                      role = COALESCE($3, role),
                      updated_at = NOW()
     WHERE id = $4
     RETURNING id, name, email, role, phone, updated_at`,
    [name, phone, role, id]
  );
  if (result.rows.length === 0) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }
  return result.rows[0];
};

const deleteUser = async (id) => {
  const result = await db.query(
    `DELETE FROM users WHERE id = $1 RETURNING id`,
    [id]
  );
  if (result.rows.length === 0) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }
};

module.exports = { getAllUsers, getUserById, updateUser, deleteUser };