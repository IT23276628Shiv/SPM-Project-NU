
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import Product from '../models/Product.js';

const router = Router();

// Middleware to verify JWT token
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.sub;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Create a product (protected)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, categoryId, description, condition, price, isForSwap, swapPreferences, imagesUrls, address } = req.body;
    if (!title || !categoryId || !condition) return res.status(400).json({ error: 'Missing required fields' });

    const product = await Product.create({
      ownerId: req.userId,
      categoryId,
      title,
      description,
      condition,
      price,
      isForSwap,
      swapPreferences,
      imagesUrls,
      address,
    });
    res.status(201).json({ product });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get all products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().populate('ownerId', 'username').populate('categoryId', 'name');
    res.json({ products });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get a single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('ownerId', 'username').populate('categoryId', 'name');
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ product });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update a product (protected, owner only)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { title, categoryId, description, condition, price, isForSwap, swapPreferences, imagesUrls, address, status } = req.body;
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.userId },
      { title, categoryId, description, condition, price, isForSwap, swapPreferences, imagesUrls, address, status },
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ error: 'Product not found or unauthorized' });
    res.json({ product });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete a product (protected, owner only)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({ _id: req.params.id, ownerId: req.userId });
    if (!product) return res.status(404).json({ error: 'Product not found or unauthorized' });
    res.json({ message: 'Product deleted' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
