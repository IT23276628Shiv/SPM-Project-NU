import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    phoneNumber: { type: String },
    profilePictureUrl: { type: String },
    bio: { type: String },
    address: { type: String },
    registrationDate: { type: Date, default: Date.now },
    lastLoginDate: { type: Date },
    isVerified: { type: Boolean, default: false },
    ratingAverage: { type: Number, default: 0 },
    favoriteProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }], // Updated to reference Product
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

export default mongoose.model('User', userSchema);