import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import User from '../models/User.js';
import pino from 'pino';
const logger = pino(); // For logging

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again after 15 minutes'
});

router.post('/register', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    if (!email || !username || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) {
      return res.status(409).json({ error: 'Email or username already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, username, passwordHash });

    const token = jwt.sign({ sub: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    logger.info(`New user registered: ${user.email}`);
    res.json({ token, user: { id: user._id, email: user.email, username: user.username } });
  } catch (e) {
    logger.error(`Registration error for ${req.body.email}: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      logger.warn(`Login failed: Unknown email ${email}`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.isLocked()) {
      logger.warn(`Login attempt on locked account: ${email}`);
      return res.status(429).json({ error: 'Account is locked, try again later' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await user.incrementLoginAttempts();
      logger.warn(`Invalid password attempt for ${email}, attempt #${user.loginAttempts}`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.isVerified) {
      logger.warn(`Unverified login attempt for ${email}`);
      return res.status(403).json({ error: 'Account not verified' });
    }

    user.loginAttempts = 0;
    user.lastLoginDate = new Date();
    await user.save();
    logger.info(`Successful login for ${email}`);

    const token = jwt.sign({ sub: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, email: user.email, username: user.username } });
  } catch (e) {
    logger.error(`Login error for ${req.body.email}: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

export default router;