// backend/socket/socketHandler.js - FINAL FIX (Replace entire file)
import { Server } from 'socket.io';
import admin from '../config/firebase.js';
import Message from '../models/message.js';
import Conversation from '../models/Conversation.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';

const connectedUsers = new Map();
const socketToUser = new Map();
const conversationRooms = new Map(); // Track who's viewing which conversation

export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: [
        'http://localhost:5000',
        'http://localhost:8081',
        'http://172.16.20.44:5000',
        'http://192.168.8.100:5000',
        'http://192.168.8.101:5000',
        'http://192.168.8.102:5000',
        'http://192.168.1.230:5000',
        'http://172.20.10.14:5000',
        'https://172.16.20.210:5000'
      ],
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    upgradeTimeout: 30000,
    pingTimeout: 60000,
    pingInterval: 25000,
    allowEIO3: true
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication error: Missing token'));
      }

      const decodedToken = await admin.auth().verifyIdToken(token);
      const userDoc = await User.findOne({ firebaseUid: decodedToken.uid });
      
      if (!userDoc) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.userId = userDoc._id.toString();
      socket.userDetails = {
        _id: userDoc._id,
        username: userDoc.username,
        email: userDoc.email,
        profilePictureUrl: userDoc.profilePictureUrl
      };
      
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    console.log(`🔌 User connected: ${userId} (Socket: ${socket.id})`);

    if (!connectedUsers.has(userId)) {
      connectedUsers.set(userId, new Set());
    }
    connectedUsers.get(userId).add(socket.id);
    socketToUser.set(socket.id, userId);

    socket.join(`user:${userId}`);
    socket.broadcast.emit('userOnline', { userId, isOnline: true });

    sendPendingNotifications(socket, userId);

    // ✅ FIX #1: Enhanced joinConversation with room tracking
    socket.on('joinConversation', async (conversationId) => {
      try {
        if (!conversationId) {
          socket.emit('error', { message: 'conversationId is required' });
          return;
        }

        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: userId
        });

        if (!conversation) {
          socket.emit('error', { message: 'Not authorized to join this conversation' });
          return;
        }

        socket.join(`conversation:${conversationId}`);
        
        // ✅ Track who's in this conversation room
        if (!conversationRooms.has(conversationId)) {
          conversationRooms.set(conversationId, new Set());
        }
        conversationRooms.get(conversationId).add(userId);
        
        console.log(`💬 User ${userId} joined conversation ${conversationId}`);
        socket.emit('conversationJoined', { conversationId });

        // ✅ FIX #1: Auto-mark unread messages as read when joining
        const unreadMessages = await Message.find({
          receiverId: userId,
          isRead: false,
          $or: [
            { senderId: { $in: conversation.participants } },
            { receiverId: { $in: conversation.participants } }
          ]
        }).select('_id senderId');

        if (unreadMessages.length > 0) {
          const messageIds = unreadMessages.map(m => m._id);
          const senderIds = [...new Set(unreadMessages.map(m => m.senderId.toString()))];

          // Mark as read in DB
          await Message.updateMany(
            { _id: { $in: messageIds } },
            { isRead: true, status: 'read' }
          );

          // ✅ Update conversation unread count
          await Conversation.findByIdAndUpdate(conversationId, {
            $set: { [`unreadCount.${userId}`]: 0 }
          });

          // ✅ Emit read status to ALL sender's devices (personal rooms)
          senderIds.forEach(senderId => {
            if (senderId !== userId) {
              io.to(`user:${senderId}`).emit('messagesRead', {
                messageIds,
                readBy: userId,
                conversationId
              });
            }
          });

          // ✅ Also emit to conversation room
          socket.to(`conversation:${conversationId}`).emit('messagesRead', {
            messageIds,
            readBy: userId,
            conversationId
          });

          console.log(`✓✓ Auto-marked ${messageIds.length} messages as read on join`);
        }

        // ✅ Notify other participant user is in chat
        const otherParticipant = conversation.participants.find(p => p.toString() !== userId);
        if (otherParticipant) {
          io.to(`user:${otherParticipant}`).emit('userInConversation', {
            conversationId,
            userId,
            isInChat: true
          });
        }
      } catch (error) {
        console.error('Error joining conversation:', error);
        socket.emit('error', { message: 'Failed to join conversation' });
      }
    });

    socket.on('leaveConversation', async (conversationId) => {
      try {
        if (!conversationId) return;
        
        socket.leave(`conversation:${conversationId}`);
        
        // Remove from room tracking
        if (conversationRooms.has(conversationId)) {
          conversationRooms.get(conversationId).delete(userId);
          if (conversationRooms.get(conversationId).size === 0) {
            conversationRooms.delete(conversationId);
          }
        }
        
        // Notify other participant user left chat
        const conversation = await Conversation.findById(conversationId);
        if (conversation) {
          const otherParticipant = conversation.participants.find(p => p.toString() !== userId);
          if (otherParticipant) {
            io.to(`user:${otherParticipant}`).emit('userInConversation', {
              conversationId,
              userId,
              isInChat: false
            });
          }
        }
        
        console.log(`🚪 User ${userId} left conversation ${conversationId}`);
      } catch (error) {
        console.error('Error leaving conversation:', error);
      }
    });

    socket.on('sendMessage', async (data) => {
      try {
        const { conversationId, message } = data;
        
        if (!conversationId || !message) {
          socket.emit('messageError', { error: 'Missing required data' });
          return;
        }

        console.log(`📨 Broadcasting message ${message._id} to conversation ${conversationId}`);
        
        // Broadcast to conversation room (excluding sender)
        socket.to(`conversation:${conversationId}`).emit('newMessage', message);
        
        const conversation = await Conversation.findById(conversationId)
          .populate('participants', '_id username');
        
        if (conversation) {
          const receiverId = conversation.participants.find(
            p => p._id.toString() !== userId
          )?._id.toString();

          if (receiverId) {
            // ✅ Check if receiver is actively viewing this chat
            const isReceiverInRoom = conversationRooms.get(conversationId)?.has(receiverId);
            
            if (isReceiverInRoom) {
              // ✅ Auto-mark as read immediately
              try {
                await Message.findByIdAndUpdate(message._id, {
                  isRead: true,
                  isDelivered: true,
                  status: 'read'
                });
                
                // Notify sender immediately
                io.to(`user:${userId}`).emit('messagesRead', {
                  messageIds: [message._id],
                  readBy: receiverId,
                  conversationId
                });
                
                console.log(`✓✓ Auto-marked as read (receiver in chat)`);
              } catch (dbError) {
                console.error('Error auto-marking as read:', dbError);
              }
            } else {
              // ✅ Mark as delivered only
              if (connectedUsers.has(receiverId)) {
                try {
                  await Message.findByIdAndUpdate(message._id, {
                    isDelivered: true,
                    status: 'delivered'
                  });
                  
                  socket.emit('messageDelivered', { 
                    messageId: message._id,
                    conversationId 
                  });
                  
                  // ✅ FIX #2: Update unread count for receiver
                  await Conversation.findByIdAndUpdate(conversationId, {
                    $inc: { [`unreadCount.${receiverId}`]: 1 }
                  });
                  
                  // ✅ Emit unread count update to receiver's devices
                  const updatedConv = await Conversation.findById(conversationId);
                  io.to(`user:${receiverId}`).emit('unreadCountUpdate', {
                    conversationId,
                    unreadCount: updatedConv.unreadCount.get(receiverId) || 0
                  });
                  
                } catch (dbError) {
                  console.error('Error updating delivery status:', dbError);
                }
              }
            }

            // Always emit to receiver's personal room
            io.to(`user:${receiverId}`).emit('newMessage', message);
            
            // Send notification if not in chat
            if (!isReceiverInRoom) {
              io.to(`user:${receiverId}`).emit('newNotification', {
                type: 'new_message',
                conversationId,
                senderId: userId,
                message: message.content || 'New message',
                timestamp: new Date()
              });
            }
          }
        }
      } catch (error) {
        console.error('Error handling sendMessage:', error);
        socket.emit('messageError', { error: 'Failed to send message' });
      }
    });

    socket.on('typing', (data) => {
      try {
        const { conversationId, isTyping } = data;
        
        if (!conversationId) return;
        
        socket.to(`conversation:${conversationId}`).emit('userTyping', { 
          userId, 
          username: socket.userDetails.username,
          isTyping 
        });
      } catch (error) {
        console.error('Error handling typing:', error);
      }
    });

    // ✅ FIX #1: Enhanced messageRead with sender notification
    socket.on('messageRead', async (data) => {
      try {
        const { conversationId, messageIds } = data;
        
        if (!conversationId || !messageIds || !Array.isArray(messageIds)) {
          socket.emit('error', { message: 'Invalid data for read status' });
          return;
        }

        // Get messages to find senders
        const messages = await Message.find({
          _id: { $in: messageIds },
          receiverId: userId
        }).select('senderId');

        // Update messages in DB
        await Message.updateMany(
          { 
            _id: { $in: messageIds }, 
            receiverId: userId,
            isRead: false
          },
          { 
            isRead: true,
            status: 'read'
          }
        );

        // ✅ Update conversation unread count
        await Conversation.findByIdAndUpdate(conversationId, {
          $set: { [`unreadCount.${userId}`]: 0 }
        });

        // ✅ Get all unique senders
        const senderIds = [...new Set(messages.map(m => m.senderId.toString()))];

        // ✅ Emit to ALL sender's devices (personal rooms + conversation room)
        senderIds.forEach(senderId => {
          if (senderId !== userId) {
            // Emit to sender's personal room (all their devices)
            io.to(`user:${senderId}`).emit('messagesRead', {
              messageIds,
              readBy: userId,
              conversationId
            });
          }
        });

        // ✅ Also emit to conversation room
        socket.to(`conversation:${conversationId}`).emit('messagesRead', { 
          messageIds, 
          readBy: userId,
          conversationId
        });

        console.log(`✓✓ ${messageIds.length} messages marked as read, notified ${senderIds.length} senders`);
      } catch (error) {
        console.error('Error updating read status:', error);
        socket.emit('error', { message: 'Failed to update read status' });
      }
    });

    // ✅ FIX #3: Enhanced deleteMessage with full broadcast
socket.on('deleteMessage', async ({ messageId, conversationId }) => {
  try {
    // Auth check: User must be participant
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId
    }).populate('participants', '_id');

    if (!conversation) {
      socket.emit('error', { message: 'Not authorized to delete in this conversation' });
      return;
    }

    // Fetch message to check auth and if unread
    const message = await Message.findById(messageId);
    if (!message) {
      console.log('Message already deleted');
      return; // Idempotent: Already deleted, skip
    }

    if (message.senderId.toString() !== userId) {
      socket.emit('error', { message: 'Not authorized to delete this message' });
      return;
    }

    const wasUnread = !message.isRead;
    const receiverId = message.receiverId.toString();

    // Delete message
    await message.deleteOne();

    // Update lastMessage: Find new latest
    const newLastMessage = await Message.findOne({ conversationId: conversation._id })
      .sort({ sentDate: -1 })
      .select('_id content messageType sentDate senderId');

    await Conversation.findByIdAndUpdate(conversation._id, {
      lastMessage: newLastMessage ? {
        _id: newLastMessage._id,
        content: newLastMessage.content,
        messageType: newLastMessage.messageType,
        sentDate: newLastMessage.sentDate,
        senderId: newLastMessage.senderId
      } : null
    });

    // If was unread, decrement receiver's unreadCount
    let updatedUnreadCount = conversation.unreadCount.get(receiverId) || 0;
    if (wasUnread) {
      await Conversation.findByIdAndUpdate(conversation._id, {
        $inc: { [`unreadCount.${receiverId}`]: -1 }
      });
      updatedUnreadCount = Math.max(0, updatedUnreadCount - 1);
    }

    // Broadcast messageDeleted
    io.to(`conversation:${conversationId}`).emit('messageDeleted', { 
      messageId, 
      conversationId 
    });

    conversation.participants.forEach(participant => {
      const participantId = participant._id.toString();
      io.to(`user:${participantId}`).emit('messageDeleted', {
        messageId,
        conversationId
      });
    });

    // Broadcast conversationUpdated (includes new lastMessage)
    conversation.participants.forEach(participant => {
      const participantId = participant._id.toString();
      io.to(`user:${participantId}`).emit('conversationUpdated', {
        conversationId,
        update: {
          lastMessage: newLastMessage ? {
            _id: newLastMessage._id,
            content: newLastMessage.content,
            messageType: newLastMessage.messageType,
            sentDate: newLastMessage.sentDate,
            senderId: newLastMessage.senderId
          } : null,
          unreadCount: conversation.unreadCount.get(participantId) || 0  // Per-user
        }
      });
    });

    // Specific unreadCountUpdate for receiver if changed
    if (wasUnread) {
      io.to(`user:${receiverId}`).emit('unreadCountUpdate', {
        conversationId,
        unreadCount: updatedUnreadCount
      });
    }

    console.log(`🗑️ Message ${messageId} deleted, conversation ${conversationId} updated`);

  } catch (error) {
    console.error('Error handling deleteMessage:', error);
  }
});

    socket.on('markNotificationRead', async (data) => {
      try {
        const { notificationId } = data;
        
        if (notificationId) {
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

    socket.on('getUnreadCount', async () => {
      try {
        const unreadCount = await Notification.getUnreadCount(userId);
        socket.emit('unreadCountUpdate', { count: unreadCount });
      } catch (error) {
        console.error('Error getting unread count:', error);
      }
    });

    socket.on('callUser', async (data) => {
      try {
        const { conversationId, callType, receiverId } = data;
        
        if (!conversationId || !callType || !receiverId) {
          socket.emit('callError', { error: 'Missing call data' });
          return;
        }

        if (connectedUsers.has(receiverId)) {
          io.to(`user:${receiverId}`).emit('incomingCall', {
            callerId: userId,
            callerName: socket.userDetails.username,
            callType,
            conversationId
          });
          
          console.log(`📞 Call initiated: ${userId} -> ${receiverId}`);
        } else {
          socket.emit('callError', { error: 'User is offline' });
        }
      } catch (error) {
        console.error('Error handling call:', error);
        socket.emit('callError', { error: 'Failed to initiate call' });
      }
    });

    socket.on('callResponse', (data) => {
      try {
        const { conversationId, callerId, accepted } = data;
        
        if (!conversationId || !callerId) return;
        
        io.to(`user:${callerId}`).emit('callResponse', { 
          accepted, 
          conversationId,
          responderId: userId
        });

        console.log(`📞 Call ${accepted ? 'accepted' : 'rejected'}: ${callerId} <- ${userId}`);
      } catch (error) {
        console.error('Error handling call response:', error);
      }
    });

    socket.on('endCall', (data) => {
      try {
        const { conversationId, otherUserId } = data;
        
        if (!conversationId || !otherUserId) return;
        
        io.to(`user:${otherUserId}`).emit('callEnded', { 
          conversationId,
          endedBy: userId
        });

        console.log(`📞 Call ended: ${userId} - ${otherUserId}`);
      } catch (error) {
        console.error('Error handling call end:', error);
      }
    });

    socket.on('conversationUpdated', (data) => {
      try {
        const { conversationId, update } = data;
        if (!conversationId) return;

        socket.to(`conversation:${conversationId}`).emit('conversationUpdated', {
          conversationId,
          update
        });
      } catch (error) {
        console.error('Error handling conversation update:', error);
      }
    });

    socket.on('disconnect', (reason) => {
      try {
        console.log(`🔌❌ User ${userId} disconnected (${reason})`);

        const userSockets = connectedUsers.get(userId);
        if (userSockets) {
          userSockets.delete(socket.id);
          
          if (userSockets.size === 0) {
            connectedUsers.delete(userId);
            socket.broadcast.emit('userOnline', { userId, isOnline: false });
            
            // Clean up conversation rooms
            conversationRooms.forEach((users, conversationId) => {
              if (users.has(userId)) {
                users.delete(userId);
                // Notify other participants user left
                io.to(`conversation:${conversationId}`).emit('userInConversation', {
                  conversationId,
                  userId,
                  isInChat: false
                });
              }
            });
            
            console.log(`👤 User ${userId} is now offline`);
          }
        }
        
        socketToUser.delete(socket.id);
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
    });

    socket.on('error', (error) => {
      console.error('Socket error:', {
        socketId: socket.id,
        userId,
        error: error.message
      });
    });

    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });
  });

  io.on('error', (error) => {
    console.error('Socket.IO server error:', error);
  });

  console.log('✅ Socket.IO server initialized with complete real-time sync');
  return io;
};

const sendPendingNotifications = async (socket, userId) => {
  try {
    const notifications = await Notification.find({
      recipientId: userId,
      isRead: false,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
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

export const getOnlineUsers = () => {
  return Array.from(connectedUsers.keys());
};

export const isUserOnline = (userId) => {
  return connectedUsers.has(userId);
};

export const emitToUser = (io, userId, event, data) => {
  try {
    io.to(`user:${userId}`).emit(event, data);
    console.log(`📤 Emitted ${event} to user ${userId}`);
    return true;
  } catch (error) {
    console.error('Error emitting to user:', error);
    return false;
  }
};

export const emitNotificationToUser = async (io, userId, notification) => {
  try {
    io.to(`user:${userId}`).emit('newNotification', {
      id: notification._id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      timestamp: notification.createdAt,
      isRead: false
    });
    
    const unreadCount = await Notification.getUnreadCount(userId);
    io.to(`user:${userId}`).emit('unreadCountUpdate', { count: unreadCount });
    
    console.log(`🔔 Notification sent to user ${userId}`);
    return true;
  } catch (error) {
    console.error('Error emitting notification to user:', error);
    return false;
  }
};

export const getConnectionStats = () => {
  return {
    totalUsers: connectedUsers.size,
    totalSockets: socketToUser.size,
    onlineUsers: Array.from(connectedUsers.keys()),
    socketsPerUser: Array.from(connectedUsers.entries()).map(([userId, sockets]) => ({
      userId,
      socketCount: sockets.size
    })),
    activeConversations: conversationRooms.size,
    conversationDetails: Array.from(conversationRooms.entries()).map(([convId, users]) => ({
      conversationId: convId,
      activeUsers: Array.from(users)
    }))
  };
};