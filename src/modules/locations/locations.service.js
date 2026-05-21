// src/modules/locations/locations.service.js
const db = require('../../config/db');

const createLocation = async ({ userId, name, type, address, city, state }) => {
  const result = await db.query(
    `INSERT INTO locations (user_id, name, type, address, city, state)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [userId, name, type, address, city, state]
  );
  return result.rows[0];
};

const getAllLocations = async () => {
  const result = await db.query(`SELECT * FROM locations ORDER BY created_at DESC`);
  return result.rows;
};

const getLocationById = async (id) => {
  const result = await db.query(`SELECT * FROM locations WHERE id = $1`, [id]);
  if (result.rows.length === 0) {
    const error = new Error('Location not found');
    error.statusCode = 404;
    throw error;
  }
  return result.rows[0];
};

const getMyLocations = async (userId) => {
  const result = await db.query(
    `SELECT * FROM locations WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
};

const updateLocation = async (id, userId, role, { name, address, city, state }) => {
  // Only the owner or admin can update
  const check = await db.query(`SELECT * FROM locations WHERE id = $1`, [id]);
  if (check.rows.length === 0) {
    const error = new Error('Location not found');
    error.statusCode = 404;
    throw error;
  }

  if (role !== 'admin' && check.rows[0].user_id !== userId) {
    const error = new Error('You do not own this location');
    error.statusCode = 403;
    throw error;
  }

  const result = await db.query(
    `UPDATE locations SET name = COALESCE($1, name),
                          address = COALESCE($2, address),
                          city = COALESCE($3, city),
                          state = COALESCE($4, state)
     WHERE id = $5 RETURNING *`,
    [name, address, city, state, id]
  );
  return result.rows[0];
};

const deleteLocation = async (id, userId, role) => {
  const check = await db.query(`SELECT * FROM locations WHERE id = $1`, [id]);
  if (check.rows.length === 0) {
    const error = new Error('Location not found');
    error.statusCode = 404;
    throw error;
  }

  if (role !== 'admin' && check.rows[0].user_id !== userId) {
    const error = new Error('You do not own this location');
    error.statusCode = 403;
    throw error;
  }

  await db.query(`DELETE FROM locations WHERE id = $1`, [id]);
};

module.exports = { createLocation, getAllLocations, getLocationById, getMyLocations, updateLocation, deleteLocation };