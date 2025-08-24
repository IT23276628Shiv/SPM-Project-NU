import { Router } from 'express';
import jwt from 'jsonwebtoken';
import Favorite from '../models/favorite.js';

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

// Create a favorite (protected)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ error: 'Missing productId' });

    const favorite = await Favorite.create({ userId: req.userId, productId });
    res.status(201).json({ favorite });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get all favorites for a user (protected)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const favorites = await Favorite.find({ userId: req.userId }).populate('productId', 'title');
    res.json({ favorites });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete a favorite (protected)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const favorite = await Favorite.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!favorite) return res.status(404).json({ error: 'Favorite not found or unauthorized' });
    res.json({ message: 'Favorite deleted' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;