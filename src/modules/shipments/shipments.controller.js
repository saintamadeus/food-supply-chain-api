// modules/shipments/shipments.controller.js
const shipmentService = require('./shipments.service');

const createShipment = async (req, res, next) => {
  try {
    const { distributor_id, source_location_id, destination_location_id, departure_date, batches } = req.body;

    if (!source_location_id || !destination_location_id || !batches || !Array.isArray(batches) || batches.length === 0) {
      return res.status(400).json({ error: 'source_location_id, destination_location_id, and at least one batch are required' });
    }

    const shipment = await shipmentService.createShipment({
      created_by: req.user.id,
      distributor_id: distributor_id || null,
      source_location_id,
      destination_location_id,
      departure_date,
      batches,
    });

    res.status(201).json({ message: 'Shipment created', shipment });
  } catch (err) {
    next(err);
  }
};

const getShipments = async (req, res, next) => {
  try {
    const shipments = await shipmentService.getShipments(req.user);
    res.json(shipments);
  } catch (err) {
    next(err);
  }
};

const getShipmentById = async (req, res, next) => {
  try {
    const shipment = await shipmentService.getShipmentById(req.params.id, req.user);
    if (!shipment) return res.status(404).json({ error: 'Shipment not found' });
    res.json(shipment);
  } catch (err) {
    next(err);
  }
};

const dispatchShipment = async (req, res, next) => {
  try {
    const shipment = await shipmentService.dispatchShipment(req.params.id, req.user);
    res.status(200).json({ message: 'Shipment dispatched', shipment });
  } catch (err) {
    next(err);
  }
};

const deliverShipment = async (req, res, next) => {
  try {
    const shipment = await shipmentService.deliverShipment(req.params.id, req.user);
    res.status(200).json({ message: 'Shipment delivered', shipment });
  } catch (err) {
    next(err);
  }
};

const cancelShipment = async (req, res, next) => {
  try {
    const shipment = await shipmentService.cancelShipment(req.params.id, req.user);
    res.status(200).json({ message: 'Shipment cancelled', shipment });
  } catch (err) {
    next(err);
  }
};

module.exports = { createShipment, getShipments, getShipmentById, dispatchShipment, deliverShipment, cancelShipment };