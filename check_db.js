require('dotenv').config();
const db = require('./src/config/db');

async function run() {
  try {
    const res = await db.query(`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'batches' AND column_name = 'status';
    `);
    console.log('Status column type:', res.rows[0]?.data_type);
    
    // Also check constraints
    const constraints = await db.query(`
      SELECT pg_get_constraintdef(c.oid), conname
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE conrelid = 'batches'::regclass AND contype = 'c';
    `);
    console.log('Constraints:', constraints.rows);

    // Check if enum
    try {
      const enums = await db.query(`SELECT unnest(enum_range(NULL::batch_status))`);
      console.log('ENUM values:', enums.rows);
    } catch (e) {
      console.log('No enum type batch_status found.');
    }

  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}
run();
