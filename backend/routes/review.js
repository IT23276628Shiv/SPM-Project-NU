import { Router } from 'express';
import jwt from 'jsonwebtoken';
import Review from '../models/review.js';

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

// Create a review (protected)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { reviewedUserId, transactionId, rating, comment } = req.body;
    if (!reviewedUserId || !transactionId || !rating) return res.status(400).json({ error: 'Missing required fields' });

    const review = await Review.create({
      reviewerId: req.userId,
      reviewedUserId,
      transactionId,
      rating,
      comment,
    });
    res.status(201).json({ review });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get all reviews for a user (public)
router.get('/user/:userId', async (req, res) => {
  try {
    const reviews = await Review.find({ reviewedUserId: req.params.userId })
      .populate('reviewerId', 'username')
      .populate('transactionId', 'productId');
    res.json({ reviews });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get a single review
router.get('/:id', async (req, res) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate('reviewerId', 'username')
      .populate('reviewedUserId', 'username')
      .populate('transactionId', 'productId');
    if (!review) return res.status(404).json({ error: 'Review not found' });
    res.json({ review });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update a review (protected, reviewer only)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const review = await Review.findOneAndUpdate(
      { _id: req.params.id, reviewerId: req.userId },
      { rating, comment },
      { new: true, runValidators: true }
    );
    if (!review) return res.status(404).json({ error: 'Review not found or unauthorized' });
    res.json({ review });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete a review (protected, reviewer only)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const review = await Review.findOneAndDelete({ _id: req.params.id, reviewerId: req.userId });
    if (!review) return res.status(404).json({ error: 'Review not found or unauthorized' });
    res.json({ message: 'Review deleted' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;