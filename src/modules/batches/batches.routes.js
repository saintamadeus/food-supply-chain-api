// src/modules/batches/batches.routes.js
const express = require('express');
const router = express.Router();

const authenticate     = require('../../middleware/authenticate');
const authorize        = require('../../middleware/authorize');
const batchesCtrl      = require('./batches.controller');
const batchTransitions = require('./batches.transitions');

router.use(authenticate);

router.post('/', authorize('producer', 'admin'), batchesCtrl.createBatch);
router.get('/', authorize('admin'), batchesCtrl.getAllBatches);
router.get('/mine', authorize('producer', 'supplier', 'warehouse_manager', 'distributor', 'retailer'), batchesCtrl.getMyBatches);
router.get('/:id', authorize('admin', 'producer', 'supplier', 'warehouse_manager', 'distributor', 'retailer'), batchesCtrl.getBatchById);

router.post('/:id/mark-ready', authorize('producer'), batchTransitions.markReady);
router.post('/:id/mark-stored', authorize('warehouse_manager', 'retailer', 'supplier', 'admin'), batchTransitions.markStored);
router.post('/:id/mark-expired', authorize('admin', 'warehouse_manager'), batchTransitions.markExpired);
router.get('/:id/trail', authorize('admin', 'producer', 'supplier', 'warehouse_manager', 'distributor', 'retailer'), batchesCtrl.getBatchTrail);

module.exports = router;