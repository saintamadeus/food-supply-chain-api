// src/modules/batches/batches.controller.js
const batchesService = require('./batches.service');

const createBatch = async (req, res, next) => {
  try {
    const { productId, quantity, unit, currentLocationId, productionDate, expiryDate } = req.body;
    if (!productId || !quantity || !unit) {
      return res.status(400).json({ message: 'productId, quantity, and unit are required' });
    }
    const allowedUnits = ['kg', 'litres', 'units'];
    if (!allowedUnits.includes(unit)) {
      return res.status(400).json({ message: `unit must be one of: ${allowedUnits.join(', ')}` });
    }
    const batch = await batchesService.createBatch({
      productId,
      supplierId: req.user.id,
      quantity,
      unit,
      currentLocationId,
      productionDate,
      expiryDate,
      performedBy: req.user.id,
    });
    res.status(201).json({ message: 'Batch created', batch });
  } catch (err) {
    next(err);
  }
};

const getAllBatches = async (req, res, next) => {
  try {
    const batches = await batchesService.getAllBatches();
    res.status(200).json({ batches });
  } catch (err) {
    next(err);
  }
};

const getBatchById = async (req, res, next) => {
  try {
    const batch = await batchesService.getBatchById(req.params.id);
    res.status(200).json({ batch });
  } catch (err) {
    next(err);
  }
};

const getMyBatches = async (req, res, next) => {
  try {
    const batches = await batchesService.getMyBatches(req.user.id, req.user.role);
    res.status(200).json({ batches });
  } catch (err) {
    next(err);
  }
};

const updateBatchStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ message: 'status is required' });
    }
    const batch = await batchesService.updateBatchStatus(
      req.params.id,
      status,
      req.user.id,
      req.user.role
    );
    res.status(200).json({ message: 'Batch status updated', batch });
  } catch (err) {
    next(err);
  }
};

const getBatchTrail = async (req, res, next) => {
  try {
    const trail = await batchesService.getBatchTrail(req.params.id, req.user);
    res.status(200).json({ trail });
  } catch (err) {
    next(err);
  }
};


module.exports = { createBatch, getAllBatches, getBatchById, getMyBatches, updateBatchStatus, getBatchTrail };