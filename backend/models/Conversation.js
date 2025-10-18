// backend/models/Conversation.js - FIXED VERSION
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
      ref: 'Product',
    },
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

// ✅ FIX: Remove the old incorrect unique index
// The old index was: { participants: 1 }
// This caused the error because it indexed individual array elements

// ✅ NEW: Compound unique index on participant pairs
// This ensures one conversation per user pair, regardless of order
conversationSchema.index(
  { 'participants.0': 1, 'participants.1': 1 }, 
  { 
    unique: true,
    name: 'unique_participant_pair'
  }
);

// Additional indexes for performance
conversationSchema.index({ updatedAt: -1 });
conversationSchema.index({ productId: 1 });
conversationSchema.index({ participants: 1 }); // Non-unique index for queries

// ✅ Pre-save hook to always sort participants
conversationSchema.pre('save', function(next) {
  if (this.isNew && this.participants.length === 2) {
    // Sort participants to ensure consistent order
    this.participants.sort((a, b) => a.toString().localeCompare(b.toString()));
  }
  next();
});

export default mongoose.model('Conversation', conversationSchema);