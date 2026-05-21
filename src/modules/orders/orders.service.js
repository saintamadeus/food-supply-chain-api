// This service handles the core business logic for orders and inventory checking.
// Assuming a DB client/pool is exported from src/config/db (we'll mock it for now)
// const db = require('../../config/db');

exports.createOrder = async (orderData) => {
  const { retailer_id, warehouse_location_id, product_id, quantity } = orderData;
  
  // TODO: Insert into the orders table
  // const query = `INSERT INTO orders (retailer_id, warehouse_location_id, product_id, quantity) VALUES ($1, $2, $3, $4) RETURNING *`;
  // const { rows } = await db.query(query, [retailer_id, warehouse_location_id, product_id, quantity]);
  // return rows[0];

  return {
    id: 1, // mocked id
    retailer_id,
    warehouse_location_id,
    product_id,
    quantity,
    status: 'pending',
    created_at: new Date()
  };
};

exports.getPendingOrders = async () => {
  // TODO: Select from orders where status = 'pending'
  // const { rows } = await db.query(`SELECT * FROM orders WHERE status = 'pending'`);
  // return rows;

  return [];
};

exports.processOrder = async (orderId, action) => {
  if (action === 'approve') {
    // 1. Check if the order is valid and pending
    // 2. Check total inventory in batches for this product_id at the warehouse_location_id
    //    SELECT SUM(quantity) FROM batches WHERE product_id = $1 AND current_location_id = $2 AND status = 'stored'
    
    // 3. If sum >= requested_quantity:
    //    - Update order status to 'approved'
    //    - Create a new shipment (distributor flies!)
    //    - Update batch quantities or status
    //    - Log inventory change
    
    // 4. If sum < requested_quantity:
    //    - Throw an error or auto-reject "Insufficient inventory"
    
    return {
      id: orderId,
      status: 'approved',
      message: 'Inventory checked and shipment created.'
    };
  } else if (action === 'reject') {
    // - Update order status to 'unavailable'
    return {
      id: orderId,
      status: 'unavailable'
    };
  } else {
    throw new Error('Invalid action');
  }
};
