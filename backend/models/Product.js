import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    //ownerId: { type: String, required: true }, // store Firebase UID,
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    title: { type: String, required: true },
    description: { type: String },
    condition: { type: String, enum: ['new', 'like_new', 'good', 'fair', 'poor'], required: true },
    price: { type: Number },
    isForSwap: { type: Boolean, default: false },
    swapPreferences: { type: String },
    imagesUrls: [{ type: String }],
    address: { type: String },
    listedDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['available', 'sold', 'swapped', 'removed'], default: 'available' },
    viewsCount: { type: Number, default: 0 },
 swapRequests: [
      {
        _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
        buyerId: String,             // Firebase UID of buyer
        buyerProductId: String,      // Product offered for swap
        status: { type: String, enum: ['pending', 'accepted', 'rejected', 'cancelled'], default: 'pending' },
        date: { type: Date, default: Date.now },
      },
    ],

  },
  { timestamps: true }
);

export default mongoose.model('Product', productSchema);