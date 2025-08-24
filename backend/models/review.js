import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reviewedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String },
    createdDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model('Review', reviewSchema);