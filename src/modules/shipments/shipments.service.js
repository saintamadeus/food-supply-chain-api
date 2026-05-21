// modules/shipments/shipments.service.js
const db = require('../../config/db');
const logInventoryEvent = require('../../utils/logger')

const VALID_TRANSITIONS = {
  pending: ['in_transit', 'cancelled'],
  in_transit: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

const createShipment = async ({ created_by, distributor_id, source_location_id, destination_location_id, departure_date, batches }) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const shipmentResult = await client.query(
      `INSERT INTO shipments (created_by, distributor_id, source_location_id, destination_location_id, status, departure_date)
       VALUES ($1, $2, $3, $4, 'pending', $5)
       RETURNING *`,
      [created_by, distributor_id, source_location_id, destination_location_id, departure_date || null]
    );

    const shipment = shipmentResult.rows[0];

    for (const b of batches) {
      if (!b.batch_id || !b.quantity_moved) {
        throw new Error('Each batch entry must have batch_id and quantity_moved');
      }

      // Single query — fetch everything we need before touching anything
      const batchCheck = await client.query(
        `SELECT status, quantity, current_location_id FROM batches WHERE id = $1`,
        [b.batch_id]
      );

      const row = batchCheck.rows[0];
      if (!row) throw new Error(`Batch ${b.batch_id} not found`);

      const { status: currentStatus, quantity: availableQuantity, current_location_id: currentLocationId } = row;

      // Validate status
      if (!['ready', 'stored'].includes(currentStatus)) {
        throw new Error(`Batch ${b.batch_id} cannot be shipped. Current status: ${currentStatus}`);
      }

      // Validate quantity — must happen before any updates
      if (b.quantity_moved > availableQuantity) {
        throw new Error(
          `Batch ${b.batch_id} only has ${availableQuantity} units available. Cannot move ${b.quantity_moved}.`
        );
      }

      await client.query(
        `INSERT INTO shipment_batches (shipment_id, batch_id, quantity_moved, notes)
         VALUES ($1, $2, $3, $4)`,
        [shipment.id, b.batch_id, b.quantity_moved, b.notes || null]
      );

      await client.query(
        `UPDATE batches SET status = 'in_transit' WHERE id = $1`,
        [b.batch_id]
      );

      await logInventoryEvent({
        batch_id:         b.batch_id,
        performed_by:     created_by,
        action:           'moved',
        quantity_change:  b.quantity_moved,
        from_location_id: currentLocationId,
        to_location_id:   destination_location_id,
        notes:            `Batch dispatched in shipment #${shipment.id}`,
        client,
      });
    }

    await client.query('COMMIT');
    return shipment;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const getShipments = async (user) => {
  if (user.role === 'admin') {
    const result = await db.query(`SELECT * FROM shipments ORDER BY created_at DESC`);
    return result.rows;
  }

  // Everyone else sees only shipments they are involved in
  const result = await db.query(
    `SELECT * FROM shipments WHERE created_by = $1 OR distributor_id = $1 ORDER BY created_at DESC`,
    [user.id]
  );
  return result.rows;
};

const getShipmentById = async (id, user) => {
  const result = await db.query(
    `SELECT s.*, 
            json_agg(json_build_object(
              'batch_id', sb.batch_id,
              'quantity_moved', sb.quantity_moved,
              'notes', sb.notes
            )) AS batches
     FROM shipments s
     LEFT JOIN shipment_batches sb ON sb.shipment_id = s.id
     WHERE s.id = $1
     GROUP BY s.id`,
    [id]
  );

  const shipment = result.rows[0];
  if (!shipment) return null;

  // Non-admins can only see shipments they're part of
  if (user.role !== 'admin' && shipment.created_by !== user.id && shipment.distributor_id !== user.id) {
    return null; // treat as not found — don't leak existence
  }

  return shipment;
};

const updateShipmentStatus = async (id, newStatus, user) => {
  const result = await db.query(`SELECT * FROM shipments WHERE id = $1`, [id]);
  const shipment = result.rows[0];
  if (!shipment) return null;

  const allowed = VALID_TRANSITIONS[shipment.status];
  if (!allowed || !allowed.includes(newStatus)) {
    const error = new Error(`Invalid status transition: ${shipment.status} → ${newStatus}`);
    error.statusCode = 422;
    throw error;
  }

  // Simple status updates (pending → in_transit, any → cancelled)
  // don't need a transaction — single query, no side effects
  if (newStatus !== 'delivered') {
    const updated = await db.query(
      `UPDATE shipments SET status = $1::text WHERE id = $2 RETURNING *`,
      [newStatus, id]
    );
    return updated.rows[0];
  }

  // Delivery is the consequential transition — wrap everything in a transaction
  // because we're touching shipments, batches, and inventory_logs together
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // 1. Update shipment status and stamp arrival_date
    const updated = await client.query(
      `UPDATE shipments 
       SET status = $1::text, arrival_date = NOW()
       WHERE id = $2 
       RETURNING *`,
      [newStatus, id]
    );

    // 2. Fetch all batches in this shipment with their quantities
    const batchRows = await client.query(
      `SELECT sb.batch_id, sb.quantity_moved, b.current_location_id AS from_location_id
       FROM shipment_batches sb
       JOIN batches b ON b.id = sb.batch_id
       WHERE sb.shipment_id = $1`,
      [id]
    );

    // 3. Update all linked batches — mark stored, move to destination
    await client.query(
      `UPDATE batches 
       SET status = 'stored', current_location_id = $1
       FROM shipment_batches sb
       WHERE sb.shipment_id = $2 AND sb.batch_id = batches.id`,
      [shipment.destination_location_id, id]
    );

    // 4. Log a 'received' entry for each batch
    for (const row of batchRows.rows) {
      await logInventoryEvent({
        batch_id:         row.batch_id,
        performed_by:     user.id,
        action:           'received',
        quantity_change:  row.quantity_moved,
        from_location_id: row.from_location_id,
        to_location_id:   shipment.destination_location_id,
        notes:            `Batch received at destination via shipment #${id}`,
        client,
      });
    }

    await client.query('COMMIT');
    return updated.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const dispatchShipment = async (id, user) => {
  // Only supplier or distributor can dispatch (pending → in_transit)
  if (!['supplier', 'distributor', 'admin'].includes(user.role)) {
    const error = new Error(`Unauthorized: Role '${user.role}' cannot dispatch shipments`);
    error.statusCode = 403;
    throw error;
  }
  return updateShipmentStatus(id, 'in_transit', user);
};

const deliverShipment = async (id, user) => {
  // Only warehouse_manager or retailer can confirm delivery (in_transit → delivered)
  if (!['warehouse_manager', 'retailer', 'admin'].includes(user.role)) {
    const error = new Error(`Unauthorized: Role '${user.role}' cannot confirm delivery`);
    error.statusCode = 403;
    throw error;
  }
  return updateShipmentStatus(id, 'delivered', user);
};

const cancelShipment = async (id, user) => {
  // Admin or the shipment creator can cancel
  const result = await db.query(`SELECT * FROM shipments WHERE id = $1`, [id]);
  const shipment = result.rows[0];
  if (!shipment) {
    const error = new Error('Shipment not found');
    error.statusCode = 404;
    throw error;
  }
  if (user.role !== 'admin' && shipment.created_by !== user.id) {
    const error = new Error('Unauthorized: Only the creator or admin can cancel a shipment');
    error.statusCode = 403;
    throw error;
  }
  return updateShipmentStatus(id, 'cancelled', user);
};

module.exports = { createShipment, getShipments, getShipmentById, updateShipmentStatus, dispatchShipment, deliverShipment, cancelShipment };