// backend/routes/message.js - UPDATED VERSION with reply handling
import { Router } from 'express';
import Message from '../models/message.js';
import Conversation from '../models/Conversation.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { authMiddleware } from '../middleware/auth.js';
import cloudinary from '../config/cloudinary.js';

const router = Router();

// Get all conversations for a user
router.get('/conversations', authMiddleware, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.userId,
      isActive: true
    })
    .populate('participants', 'username profilePictureUrl')
    .populate('productId', 'title imagesUrls price')
    .populate('lastMessage.senderId', 'username')
    .sort({ updatedAt: -1 });

    const formattedConversations = conversations.map(conv => {
      const otherParticipant = conv.participants.find(p => 
        p._id.toString() !== req.userId.toString()
      );
      
      return {
        _id: conv._id,
        otherUser: {
          _id: otherParticipant._id,
          username: otherParticipant.username,
          profilePictureUrl: otherParticipant.profilePictureUrl
        },
        product: conv.productId,
        lastMessage: conv.lastMessage,
        unreadCount: conv.unreadCount.get(req.userId.toString()) || 0,
        updatedAt: conv.updatedAt
      };
    });

    res.json({ conversations: formattedConversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Start a conversation (when user clicks chat from product details)
router.post('/conversations/start', authMiddleware, async (req, res) => {
  try {
    const { receiverId, productId } = req.body;

    if (!receiverId || !productId) {
      return res.status(400).json({ error: 'receiverId and productId are required' });
    }

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      participants: { $all: [req.userId, receiverId] },
      productId: productId
    });

    if (!conversation) {
      // Create new conversation
      conversation = await Conversation.create({
        participants: [req.userId, receiverId],
        productId: productId,
        unreadCount: {
          [req.userId.toString()]: 0,
          [receiverId.toString()]: 0
        }
      });
    }

    await conversation.populate('participants', 'username profilePictureUrl');
    await conversation.populate('productId', 'title imagesUrls price');

    const otherUser = conversation.participants.find(p => 
      p._id.toString() !== req.userId.toString()
    );

    res.status(201).json({ 
      conversation: {
        _id: conversation._id,
        otherUser: {
          _id: otherUser._id,
          username: otherUser.username,
          profilePictureUrl: otherUser.profilePictureUrl
        },
        product: conversation.productId,
        lastMessage: conversation.lastMessage,
        unreadCount: conversation.unreadCount.get(req.userId.toString()) || 0
      }
    });
  } catch (error) {
    console.error('Error starting conversation:', error);
    res.status(500).json({ error: 'Failed to start conversation' });
  }
});

// UPDATED: Send a message with reply support
router.post('/send', authMiddleware, async (req, res) => {
  try {
    const { 
      conversationId, 
      receiverId, 
      content, 
      messageType = 'text',
      imageUrl,
      sharedProduct,
      callDuration,
      callType,
      replyTo // NEW: Reply to message ID
    } = req.body;

    if (!conversationId || !receiverId) {
      return res.status(400).json({ error: 'conversationId and receiverId are required' });
    }

    // Validate message content based on type
    if (messageType === 'text' && !content) {
      return res.status(400).json({ error: 'Content is required for text messages' });
    }

    if (messageType === 'image' && !imageUrl) {
      return res.status(400).json({ error: 'imageUrl is required for image messages' });
    }

    // If replying, validate the original message exists
    let replyToMessage = null;
    if (replyTo) {
      replyToMessage = await Message.findById(replyTo).populate('senderId', 'username');
      if (!replyToMessage) {
        return res.status(404).json({ error: 'Message to reply to not found' });
      }
    }

    // Create message
    const messageData = {
      senderId: req.userId,
      receiverId: receiverId,
      content: content,
      messageType: messageType,
      imageUrl: imageUrl,
      sharedProduct: sharedProduct,
      callDuration: callDuration,
      callType: callType,
      isDelivered: true
    };

    // Add reply reference if replying
    if (replyToMessage) {
      messageData.replyTo = {
        messageId: replyToMessage._id,
        senderId: replyToMessage.senderId,
        content: replyToMessage.content,
        messageType: replyToMessage.messageType,
        imageUrl: replyToMessage.imageUrl
      };
    }

    const message = await Message.create(messageData);

    // Update conversation
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: {
        content: content || `${messageType} message`,
        senderId: req.userId,
        messageType: messageType,
        sentDate: new Date()
      },
      $inc: {
        [`unreadCount.${receiverId.toString()}`]: 1
      },
      updatedAt: new Date()
    });

    // Populate sender info and reply info
    await message.populate('senderId', 'username profilePictureUrl');
    if (message.replyTo) {
      await message.populate('replyTo.senderId', 'username');
    }

    res.status(201).json({ message });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// FIXED: Upload image for message with proper base64 handling
router.post('/upload-image', authMiddleware, async (req, res) => {
  try {
    const { image } = req.body; // base64 image string

    if (!image) {
      return res.status(400).json({ error: 'Image is required' });
    }

    // Upload to Cloudinary
    const uploadResponse = await cloudinary.uploader.upload(image, {
      folder: 'chat_images',
      resource_type: 'image',
      transformation: [
        { width: 800, height: 600, crop: 'limit' },
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ]
    });

    res.json({ 
      imageUrl: uploadResponse.secure_url,
      publicId: uploadResponse.public_id
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// UPDATED: Get messages for a conversation with reply population
router.get('/conversations/:conversationId/messages', authMiddleware, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Verify user is part of the conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.userId
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Find messages between conversation participants
    const messages = await Message.find({
      $or: [
        { senderId: req.userId, receiverId: { $in: conversation.participants } },
        { senderId: { $in: conversation.participants }, receiverId: req.userId }
      ]
    })
    .populate('senderId', 'username profilePictureUrl')
    .populate('receiverId', 'username profilePictureUrl')
    .populate('sharedProduct.productId', 'title price imagesUrls')
    .populate('replyTo.senderId', 'username') // Populate reply sender info
    .sort({ sentDate: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    res.json({ messages: messages.reverse() });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Mark messages as read
router.put('/conversations/:conversationId/mark-read', authMiddleware, async (req, res) => {
  try {
    const { conversationId } = req.params;

    // Mark messages as read
    await Message.updateMany({
      receiverId: req.userId,
      isRead: false
    }, {
      isRead: true
    });

    // Reset unread count for this user
    await Conversation.findByIdAndUpdate(conversationId, {
      $set: {
        [`unreadCount.${req.userId.toString()}`]: 0
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

// FIXED: Delete a conversation properly
router.delete('/conversations/:conversationId', authMiddleware, async (req, res) => {
  try {
    const { conversationId } = req.params;

    // Verify user is part of the conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.userId
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Delete all messages in the conversation
    await Message.deleteMany({
      $or: [
        { senderId: req.userId, receiverId: { $in: conversation.participants } },
        { senderId: { $in: conversation.participants }, receiverId: req.userId }
      ]
    });

    // Delete the conversation
    await Conversation.findByIdAndDelete(conversationId);

    res.json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// FIXED: Delete a specific message with proper authorization
router.delete('/:messageId', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;

    // Find the message and verify ownership
    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if user owns the message
    if (message.senderId.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'You can only delete your own messages' });
    }

    // Delete the message
    await Message.findByIdAndDelete(messageId);

    // Find conversations that might need last message update
    const conversations = await Conversation.find({
      participants: req.userId
    });

    for (const conversation of conversations) {
      if (conversation.lastMessage && conversation.lastMessage.messageId === messageId) {
        // Find the new last message
        const lastMessage = await Message.findOne({
          $or: [
            { senderId: req.userId, receiverId: { $in: conversation.participants } },
            { senderId: { $in: conversation.participants }, receiverId: req.userId }
          ]
        }).sort({ sentDate: -1 });

        if (lastMessage) {
          await Conversation.findByIdAndUpdate(conversation._id, {
            lastMessage: {
              content: lastMessage.content || `${lastMessage.messageType} message`,
              senderId: lastMessage.senderId,
              messageType: lastMessage.messageType,
              sentDate: lastMessage.sentDate,
              messageId: lastMessage._id
            }
          });
        } else {
          // No messages left, clear last message
          await Conversation.findByIdAndUpdate(conversation._id, {
            lastMessage: null
          });
        }
      }
    }

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// Get product details for chat
router.get('/product/:productId', authMiddleware, async (req, res) => {
  try {
    const { productId } = req.params;
    
    const product = await Product.findById(productId)
      .populate('ownerId', 'username phoneNumber')
      .populate('categoryId', 'name');

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ 
      product: {
        ...product.toObject(),
        ownerName: product.ownerId?.username || 'Unknown',
        ownerContact: product.ownerId?.phoneNumber || 'Unknown',
        categoryName: product.categoryId?.name || 'Unknown'
      }
    });
  } catch (error) {
    console.error('Error fetching product details:', error);
    res.status(500).json({ error: 'Failed to fetch product details' });
  }
});

export default router;