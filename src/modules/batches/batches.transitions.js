// src/modules/batches/batches.transitions.js
const batchService = require('./batches.service');

const markReady = async (req, res, next) => {
  try {
    const batch = await batchService.updateBatchStatus(req.params.id, 'ready', req.user.id, req.user.role);
    return res.status(200).json({ message: 'Batch marked as ready for pickup', batch });
  } catch (err) {
    next(err);
  }
};

const markStored = async (req, res, next) => {
  try {
    const batch = await batchService.updateBatchStatus(req.params.id, 'stored', req.user.id, req.user.role);
    return res.status(200).json({ message: 'Batch confirmed as stored', batch });
  } catch (err) {
    next(err);
  }
};

const markExpired = async (req, res, next) => {
  try {
    const batch = await batchService.updateBatchStatus(req.params.id, 'expired', req.user.id, req.user.role);
    return res.status(200).json({ message: 'Batch flagged as expired', batch });
  } catch (err) {
    next(err);
  }
};

const getBatchTrail = async (req, res) => {
  try {
    const batch = await batchService.getBatchById(req.params.id);
    return res.status(200).json({
      message: 'Full trail logging will be available after Phase 7 inventory logs are wired',
      batch,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.message });
  }
};

module.exports = { markReady, markStored, markExpired, getBatchTrail };