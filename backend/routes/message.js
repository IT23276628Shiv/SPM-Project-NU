// backend/routes/message.js - FIXED VERSION
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
        updatedAt: conv.updatedAt,
        isArchived: conv.isArchived || false
      };
    });

    res.json({ conversations: formattedConversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// 🔧 FIX #9: Permanent conversation deletion with better error handling
router.delete('/conversations/bulk-delete', authMiddleware, async (req, res) => {
  try {
    const { conversationIds } = req.body;

    console.log('🗑️ Delete request:', { conversationIds, userId: req.userId });

    if (!conversationIds || !Array.isArray(conversationIds) || conversationIds.length === 0) {
      return res.status(400).json({ error: 'conversationIds array is required' });
    }

    // Verify user has access to these conversations
    const conversations = await Conversation.find({
      _id: { $in: conversationIds },
      participants: req.userId
    });

    console.log('🗑️ Found conversations to delete:', conversations.length);

    if (conversations.length === 0) {
      return res.status(404).json({ error: 'No conversations found' });
    }

    if (conversations.length !== conversationIds.length) {
      console.warn('⚠️ Some conversations not found or access denied');
    }

    const validConversationIds = conversations.map(c => c._id);

    // Delete all messages for these conversations
    for (const conversation of conversations) {
      const deleteMessagesResult = await Message.deleteMany({
        $or: [
          { 
            senderId: req.userId, 
            receiverId: { $in: conversation.participants.filter(p => p.toString() !== req.userId.toString()) }
          },
          { 
            senderId: { $in: conversation.participants.filter(p => p.toString() !== req.userId.toString()) },
            receiverId: req.userId 
          }
        ]
      });

      console.log(`🗑️ Deleted ${deleteMessagesResult.deletedCount} messages from conversation ${conversation._id}`);
    }

    // PERMANENTLY delete conversations from DB
    const deleteResult = await Conversation.deleteMany({
      _id: { $in: validConversationIds }
    });

    console.log('✅ Delete result:', deleteResult);

    res.json({ 
      message: 'Conversations deleted permanently',
      deletedCount: deleteResult.deletedCount,
      success: true
    });
  } catch (error) {
    console.error('❌ Error bulk deleting conversations:', error);
    res.status(500).json({ 
      error: 'Failed to delete conversations',
      details: error.message
    });
  }
});

// Delete a single conversation
router.delete('/conversations/:conversationId', authMiddleware, async (req, res) => {
  try {
    const { conversationId } = req.params;

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

    // PERMANENTLY delete the conversation from DB
    await Conversation.findByIdAndDelete(conversationId);

    res.json({ message: 'Conversation deleted permanently', success: true });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// Send a message with reply support
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
      replyTo
    } = req.body;

    if (!conversationId || !receiverId) {
      return res.status(400).json({ error: 'conversationId and receiverId are required' });
    }

    if (messageType === 'text' && !content) {
      return res.status(400).json({ error: 'Content is required for text messages' });
    }

    if (messageType === 'image' && !imageUrl) {
      return res.status(400).json({ error: 'imageUrl is required for image messages' });
    }

    let replyToMessage = null;
    if (replyTo) {
      replyToMessage = await Message.findById(replyTo).populate('senderId', 'username');
      if (!replyToMessage) {
        return res.status(404).json({ error: 'Message to reply to not found' });
      }
    }

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

// Upload image for message
router.post('/upload-image', authMiddleware, async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Image is required' });
    }

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

// Get messages for a conversation
router.get('/conversations/:conversationId/messages', authMiddleware, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.userId
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const messages = await Message.find({
      $or: [
        { senderId: req.userId, receiverId: { $in: conversation.participants } },
        { senderId: { $in: conversation.participants }, receiverId: req.userId }
      ]
    })
    .populate('senderId', 'username profilePictureUrl')
    .populate('receiverId', 'username profilePictureUrl')
    .populate('sharedProduct.productId', 'title price imagesUrls')
    .populate('replyTo.senderId', 'username')
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

    await Message.updateMany({
      receiverId: req.userId,
      isRead: false
    }, {
      isRead: true
    });

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

// 🔧 FIX #1: Start a conversation - Fixed duplicate conversations
router.post('/conversations/start', authMiddleware, async (req, res) => {
  try {
    const { receiverId, productId } = req.body;

    if (!receiverId || !productId) {
      return res.status(400).json({ error: 'receiverId and productId are required' });
    }

    // 🔧 FIX: Check for existing conversation regardless of participant order
    let conversation = await Conversation.findOne({
      $or: [
        { participants: [req.userId, receiverId], productId: productId },
        { participants: [receiverId, req.userId], productId: productId }
      ]
    });

    if (!conversation) {
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

// Delete a specific message
router.delete('/:messageId', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.senderId.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'You can only delete your own messages' });
    }

    await Message.findByIdAndDelete(messageId);

    const conversations = await Conversation.find({
      participants: req.userId
    });

    for (const conversation of conversations) {
      if (conversation.lastMessage && conversation.lastMessage.messageId === messageId) {
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