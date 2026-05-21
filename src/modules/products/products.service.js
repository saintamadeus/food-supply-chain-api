// src/modules/products/products.service.js
const db = require('../../config/db');

const createProduct = async ({ producerId, name, description, category }) => {
  const result = await db.query(
    `INSERT INTO products (producer_id, name, description, category)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [producerId, name, description, category]
  );
  return result.rows[0];
};

const getAllProducts = async () => {
  const result = await db.query(
    `SELECT p.*, u.name AS producer_name 
     FROM products p 
     JOIN users u ON p.producer_id = u.id 
     ORDER BY p.created_at DESC`
  );
  return result.rows;
};

const getProductById = async (id) => {
  const result = await db.query(
    `SELECT p.*, u.name AS producer_name 
     FROM products p 
     JOIN users u ON p.producer_id = u.id 
     WHERE p.id = $1`,
    [id]
  );
  if (result.rows.length === 0) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }
  return result.rows[0];
};

const getMyProducts = async (producerId) => {
  const result = await db.query(
    `SELECT * FROM products WHERE producer_id = $1 ORDER BY created_at DESC`,
    [producerId]
  );
  return result.rows;
};

const updateProduct = async (id, producerId, role, { name, description, category }) => {
  const check = await db.query(`SELECT * FROM products WHERE id = $1`, [id]);
  if (check.rows.length === 0) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }
  if (role !== 'admin' && check.rows[0].producer_id !== producerId) {
    const error = new Error('You do not own this product');
    error.statusCode = 403;
    throw error;
  }
  const result = await db.query(
    `UPDATE products SET name = COALESCE($1, name),
                         description = COALESCE($2, description),
                         category = COALESCE($3, category)
     WHERE id = $4 RETURNING *`,
    [name, description, category, id]
  );
  return result.rows[0];
};

const deleteProduct = async (id, producerId, role) => {
  const check = await db.query(`SELECT * FROM products WHERE id = $1`, [id]);
  if (check.rows.length === 0) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }
  if (role !== 'admin' && check.rows[0].producer_id !== producerId) {
    const error = new Error('You do not own this product');
    error.statusCode = 403;
    throw error;
  }
  await db.query(`DELETE FROM products WHERE id = $1`, [id]);
};

module.exports = { createProduct, getAllProducts, getProductById, getMyProducts, updateProduct, deleteProduct };