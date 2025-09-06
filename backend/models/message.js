// backend/models/message.js
import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, // Product being discussed
    content: { type: String }, // Text message content
    messageType: { 
      type: String, 
      enum: ['text', 'image', 'product', 'call'], 
      default: 'text' 
    },
    imageUrl: { type: String }, // For image messages
    callDuration: { type: Number }, // For call messages (in seconds)
    callType: { 
      type: String, 
      enum: ['voice', 'video'],
      default: 'voice'
    },
    sentDate: { type: Date, default: Date.now },
    isRead: { type: Boolean, default: false },
    isDelivered: { type: Boolean, default: false },
    // For product sharing in chat
    sharedProduct: {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      productTitle: { type: String },
      productPrice: { type: Number },
      productImage: { type: String }
    }
  },
  { timestamps: true }
);

// Index for efficient querying
messageSchema.index({ senderId: 1, receiverId: 1, sentDate: -1 });

export default mongoose.model('Message', messageSchema);