require('dotenv').config();
const db = require('./src/config/db');
const jwt = require('jsonwebtoken');

const API_URL = 'http://localhost:5000/api';

function createToken(userId, role) {
  const secret = process.env.JWT_ACCESS_SECRET;
  return jwt.sign({ userId, role }, secret, { expiresIn: '1h' });
}

async function runTests() {
  console.log('--- STARTING TESTS ---');
  try {
    // 1. Clean DB and setup users, locations, products
    console.log('Setting up DB...');
    await db.query('TRUNCATE TABLE shipments, shipment_batches, batches, products, locations, users RESTART IDENTITY CASCADE');
    
    const adminRes = await db.query(`INSERT INTO users (name, email, password_hash, role) VALUES ('Admin', 'admin@test.com', 'hash', 'admin') RETURNING id`);
    const adminId = adminRes.rows[0].id;

    const producerRes = await db.query(`INSERT INTO users (name, email, password_hash, role) VALUES ('Producer', 'prod@test.com', 'hash', 'producer') RETURNING id`);
    const producerId = producerRes.rows[0].id;
    
    const supplierRes = await db.query(`INSERT INTO users (name, email, password_hash, role) VALUES ('Supplier', 'sup@test.com', 'hash', 'supplier') RETURNING id`);
    const supplierId = supplierRes.rows[0].id;

    const locRes = await db.query(`INSERT INTO locations (user_id, name, type) VALUES ($1, 'Farm 1', 'farm') RETURNING id`, [producerId]);
    const locId = locRes.rows[0].id;

    const prodRes = await db.query(`INSERT INTO products (producer_id, name) VALUES ($1, 'Apples') RETURNING id`, [producerId]);
    const productId = prodRes.rows[0].id;

    const adminToken = createToken(adminId, 'admin');
    const producerToken = createToken(producerId, 'producer');
    const supplierToken = createToken(supplierId, 'supplier');

    // 1. Create Batch as Producer
    console.log('1. Testing Create Batch as producer...');
    let res = await fetch(`${API_URL}/batches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${producerToken}` },
      body: JSON.stringify({
        productId,
        quantity: 100,
        unit: 'kg',
        currentLocationId: locId
      })
    });
    let data = await res.json();
    if (!res.ok) throw new Error('Create Batch Failed: ' + JSON.stringify(data));
    const batchId = data.batch.id;
    console.log('✅ 1. Create Batch Passed. Batch ID:', batchId);

    // 2. Mark Ready as Producer
    console.log('2. Testing mark-ready as producer...');
    res = await fetch(`${API_URL}/batches/${batchId}/mark-ready`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${producerToken}` }
    });
    data = await res.json();
    if (res.ok && data.batch.status === 'ready') {
      console.log('✅ 2. Mark-ready passed (status=ready).');
    } else {
      throw new Error('Mark-ready Failed. Response: ' + JSON.stringify(data));
    }

    // 3. Mark Ready Again (expect 422)
    console.log('3. Testing mark-ready again as producer...');
    res = await fetch(`${API_URL}/batches/${batchId}/mark-ready`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${producerToken}` }
    });
    data = await res.json();
    if (res.status === 422) {
      console.log('✅ 3. Mark-ready again rejected properly (422):', data.message);
    } else {
      throw new Error('Mark-ready again should have failed with 422. Got: ' + res.status);
    }

    // 4. Mark Expired as Producer (expect 403)
    console.log('4. Testing mark-expired as producer...');
    res = await fetch(`${API_URL}/batches/${batchId}/mark-expired`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${producerToken}` }
    });
    data = await res.json();
    if (res.status === 403) {
      console.log('✅ 4. Mark-expired as producer rejected properly (403):', data.message);
    } else {
      throw new Error('Mark-expired as producer should have failed with 403. Got: ' + res.status);
    }

    // 5. PATCH /:id/status (expect 404)
    console.log('5. Testing old PATCH route...');
    res = await fetch(`${API_URL}/batches/${batchId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'expired' })
    });
    if (res.status === 404) {
      console.log('✅ 5. Old PATCH route no longer exists (404).');
    } else {
      throw new Error('Old PATCH route should be 404. Got: ' + res.status);
    }

    // 6. Mark Expired as Admin (expect 200)
    console.log('6. Testing mark-expired as admin...');
    res = await fetch(`${API_URL}/batches/${batchId}/mark-expired`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` }
    });
    data = await res.json();
    if (res.ok && data.batch.status === 'expired') {
      console.log('✅ 6. Mark-expired as admin passed (status=expired).');
    } else {
      throw new Error('Mark-expired as admin Failed. Got: ' + res.status);
    }

    console.log('--- ALL TESTS PASSED ---');
  } catch (err) {
    console.error('❌ TEST FAILED:', err.message);
  } finally {
    process.exit();
  }
}

runTests();
