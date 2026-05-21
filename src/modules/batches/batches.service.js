// src/modules/batches/batches.service.js
const db = require('../../config/db');
const logInventoryEvent = require('../../utils/logger');

const VALID_TRANSITIONS = {
  created: ['ready', 'expired'],
  ready: ['in_transit', 'expired'],
  in_transit: ['stored', 'expired'],
  stored: ['in_transit', 'partially_sold', 'expired'],
  partially_sold: ['sold', 'expired'],
  sold: [],
  expired: []
};

const TRANSITION_ACTORS = {
  ready:          ['producer'],
  in_transit:     ['supplier', 'distributor'],
  stored:         ['warehouse_manager', 'retailer', 'supplier'],
  partially_sold: ['retailer'],
  sold:           ['retailer'],
  expired:        ['admin', 'warehouse_manager'],
};

const createBatch = async ({ productId, supplierId, quantity, unit, currentLocationId, productionDate, expiryDate, performedBy }) => {
  const product = await db.query(`SELECT * FROM products WHERE id = $1`, [productId]);
  if (product.rows.length === 0) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }

  const result = await db.query(
    `INSERT INTO batches (product_id, supplier_id, quantity, unit, current_location_id, status, production_date, expiry_date)
     VALUES ($1, $2, $3, $4, $5, 'created', $6, $7)
     RETURNING *`,
    [productId, supplierId, quantity, unit, currentLocationId, productionDate, expiryDate]
  );

  const batch = result.rows[0];

  await logInventoryEvent({
    batch_id:        batch.id,
    performed_by:    performedBy,
    action:          'created',
    quantity_change: batch.quantity,
    to_location_id:  batch.current_location_id,
    notes:           `Batch created with ${batch.quantity} ${batch.unit}`,
  });

  return batch;
};

const getAllBatches = async () => {
  const result = await db.query(
    `SELECT b.*, p.name AS product_name, l.name AS location_name
     FROM batches b
     JOIN products p ON b.product_id = p.id
     LEFT JOIN locations l ON b.current_location_id = l.id
     ORDER BY b.created_at DESC`
  );
  return result.rows;
};

const getBatchById = async (id) => {
  const result = await db.query(
    `SELECT b.*, p.name AS product_name, l.name AS location_name
     FROM batches b
     JOIN products p ON b.product_id = p.id
     LEFT JOIN locations l ON b.current_location_id = l.id
     WHERE b.id = $1`,
    [id]
  );
  if (result.rows.length === 0) {
    const error = new Error('Batch not found');
    error.statusCode = 404;
    throw error;
  }
  return result.rows[0];
};

const getMyBatches = async (userId, role) => {
  let query;
  // Producers see batches of their products
  // Suppliers see batches assigned to them
  if (role === 'producer') {
    query = await db.query(
      `SELECT b.*, p.name AS product_name FROM batches b
       JOIN products p ON b.product_id = p.id
       WHERE p.producer_id = $1 ORDER BY b.created_at DESC`,
      [userId]
    );
  } else if (role === 'supplier') {
    query = await db.query(
      `SELECT b.*, p.name AS product_name FROM batches b
       JOIN products p ON b.product_id = p.id
       WHERE b.supplier_id = $1 ORDER BY b.created_at DESC`,
      [userId]
    );
  } else {
    query = await db.query(
      `SELECT b.*, p.name AS product_name FROM batches b
       JOIN products p ON b.product_id = p.id
       ORDER BY b.created_at DESC`
    );
  }
  return query.rows;
};

const updateBatchStatus = async (id, status, userId, role) => {
  const allowedStatuses = ['created', 'ready', 'in_transit', 'stored', 'partially_sold', 'sold', 'expired'];
  if (!allowedStatuses.includes(status)) {
    const error = new Error(`Invalid status. Must be one of: ${allowedStatuses.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }

  const check = await db.query(
    `SELECT b.*, p.producer_id 
     FROM batches b 
     JOIN products p ON b.product_id = p.id 
     WHERE b.id = $1`,
    [id]
  );
  if (check.rows.length === 0) {
    const error = new Error('Batch not found');
    error.statusCode = 404;
    throw error;
  }

  const batch = check.rows[0];

  // FIX: check TRANSITION_ACTORS first, then ownership
  const allowedRoles = TRANSITION_ACTORS[status];
  if (!allowedRoles) {
    const error = new Error(`No actors defined for status: ${status}`);
    error.statusCode = 500;
    throw error;
  }

  if (role !== 'admin' && !allowedRoles.includes(role)) {
    const error = new Error(`Unauthorized: Role '${role}' cannot transition a batch to '${status}'`);
    error.statusCode = 403;
    throw error;
  }

  // Ownership check (non-admin)
  if (role !== 'admin') {
    if (role === 'producer' && batch.producer_id !== userId) {
      const error = new Error('Unauthorized: You can only update your own batches');
      error.statusCode = 403;
      throw error;
    }
    if (role === 'supplier' && batch.supplier_id !== userId) {
      const error = new Error('Unauthorized: You can only update batches assigned to you');
      error.statusCode = 403;
      throw error;
    }
  }

  // Enforce state machine
  const allowedTransitions = VALID_TRANSITIONS[batch.status];
  if (!allowedTransitions || !allowedTransitions.includes(status)) {
    const error = new Error(`Invalid status transition: ${batch.status} → ${status}`);
    error.statusCode = 422;
    throw error;
  }

  // Wrap in transaction only for expired — two-table write
  if (status === 'expired') {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE batches SET status = $1 WHERE id = $2 RETURNING *`,
        [status, id]
      );

      await logInventoryEvent({
        batch_id: id,
        performed_by: userId,
        action: 'expired',
        quantity_change: -batch.quantity,
        from_location_id: batch.current_location_id,
        to_location_id: null,
        notes: `Batch marked expired by ${role}`,
        client,
      });

      await client.query('COMMIT');
      return result.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // Non-expired transitions — no log needed, simple update
  const result = await db.query(
    `UPDATE batches SET status = $1 WHERE id = $2 RETURNING *`,
    [status, id]
  );
  return result.rows[0];
};

const getBatchTrail = async (batchId, user) => {
  // First confirm batch exists
  const batchCheck = await db.query(`SELECT * FROM batches WHERE id = $1`, [batchId]);
  if (batchCheck.rows.length === 0) {
    const error = new Error('Batch not found');
    error.statusCode = 404;
    throw error;
  }

  const batch = batchCheck.rows[0];

  // Non-admins can only see trails for batches they're involved in
  if (user.role !== 'admin') {
    const involved =
      (user.role === 'producer' && batch.producer_id === user.id) ||  // needs join — see note below
      (user.role === 'supplier' && batch.supplier_id === user.id) ||
      (user.role === 'retailer'); // retailer involvement checked via transactions

    // Simplest safe check: just query the log and see if they appear
    const involvement = await db.query(
      `SELECT 1 FROM inventory_logs WHERE batch_id = $1 AND performed_by = $2 LIMIT 1`,
      [batchId, user.id]
    );
    if (involvement.rows.length === 0) {
      const error = new Error('Batch not found');
      error.statusCode = 404;
      throw error;
    }
  }

  const result = await db.query(
    `SELECT 
       il.id,
       il.action,
       il.quantity_change,
       il.notes,
       il.created_at,
       u.name         AS performed_by_name,
       u.role         AS performed_by_role,
       fl.name        AS from_location,
       tl.name        AS to_location
     FROM inventory_logs il
     LEFT JOIN users u  ON il.performed_by     = u.id
     LEFT JOIN locations fl ON il.from_location_id = fl.id
     LEFT JOIN locations tl ON il.to_location_id   = tl.id
     WHERE il.batch_id = $1
     ORDER BY il.created_at ASC`,
    [batchId]
  );

  return result.rows;
};

module.exports = { createBatch, getAllBatches, getBatchById, getMyBatches, updateBatchStatus, getBatchTrail };