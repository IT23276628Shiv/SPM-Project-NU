import { Router } from 'express';
import jwt from 'jsonwebtoken';
import Message from '../models/message.js';

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

// Create a message (protected)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { receiverId, productId, content, attachmentUrl } = req.body;
    if (!receiverId || !content) return res.status(400).json({ error: 'Missing required fields' });

    const message = await Message.create({
      senderId: req.userId,
      receiverId,
      productId,
      content,
      attachmentUrl,
    });
    res.status(201).json({ message });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get all messages for a user (protected)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const messages = await Message.find({ $or: [{ senderId: req.userId }, { receiverId: req.userId }] })
      .populate('senderId', 'username')
      .populate('receiverId', 'username')
      .populate('productId', 'title');
    res.json({ messages });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get a single message (protected)
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const message = await Message.findOne({
      _id: req.params.id,
      $or: [{ senderId: req.userId }, { receiverId: req.userId }],
    })
      .populate('senderId', 'username')
      .populate('receiverId', 'username')
      .populate('productId', 'title');
    if (!message) return res.status(404).json({ error: 'Message not found or unauthorized' });
    res.json({ message });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update a message (protected, sender only)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { content, isRead } = req.body;
    const message = await Message.findOneAndUpdate(
      { _id: req.params.id, senderId: req.userId },
      { content, isRead },
      { new: true, runValidators: true }
    );
    if (!message) return res.status(404).json({ error: 'Message not found or unauthorized' });
    res.json({ message });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete a message (protected, sender or receiver only)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const message = await Message.findOneAndDelete({
      _id: req.params.id,
      $or: [{ senderId: req.userId }, { receiverId: req.userId }],
    });
    if (!message) return res.status(404).json({ error: 'Message not found or unauthorized' });
    res.json({ message: 'Message deleted' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;