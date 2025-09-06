// backend/models/Conversation.js
import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    participants: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    }],
    productId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Product' 
    }, // The product this conversation is about
    lastMessage: {
      content: { type: String },
      senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      messageType: { type: String, default: 'text' },
      sentDate: { type: Date, default: Date.now }
    },
    unreadCount: {
      type: Map,
      of: Number,
      default: {}
    },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// Ensure participants array has exactly 2 users
conversationSchema.index({ participants: 1, productId: 1 });

export default mongoose.model('Conversation', conversationSchema);