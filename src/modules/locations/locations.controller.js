// src/modules/locations/locations.controller.js
const locationsService = require('./locations.service');

const createLocation = async (req, res, next) => {
  try {
    const { name, type, address, city, state } = req.body;
    if (!name || !type || !address || !city || !state) {
      return res.status(400).json({ message: 'name, type, address, city, and state are required' });
    }
    const allowedTypes = ['farm', 'warehouse', 'supplier_facility', 'retailer_shop'];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({ message: `type must be one of: ${allowedTypes.join(', ')}` });
    }
    const location = await locationsService.createLocation({
      userId: req.user.userId,
      name, type, address, city, state,
    });
    res.status(201).json({ message: 'Location created', location });
  } catch (err) {
    next(err);
  }
};

const getAllLocations = async (req, res, next) => {
  try {
    const locations = await locationsService.getAllLocations();
    res.status(200).json({ locations });
  } catch (err) {
    next(err);
  }
};

const getLocationById = async (req, res, next) => {
  try {
    const location = await locationsService.getLocationById(req.params.id);
    res.status(200).json({ location });
  } catch (err) {
    next(err);
  }
};

const getMyLocations = async (req, res, next) => {
  try {
    const locations = await locationsService.getMyLocations(req.user.userId);
    res.status(200).json({ locations });
  } catch (err) {
    next(err);
  }
};

const updateLocation = async (req, res, next) => {
  try {
    const location = await locationsService.updateLocation(
      req.params.id, req.user.userId, req.user.role, req.body
    );
    res.status(200).json({ message: 'Location updated', location });
  } catch (err) {
    next(err);
  }
};

const deleteLocation = async (req, res, next) => {
  try {
    await locationsService.deleteLocation(req.params.id, req.user.userId, req.user.role);
    res.status(200).json({ message: 'Location deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { createLocation, getAllLocations, getLocationById, getMyLocations, updateLocation, deleteLocation };