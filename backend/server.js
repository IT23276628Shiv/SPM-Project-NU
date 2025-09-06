// backend/server.js
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import categoriesRouter from './routes/category.js';
import messageRoutes from './routes/message.js'; // Add message routes

dotenv.config();

const app = express();

// CORS configuration
app.use(cors({
  origin: ['http://localhost:5000', 'http://localhost:8081', 'http://192.168.8.156:5000', 'http://192.168.1.230:5000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
  credentials: true,
}));

// Middleware
app.use(express.json({ limit: '10mb' })); // Increased limit for image uploads
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(morgan('dev'));

// Health check route
app.get('/', (_req, res) => res.json({ ok: true, service: 'olx-backend' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoriesRouter);
app.use('/api/messages', messageRoutes); // Add message routes

// 404 handler (catch-all for unmatched routes)
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Error handling middleware
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const { MONGO_URI = 'mongodb+srv://niranjansivarajah35:96q5uUO6ErnCXj1f@clustermobile.uuoyibh.mongodb.net/mobileSystem', PORT = 5000 } = process.env;

mongoose.connect(MONGO_URI, { dbName: 'mobileSystem' })
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
  })
  .catch((err) => console.error('Mongo error:', err.message));