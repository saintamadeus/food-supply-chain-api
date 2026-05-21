// src/utils/logInventoryEvent.js

const db = require('../config/db');

const logInventoryEvent = async ({
  batch_id,
  performed_by,
  action,
  quantity_change = null,
  from_location_id = null,
  to_location_id = null,
  notes = null,
  client = null,          // pass open transaction client, or null for standalone query
}) => {
  const query = `
    INSERT INTO inventory_logs
      (batch_id, performed_by, action, quantity_change, from_location_id, to_location_id, notes)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;
  const params = [batch_id, performed_by, action, quantity_change, from_location_id, to_location_id, notes];

  // Use the open transaction client if provided, otherwise use the pool directly
  const runner = client || db;
  const result = await runner.query(query, params);
  return result.rows[0];
};

module.exports = logInventoryEvent;