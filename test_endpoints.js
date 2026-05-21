require('dotenv').config();
const db = require('./src/config/db');
const jwt = require('jsonwebtoken');

const API_URL = 'http://localhost:5000/api';

function createToken(userId, role) {
  const secret = process.env.JWT_ACCESS_SECRET;
  return jwt.sign({ userId, role }, secret, { expiresIn: '1h' });
}

async function fetchAPI(endpoint, method, token, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${API_URL}${endpoint}`, options);
  let data;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return { status: res.status, data };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log('--- STARTING COMPREHENSIVE TESTS ---');
  try {
    // ============================================
    // 0. Setup DB
    // ============================================
    console.log('0. Setting up DB (Truncating tables)...');
    await db.query(`TRUNCATE TABLE 
      orders, transaction_items, transactions, shipment_batches, shipments, 
      inventory_logs, batches, products, locations, refresh_tokens, users 
      RESTART IDENTITY CASCADE`);

    // Create users directly in DB for tokens
    const roles = ['admin', 'producer', 'supplier', 'warehouse_manager', 'distributor', 'retailer'];
    const users = {};
    const tokens = {};

    for (const role of roles) {
      const res = await db.query(
        `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, 'hash', $3) RETURNING id`,
        [`${role} User`, `${role}@test.com`, role]
      );
      users[role] = res.rows[0].id;
      tokens[role] = createToken(users[role], role);
    }
    
    // ============================================
    // 1. Locations
    // ============================================
    console.log('1. Testing Locations...');
    let res = await fetchAPI('/locations', 'POST', tokens.producer, {
      name: 'Farm A', type: 'farm', address: '123 Farm Rd', city: 'Testville', state: 'TS'
    });
    assert(res.status === 201, `Create location failed: ${JSON.stringify(res.data)}`);
    const farmId = res.data.location.id;

    res = await fetchAPI('/locations', 'POST', tokens.warehouse_manager, {
      name: 'Central Warehouse', type: 'warehouse', address: '456 Storage Ave', city: 'Testville', state: 'TS'
    });
    assert(res.status === 201, 'Create warehouse failed');
    const warehouseId = res.data.location.id;

    res = await fetchAPI('/locations', 'POST', tokens.retailer, {
      name: 'Retail Shop A', type: 'retailer_shop', address: '789 Main St', city: 'Testville', state: 'TS'
    });
    const retailShopId = res.data.location.id;

    res = await fetchAPI('/locations', 'GET', tokens.admin);
    assert(res.status === 200 && res.data.locations.length === 3, 'Get all locations failed');

    // ============================================
    // 2. Products
    // ============================================
    console.log('2. Testing Products...');
    res = await fetchAPI('/products', 'POST', tokens.producer, {
      name: 'Organic Apples', description: 'Freshly picked', category: 'Fruits'
    });
    assert(res.status === 201, 'Create product failed');
    const productId = res.data.product.id;

    res = await fetchAPI('/products', 'GET', tokens.admin);
    assert(res.status === 200 && res.data.products.length === 1, 'Get products failed');

    // ============================================
    // 3. Batches
    // ============================================
    console.log('3. Testing Batches...');
    res = await fetchAPI('/batches', 'POST', tokens.producer, {
      productId, quantity: 500, unit: 'kg', currentLocationId: farmId
    });
    assert(res.status === 201, 'Create batch failed');
    const batchId = res.data.batch.id;

    res = await fetchAPI(`/batches/${batchId}/mark-ready`, 'POST', tokens.producer);
    assert(res.status === 200 && res.data.batch.status === 'ready', 'Mark ready failed');

    // ============================================
    // 4. Orders
    // ============================================
    console.log('4. Testing Orders...');
    res = await fetchAPI('/orders', 'POST', tokens.retailer, {
      product_id: productId, quantity: 100, warehouse_location_id: warehouseId
    });
    assert(res.status === 201, `Create order failed: ${JSON.stringify(res.data)}`);
    const orderId = res.data.data.id;

    res = await fetchAPI('/orders/pending', 'GET', tokens.warehouse_manager);
    assert(res.status === 200 && res.data.data.length === 1, 'Get pending orders failed');

    res = await fetchAPI(`/orders/${orderId}/process`, 'POST', tokens.warehouse_manager, { action: 'approve' });
    assert(res.status === 200 && res.data.data.status === 'approved', 'Process order failed');

    // ============================================
    // 5. Shipments
    // ============================================
    console.log('5. Testing Shipments...');
    res = await fetchAPI('/shipments', 'POST', tokens.supplier, {
      destination_location_id: retailShopId,
      source_location_id: warehouseId,
      distributor_id: users.distributor,
      batches: [{ batch_id: batchId, quantity_moved: 100, notes: 'First shipment' }]
    });
    assert(res.status === 201, `Create shipment failed: ${JSON.stringify(res.data)}`);
    const shipmentId = res.data.shipment.id;

    res = await fetchAPI(`/shipments/${shipmentId}/dispatch`, 'POST', tokens.distributor);
    assert(res.status === 200 && res.data.shipment.status === 'in_transit', 'Dispatch shipment failed');

    res = await fetchAPI(`/shipments/${shipmentId}/deliver`, 'POST', tokens.retailer);
    assert(res.status === 200 && res.data.shipment.status === 'delivered', `Deliver shipment failed: ${JSON.stringify(res.data)}`);

    // ============================================
    // 6. Transactions
    // ============================================
    console.log('6. Testing Transactions...');
    res = await fetchAPI('/transactions', 'POST', tokens.retailer, {
      location_id: retailShopId,
      total_amount: 250.00,
      items: [{ batch_id: batchId, quantity_sold: 50, price_per_unit: 5.00 }]
    });
    assert(res.status === 201, `Create transaction failed: ${JSON.stringify(res.data)}`);
    const transactionId = res.data.transaction.id;

    res = await fetchAPI('/transactions', 'GET', tokens.admin);
    assert(res.status === 200 && res.data.length === 1, 'Get transactions failed');

    console.log('✅ ALL INTEGRATION TESTS PASSED');
  } catch (err) {
    console.error('❌ TEST FAILED:', err.message);
  } finally {
    process.exit();
  }
}

runTests();
