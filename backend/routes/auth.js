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

// -------- signup -------- //
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, firebaseUid } = req.body;

    if (!username || !email || !password || !firebaseUid) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = new User({ username, email, passwordHash, firebaseUid });
    await newUser.save();

    res.status(201).json({
      message: 'User registered',
      userId: newUser._id,
      infoCompleted: newUser.infoCompleted || false
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});


// Backend route
router.put('/:firebaseUid/updateProfile', async (req, res) => {
  try {
    const { firebaseUid } = req.params; // this is the Firebase UID
    const { phoneNumber, bio, address } = req.body;

    const updatedUser = await User.findOneAndUpdate(
      { firebaseUid }, // search by firebaseUid, not _id
      { phoneNumber, bio, address, infoCompleted: true },
      { new: true }
    );

    if (!updatedUser)
      return res.status(404).json({ message: 'User not found' });

    res.status(200).json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Server error' });
  }
});






export default router;