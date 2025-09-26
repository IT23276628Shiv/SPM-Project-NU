// backend/socket/socketHandler.js (Updated with notification support and authentication fix)
import { Server } from 'socket.io';
import admin from '../config/firebase.js';
import Message from '../models/message.js';
import Conversation from '../models/Conversation.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';

const connectedUsers = new Map(); // userId -> socketId (MongoDB ObjectId)
const userSockets = new Map(); // socketId -> userId (MongoDB ObjectId)

export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: ['http://localhost:5000', 'http://localhost:8081', 'http://192.168.8.156:5000', 'http://192.168.8.102:5000','http://192.168.8.101:5000', 'http://192.168.1.230:5000', 'http://172.20.10.14:5000', 'https://172.16.20.210:5000', 'https://chatapp-phi.vercel.app', 'https://chatapp-phi-git-main-ankitkumarverma.vercel.app'],
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    upgradeTimeout: 10000,
    pingTimeout: 60000,
    pingInterval: 25000
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error: Missing token'));
      }

      const decodedToken = await admin.auth().verifyIdToken(token);
      const userDoc = await User.findOne({ firebaseUid: decodedToken.uid });
      if (!userDoc) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.userId = userDoc._id; // Store MongoDB ObjectId
      next();
    } catch (error) {
      console.error('Socket authentication error:', error.message);
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 User connected: ${socket.id}`);

    // Handle user connection with authenticated userId
    socket.on('userConnect', () => {
      try {
        const userId = socket.userId; // Use authenticated MongoDB ObjectId
        if (!userId) {
          socket.emit('error', { message: 'userId is required for connection' });
          return;
        }

        connectedUsers.set(userId.toString(), socket.id);
        userSockets.set(socket.id, userId.toString());
        
        // Broadcast user online status
        socket.broadcast.emit('userOnline', { userId: userId.toString(), isOnline: true });
        
        // Send any pending notifications
        sendPendingNotifications(socket, userId);
        
        console.log(`👤 User ${userId} connected with socket ${socket.id}`);
      } catch (error) {
        console.error('Error in userConnect:', error);
        socket.emit('error', { message: 'Failed to connect user' });
      }
    });

    // Handle joining conversation room
    socket.on('joinConversation', (conversationId) => {
      try {
        if (!conversationId) {
          socket.emit('error', { message: 'conversationId is required' });
          return;
        }

        socket.join(conversationId);
        console.log(`💬 Socket ${socket.id} joined conversation ${conversationId}`);
      } catch (error) {
        console.error('Error joining conversation:', error);
        socket.emit('error', { message: 'Failed to join conversation' });
      }
    });

    // Handle leaving conversation room
    socket.on('leaveConversation', (conversationId) => {
      try {
        if (!conversationId) return;
        
        socket.leave(conversationId);
        console.log(`🚪 Socket ${socket.id} left conversation ${conversationId}`);
      } catch (error) {
        console.error('Error leaving conversation:', error);
      }
    });

    // Handle new message
    socket.on('sendMessage', async (data) => {
      try {
        const { conversationId, message } = data;
        
        if (!conversationId || !message) {
          socket.emit('messageError', { error: 'Missing required data' });
          return;
        }
        
        // Broadcast message to conversation room (excluding sender)
        socket.to(conversationId).emit('newMessage', message);
        
        // Update message status to delivered for online users
        try {
          const conversation = await Conversation.findById(conversationId)
            .populate('participants');
          
          if (conversation) {
            const senderId = message.senderId._id || message.senderId;
            const otherParticipant = conversation.participants.find(
              p => p._id.toString() !== senderId.toString()
            );
            
            if (otherParticipant && connectedUsers.has(otherParticipant._id.toString())) {
              await Message.findByIdAndUpdate(message._id, { 
                isDelivered: true 
              }, { new: true });
              
              socket.emit('messageDelivered', { messageId: message._id });
              
              const recipientSocketId = connectedUsers.get(otherParticipant._id.toString());
              if (recipientSocketId) {
                io.to(recipientSocketId).emit('newNotification', {
                  type: 'new_message',
                  conversationId,
                  message: message.content || 'New message',
                  timestamp: new Date()
                });
              }
            }
          }
        } catch (dbError) {
          console.error('Database error in sendMessage:', dbError);
        }
        
      } catch (error) {
        console.error('Error handling message:', error);
        socket.emit('messageError', { error: 'Failed to send message' });
      }
    });

    // Handle typing indicator
    socket.on('typing', (data) => {
      try {
        const { conversationId, userId, isTyping } = data;
        
        if (!conversationId || !userId) return;
        
        socket.to(conversationId).emit('userTyping', { userId, isTyping });
      } catch (error) {
        console.error('Error handling typing:', error);
      }
    });

    // Handle message read status
    socket.on('messageRead', async (data) => {
      try {
        const { conversationId, messageIds, userId } = data;
        
        if (!conversationId || !messageIds || !userId) {
          socket.emit('error', { message: 'Missing required data for read status' });
          return;
        }
        
        await Message.updateMany(
          { 
            _id: { $in: messageIds }, 
            receiverId: userId 
          },
          { isRead: true }
        );
        
        socket.to(conversationId).emit('messageRead', { messageIds, readBy: userId });
        
      } catch (error) {
        console.error('Error updating read status:', error);
        socket.emit('error', { message: 'Failed to update read status' });
      }
    });

    // Handle message deletion
    socket.on('messageDeleted', (data) => {
      try {
        const { messageId, conversationId } = data;
        
        if (!messageId || !conversationId) return;
        
        socket.to(conversationId).emit('messageDeleted', { messageId });
      } catch (error) {
        console.error('Error handling message deletion:', error);
      }
    });

    // Handle notification events
    socket.on('markNotificationRead', async (data) => {
      try {
        const { notificationId } = data;
        const userId = userSockets.get(socket.id);
        
        if (notificationId && userId) {
          await Notification.findOneAndUpdate(
            { _id: notificationId, recipientId: userId },
            { isRead: true, readAt: new Date() }
          );
          
          const unreadCount = await Notification.getUnreadCount(userId);
          socket.emit('unreadCountUpdate', { count: unreadCount });
        }
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    });

    // Handle requesting unread count
    socket.on('getUnreadCount', async () => {
      try {
        const userId = userSockets.get(socket.id);
        if (userId) {
          const unreadCount = await Notification.getUnreadCount(userId);
          socket.emit('unreadCountUpdate', { count: unreadCount });
        }
      } catch (error) {
        console.error('Error getting unread count:', error);
      }
    });

    // Handle voice/video call requests
    socket.on('callUser', (data) => {
      try {
        const { conversationId, callType, callerId, receiverId } = data;
        
        if (!conversationId || !callType || !callerId || !receiverId) {
          socket.emit('error', { message: 'Missing call data' });
          return;
        }
        
        const receiverSocketId = connectedUsers.get(receiverId.toString());
        
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('incomingCall', {
            callerId,
            callType,
            conversationId
          });
          
          setTimeout(() => {
            if (receiverSocketId) {
              io.to(receiverSocketId).emit('newNotification', {
                type: 'call_missed',
                callerId,
                message: 'Missed call',
                timestamp: new Date()
              });
            }
          }, 30000); // 30 seconds
        } else {
          socket.emit('callError', { error: 'User is offline' });
        }
      } catch (error) {
        console.error('Error handling call:', error);
        socket.emit('callError', { error: 'Failed to initiate call' });
      }
    });

    // Handle call response
    socket.on('callResponse', (data) => {
      try {
        const { conversationId, callerId, accepted } = data;
        
        if (!conversationId || !callerId) return;
        
        const callerSocketId = connectedUsers.get(callerId.toString());
        
        if (callerSocketId) {
          io.to(callerSocketId).emit('callResponse', { accepted, conversationId });
        }
      } catch (error) {
        console.error('Error handling call response:', error);
      }
    });

    // Handle call end
    socket.on('endCall', (data) => {
      try {
        const { conversationId, otherUserId } = data;
        
        if (!conversationId || !otherUserId) return;
        
        const otherSocketId = connectedUsers.get(otherUserId.toString());
        
        if (otherSocketId) {
          io.to(otherSocketId).emit('callEnded', { conversationId });
        }
      } catch (error) {
        console.error('Error handling call end:', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      try {
        const userId = userSockets.get(socket.id);
        
        if (userId) {
          connectedUsers.delete(userId);
          userSockets.delete(socket.id);
          
          socket.broadcast.emit('userOnline', { userId, isOnline: false });
          
          console.log(`🔌❌ User ${userId} disconnected (${reason})`);
        }
        
        console.log(`Socket disconnected: ${socket.id} (${reason})`);
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
    });

    // Handle socket errors
    socket.on('error', (error) => {
      console.error('Socket error:', {
        socketId: socket.id,
        error: error.message,
        stack: error.stack
      });
    });

    // Connection timeout handling
    socket.on('connect_timeout', () => {
      console.log('Socket connection timeout:', socket.id);
    });

    // Ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong');
    });
  });

  // IO-level error handling
  io.on('error', (error) => {
    console.error('Socket.IO server error:', error);
  });

  return io;
};

// Helper function to send pending notifications to newly connected user
const sendPendingNotifications = async (socket, userId) => {
  try {
    const notifications = await Notification.find({
      recipientId: userId, // Use MongoDB ObjectId
      isRead: false,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    })
    .populate('senderId', 'username profilePictureUrl')
    .populate('productId', 'title imagesUrls')
    .sort({ createdAt: -1 })
    .limit(10);

    if (notifications.length > 0) {
      socket.emit('pendingNotifications', {
        notifications,
        count: notifications.length
      });
    }

    const unreadCount = await Notification.getUnreadCount(userId);
    socket.emit('unreadCountUpdate', { count: unreadCount });
    
  } catch (error) {
    console.error('Error sending pending notifications:', error);
  }
};

// Helper function to get online users
export const getOnlineUsers = () => {
  return Array.from(connectedUsers.keys());
};

// Helper function to check if user is online
export const isUserOnline = (userId) => {
  return connectedUsers.has(userId);
};

// Helper function to emit to specific user
export const emitToUser = (io, userId, event, data) => {
  try {
    const socketId = connectedUsers.get(userId.toString());
    if (socketId) {
      io.to(socketId).emit(event, data);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error emitting to user:', error);
    return false;
  }
};

// Helper function to broadcast notification to user
export const emitNotificationToUser = (io, userId, notification) => {
  try {
    const socketId = connectedUsers.get(userId.toString());
    if (socketId) {
      io.to(socketId).emit('newNotification', {
        id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        timestamp: notification.createdAt,
        isRead: false
      });
      
      Notification.getUnreadCount(userId)
        .then(count => {
          io.to(socketId).emit('unreadCountUpdate', { count });
        })
        .catch(error => {
          console.error('Error getting unread count:', error);
        });
      
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error emitting notification to user:', error);
    return false;
  }
};

// Helper function to get connection stats
export const getConnectionStats = () => {
  return {
    connectedUsers: connectedUsers.size,
    totalSockets: userSockets.size,
    onlineUsers: Array.from(connectedUsers.keys())
  };
};