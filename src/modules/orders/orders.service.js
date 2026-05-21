const db = require('../../config/db');

exports.createOrder = async (orderData) => {
  const { retailer_id, warehouse_location_id, product_id, quantity } = orderData;
  const query = `INSERT INTO orders (retailer_id, warehouse_location_id, product_id, quantity, status) VALUES ($1, $2, $3, $4, 'pending') RETURNING *`;
  const { rows } = await db.query(query, [retailer_id, warehouse_location_id, product_id, quantity]);
  return rows[0];
};

exports.getPendingOrders = async () => {
  const { rows } = await db.query(`SELECT * FROM orders WHERE status = 'pending'`);
  return rows;
};

exports.processOrder = async (orderId, action) => {
  if (action === 'approve') {
    const { rows } = await db.query(`UPDATE orders SET status = 'approved', updated_at = NOW() WHERE id = $1 RETURNING *`, [orderId]);
    return rows[0];
  } else if (action === 'reject') {
    const { rows } = await db.query(`UPDATE orders SET status = 'unavailable', updated_at = NOW() WHERE id = $1 RETURNING *`, [orderId]);
    return rows[0];
  } else {
    throw new Error('Invalid action');
  }
};
