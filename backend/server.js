
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { Server } from "socket.io";
import { createServer } from "http";
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import messageRoutes, { initMessageSocket } from "./routes/messages.js";
import userRoutes from './routes/auth.js';

dotenv.config();

const app = express();
const httpServer = createServer(app); // HTTP + WebSocket

// Socket.IO setup
const io = new Server(httpServer, {
  cors: {
    origin: ["http://192.168.8.156:5000", "http://192.168.8.156:8083"], // frontend apps ,"172.16.21.30:3000","172.16.21.30:8082"
    methods: ["GET", "POST"],
    credentials: true,
  },
});
initMessageSocket(io); // attach socket handlers

// CORS configuration
app.use(cors({
  origin: ['http://192.168.8.156:5000', ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
  credentials: true,
}));

// Middleware
app.use(express.json());
app.use(morgan('dev'));

// Health check route
app.get('/', (_req, res) => res.json({ ok: true, service: 'olx-backend' }));



// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use("/api/messages", messageRoutes);
app.use('/api/users', userRoutes);




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

mongoose
  .connect(MONGO_URI, { dbName: "mobileSystem" })
  .then(() => {
    console.log("✅ MongoDB connected");
    httpServer.listen(PORT, () => console.log(`🚀 API + WS on 192.168.8.156:${PORT}`));
  })
  .catch((err) => console.error("❌ Mongo error:", err.message));
