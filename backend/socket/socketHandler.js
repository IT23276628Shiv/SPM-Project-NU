// backend/socket/socketHandler.js (Updated with better error handling)
import { Server } from 'socket.io';
import Message from '../models/message.js';
import Conversation from '../models/Conversation.js';

const connectedUsers = new Map(); // userId -> socketId
const userSockets = new Map(); // socketId -> userId

export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: ['http://localhost:5000', 'http://localhost:8081', 'http://192.168.8.156:5000', 'http://192.168.1.230:5000','http://172.20.10.14:5000', 'https:172.16.20.210:5000', 'https://chatapp-phi.vercel.app', 'https://chatapp-phi-git-main-ankitkumarverma.vercel.app'],
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    upgradeTimeout: 10000,
    pingTimeout: 60000,
    pingInterval: 25000
  });

  io.on('connection', (socket) => {
    console.log(`🔌 User connected: ${socket.id}`);

    // Handle user connection with error handling
    socket.on('userConnect', (userId) => {
      try {
        if (!userId) {
          socket.emit('error', { message: 'userId is required for connection' });
          return;
        }

        connectedUsers.set(userId, socket.id);
        userSockets.set(socket.id, userId);
        
        // Broadcast user online status
        socket.broadcast.emit('userOnline', { userId, isOnline: true });
        
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
            // Find the other participant
            const senderId = message.senderId._id || message.senderId;
            const otherParticipant = conversation.participants.find(
              p => p._id.toString() !== senderId.toString()
            );
            
            if (otherParticipant && connectedUsers.has(otherParticipant._id.toString())) {
              // Mark as delivered
              await Message.findByIdAndUpdate(message._id, { 
                isDelivered: true 
              }, { new: true });
              
              // Emit delivery confirmation to sender
              socket.emit('messageDelivered', { messageId: message._id });
            }
          }
        } catch (dbError) {
          console.error('Database error in sendMessage:', dbError);
          // Don't fail the entire operation for delivery status
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
        
        // Update messages as read
        await Message.updateMany(
          { 
            _id: { $in: messageIds }, 
            receiverId: userId 
          },
          { isRead: true }
        );
        
        // Broadcast read status to sender
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

    // Handle voice/video call requests
    socket.on('callUser', (data) => {
      try {
        const { conversationId, callType, callerId, receiverId } = data;
        
        if (!conversationId || !callType || !callerId || !receiverId) {
          socket.emit('error', { message: 'Missing call data' });
          return;
        }
        
        const receiverSocketId = connectedUsers.get(receiverId);
        
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('incomingCall', {
            callerId,
            callType,
            conversationId
          });
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
        
        const callerSocketId = connectedUsers.get(callerId);
        
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
        
        const otherSocketId = connectedUsers.get(otherUserId);
        
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
          
          // Broadcast user offline status
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
    const socketId = connectedUsers.get(userId);
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

// Helper function to get connection stats
export const getConnectionStats = () => {
  return {
    connectedUsers: connectedUsers.size,
    totalSockets: userSockets.size,
    onlineUsers: Array.from(connectedUsers.keys())
  };
};