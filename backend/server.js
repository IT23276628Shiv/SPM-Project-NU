// backend/server.js (Updated with Socket.IO and Notifications)
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import cron from 'node-cron';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import categoriesRouter from './routes/category.js';
import messageRoutes from './routes/message.js';
import notificationRoutes from './routes/notifications.js';
import { initializeSocket } from './socket/socketHandler.js';
import { triggerMessageNotification, trackProductView } from './middleware/notificationTrigger.js';
import { sendSummaryNotifications, cleanupExpiredNotifications, cleanupInvalidTokens } from './services/fcmService.js';

dotenv.config();

const app = express();
const server = createServer(app);

// Initialize Socket.IO
const io = initializeSocket(server);

// CORS configuration
app.use(cors({
  origin: ['http://localhost:5000', 'http://localhost:8081', 'http://192.168.8.156:5000','http://192.168.8.101:5000', 'http://192.168.1.230:5000','http://172.20.10.14:5000', 'https://172.16.20.210:5000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],  
  exposedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
  credentials: true,
}));

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(morgan('dev'));

// Make io available to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Health check route
app.get('/', (_req, res) => res.json({ 
  ok: true, 
  service: 'revomart-backend',
  features: ['messaging', 'notifications', 'products', 'auth'],
  timestamp: new Date().toISOString()
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', trackProductView, productRoutes); // Add view tracking middleware
app.use('/api/categories', categoriesRouter);
app.use('/api/messages', triggerMessageNotification, messageRoutes); // Add notification trigger
app.use('/api/notifications', notificationRoutes); // New notification routes

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Error handling middleware
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const { 
  MONGO_URI = 'mongodb+srv://niranjansivarajah35:96q5uUO6ErnCXj1f@clustermobile.uuoyibh.mongodb.net/mobileSystem', 
  PORT = 5000 
} = process.env;

mongoose.connect(MONGO_URI, { dbName: 'mobileSystem' })
  .then(() => {
    console.log('MongoDB connected');
    
    // Start server
    server.listen(PORT, () => {
      console.log(`🚀 API server running on http://localhost:${PORT}`);
      console.log(`🔗 Socket.IO server running on http://localhost:${PORT}`);
      console.log('📱 Features enabled: Auth, Products, Messages, Notifications');
      console.log('⚡ Real-time notifications active');
    });

    // Setup cron jobs for background tasks
    setupCronJobs();
  })
  .catch((err) => console.error('MongoDB connection error:', err.message));

// Setup background cron jobs
function setupCronJobs() {
  // Send daily summary notifications at 8 AM
  cron.schedule('0 8 * * *', async () => {
    console.log('🕐 Running daily summary notifications job...');
    try {
      await sendSummaryNotifications();
      console.log('✅ Daily summary notifications completed');
    } catch (error) {
      console.error('❌ Error in daily summary job:', error);
    }
  }, {
    timezone: "Asia/Colombo" // Adjust to your timezone
  });

  // Clean up expired notifications every day at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('🧹 Cleaning up expired notifications...');
    try {
      const cleanedCount = await cleanupExpiredNotifications();
      console.log(`✅ Cleaned up ${cleanedCount} expired notifications`);
    } catch (error) {
      console.error('❌ Error cleaning expired notifications:', error);
    }
  }, {
    timezone: "Asia/Colombo"
  });

  // Clean up invalid FCM tokens weekly on Sunday at 2 AM
  cron.schedule('0 2 * * 0', async () => {
    console.log('🧹 Cleaning up invalid FCM tokens...');
    try {
      const cleanedCount = await cleanupInvalidTokens();
      console.log(`✅ Cleaned up ${cleanedCount} invalid FCM tokens`);
    } catch (error) {
      console.error('❌ Error cleaning invalid tokens:', error);
    }
  }, {
    timezone: "Asia/Colombo"
  });

  console.log('⏰ Background cron jobs scheduled:');
  console.log('   📊 Daily summaries: 8:00 AM daily');
  console.log('   🗑️  Cleanup expired: 12:00 AM daily');
  console.log('   🧹 Token cleanup: 2:00 AM Sundays');
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server gracefully...');
  
  try {
    // Close server
    server.close(() => {
      console.log('🔌 HTTP server closed');
    });
    
    // Close database connection
    await mongoose.connection.close();
    console.log('📦 Database connection closed');
    
    console.log('✅ Server shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, shutting down...');
  await mongoose.connection.close();
  process.exit(0);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('💥 Unhandled Promise Rejection:', err);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  process.exit(1);
});