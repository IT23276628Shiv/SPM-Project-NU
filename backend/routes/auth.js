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
    const { username, email, passwordHash } = req.body;
     
    console.log("Hi am in register" ,passwordHash );
    // Check if email exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(passwordHash, salt);

    const newUser = new User({
      username,
      email,
      passwordHash: hashedPassword
    });

    const savedUser = await newUser.save();

    res.status(201).json({ 
      message: "User registered in MongoDB",
      userId: savedUser._id
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
});

// 2️⃣ Update Profile & Add Firebase UID
router.put('/:userId/updateProfile', async (req, res) => {
  try {
    const { userId } = req.params;
    const { phoneNumber, bio, address, firebaseUid } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { phoneNumber, bio, address, firebaseUid },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "Profile updated successfully", user: updatedUser });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
});





export default router;