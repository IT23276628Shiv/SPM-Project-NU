// backend/socket/socketHandler.js
import { Server } from 'socket.io';
import Message from '../models/message.js';
import Conversation from '../models/Conversation.js';

const connectedUsers = new Map(); // userId -> socketId
const userSockets = new Map(); // socketId -> userId

export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: ['http://localhost:5000', 'http://localhost:8081', 'http://192.168.8.156:5000', 'http://192.168.1.230:5000'],
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Handle user connection
    socket.on('userConnect', (userId) => {
      connectedUsers.set(userId, socket.id);
      userSockets.set(socket.id, userId);
      
      // Broadcast user online status
      socket.broadcast.emit('userOnline', { userId, isOnline: true });
      
      console.log(`User ${userId} connected with socket ${socket.id}`);
    });

    // Handle joining conversation room
    socket.on('joinConversation', (conversationId) => {
      socket.join(conversationId);
      console.log(`Socket ${socket.id} joined conversation ${conversationId}`);
    });

    // Handle leaving conversation room
    socket.on('leaveConversation', (conversationId) => {
      socket.leave(conversationId);
      console.log(`Socket ${socket.id} left conversation ${conversationId}`);
    });

    // Handle new message
    socket.on('sendMessage', async (data) => {
      try {
        const { conversationId, message } = data;
        
        // Broadcast message to conversation room
        socket.to(conversationId).emit('newMessage', message);
        
        // Update message status to delivered for online users
        const conversation = await Conversation.findById(conversationId)
          .populate('participants');
        
        if (conversation) {
          const otherParticipant = conversation.participants.find(
            p => p._id.toString() !== message.senderId._id.toString()
          );
          
          if (otherParticipant && connectedUsers.has(otherParticipant._id.toString())) {
            // Mark as delivered
            await Message.findByIdAndUpdate(message._id, { isDelivered: true });
            
            // Emit delivery confirmation
            socket.emit('messageDelivered', { messageId: message._id });
          }
        }
        
      } catch (error) {
        console.error('Error handling message:', error);
        socket.emit('messageError', { error: 'Failed to send message' });
      }
    });

    // Handle typing indicator
    socket.on('typing', (data) => {
      const { conversationId, userId, isTyping } = data;
      socket.to(conversationId).emit('userTyping', { userId, isTyping });
    });

    // Handle message read status
    socket.on('messageRead', async (data) => {
      try {
        const { conversationId, messageIds, userId } = data;
        
        // Update messages as read
        await Message.updateMany(
          { _id: { $in: messageIds }, receiverId: userId },
          { isRead: true }
        );
        
        // Broadcast read status to sender
        socket.to(conversationId).emit('messageRead', { messageIds, readBy: userId });
        
      } catch (error) {
        console.error('Error updating read status:', error);
      }
    });

    // Handle message deletion
    socket.on('messageDeleted', (data) => {
      const { messageId, conversationId } = data;
      socket.to(conversationId).emit('messageDeleted', { messageId });
    });

    // Handle voice/video call requests
    socket.on('callUser', (data) => {
      const { conversationId, callType, callerId, receiverId } = data;
      const receiverSocketId = connectedUsers.get(receiverId);
      
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('incomingCall', {
          callerId,
          callType,
          conversationId
        });
      }
    });

    // Handle call response
    socket.on('callResponse', (data) => {
      const { conversationId, callerId, accepted } = data;
      const callerSocketId = connectedUsers.get(callerId);
      
      if (callerSocketId) {
        io.to(callerSocketId).emit('callResponse', { accepted, conversationId });
      }
    });

    // Handle call end
    socket.on('endCall', (data) => {
      const { conversationId, otherUserId } = data;
      const otherSocketId = connectedUsers.get(otherUserId);
      
      if (otherSocketId) {
        io.to(otherSocketId).emit('callEnded', { conversationId });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      const userId = userSockets.get(socket.id);
      
      if (userId) {
        connectedUsers.delete(userId);
        userSockets.delete(socket.id);
        
        // Broadcast user offline status
        socket.broadcast.emit('userOnline', { userId, isOnline: false });
        
        console.log(`User ${userId} disconnected`);
      }
      
      console.log('Socket disconnected:', socket.id);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
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
  const socketId = connectedUsers.get(userId);
  if (socketId) {
    io.to(socketId).emit(event, data);
    return true;
  }
  return false;
};