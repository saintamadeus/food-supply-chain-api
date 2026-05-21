// src/modules/products/products.controller.js
const productsService = require('./products.service');

const createProduct = async (req, res, next) => {
  try {
    const { name, description, category } = req.body;
    if (!name || !category) {
      return res.status(400).json({ message: 'name and category are required' });
    }
    const product = await productsService.createProduct({
      producerId: req.user.userId,
      name, description, category,
    });
    res.status(201).json({ message: 'Product created', product });
  } catch (err) {
    next(err);
  }
};

const getAllProducts = async (req, res, next) => {
  try {
    const products = await productsService.getAllProducts();
    res.status(200).json({ products });
  } catch (err) {
    next(err);
  }
};

const getProductById = async (req, res, next) => {
  try {
    const product = await productsService.getProductById(req.params.id);
    res.status(200).json({ product });
  } catch (err) {
    next(err);
  }
};

const getMyProducts = async (req, res, next) => {
  try {
    const products = await productsService.getMyProducts(req.user.userId);
    res.status(200).json({ products });
  } catch (err) {
    next(err);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const product = await productsService.updateProduct(
      req.params.id, req.user.userId, req.user.role, req.body
    );
    res.status(200).json({ message: 'Product updated', product });
  } catch (err) {
    next(err);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    await productsService.deleteProduct(req.params.id, req.user.userId, req.user.role);
    res.status(200).json({ message: 'Product deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { createProduct, getAllProducts, getProductById, getMyProducts, updateProduct, deleteProduct };