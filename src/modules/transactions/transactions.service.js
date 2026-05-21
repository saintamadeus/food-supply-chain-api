// modules/transactions/transactions.service.js
const db = require('../../config/db');

const createTransaction = async ({ retailer_id, location_id, items }) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Calculate total
    const total_amount = items.reduce((sum, item) => sum + item.quantity_sold * item.price_per_unit, 0);

    const txResult = await client.query(
      `INSERT INTO transactions (retailer_id, location_id, total_amount) VALUES ($1, $2, $3) RETURNING *`,
      [retailer_id, location_id, total_amount]
    );

    const transaction = txResult.rows[0];

    for (const item of items) {
      // Check batch exists and has enough quantity
      const batchResult = await client.query(
        `SELECT * FROM batches WHERE id = $1`,
        [item.batch_id]
      );
      const batch = batchResult.rows[0];

      if (!batch) throw new Error(`Batch ${item.batch_id} not found`);
      if (batch.quantity < item.quantity_sold) {
        throw new Error(`Insufficient quantity in batch ${item.batch_id}. Available: ${batch.quantity}`);
      }
      if (!['stored', 'partially_sold'].includes(batch.status)) {
        throw new Error(`Batch ${item.batch_id} is not available for sale. Status: ${batch.status}`);
      }

      await client.query(
        `INSERT INTO transaction_items (transaction_id, batch_id, quantity_sold, price_per_unit)
         VALUES ($1, $2, $3, $4)`,
        [transaction.id, item.batch_id, item.quantity_sold, item.price_per_unit]
      );

      const newQuantity = batch.quantity - item.quantity_sold;
      const newStatus = newQuantity === 0 ? 'sold' : 'partially_sold';

      await client.query(
        `UPDATE batches SET quantity = $1, status = $2 WHERE id = $3`,
        [newQuantity, newStatus, item.batch_id]
      );

      await logInventoryEvent({
        batch_id: item.batch_id,
        performed_by: retailer_id,
        action: 'sold',
        quantity_change: -item.quantity_sold,
        from_location_id: location_id,
        to_location_id: null,
        notes: `Sold via transaction ${transaction.id}`,
        client,
      });
    }

    await client.query('COMMIT');
    return transaction;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const getTransactions = async (user) => {
  if (user.role === 'admin') {
    const result = await db.query(`SELECT * FROM transactions ORDER BY created_at DESC`);
    return result.rows;
  }
  const result = await db.query(
    `SELECT * FROM transactions WHERE retailer_id = $1 ORDER BY created_at DESC`,
    [user.id]
  );
  return result.rows;
};

const getTransactionById = async (id, user) => {
  const result = await db.query(
    `SELECT t.*, 
            json_agg(json_build_object(
              'batch_id', ti.batch_id,
              'quantity_sold', ti.quantity_sold,
              'price_per_unit', ti.price_per_unit
            )) AS items
     FROM transactions t
     LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
     WHERE t.id = $1
     GROUP BY t.id`,
    [id]
  );

  const transaction = result.rows[0];
  if (!transaction) return null;
  if (user.role !== 'admin' && transaction.retailer_id !== user.id) return null;

  return transaction;
};

module.exports = { createTransaction, getTransactions, getTransactionById };