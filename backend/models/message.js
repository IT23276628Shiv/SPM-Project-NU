import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, // Updated to reference Product
    content: { type: String, required: true },
    sentDate: { type: Date, default: Date.now },
    isRead: { type: Boolean, default: false },
    attachmentUrl: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model('Message', messageSchema);