import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const adminSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    firebaseUid: { type: String, unique: true },
    role: { type: String, enum: ['super_admin', 'admin', 'moderator'], default: 'admin' },
    permissions: [{
      type: String,
      enum: ['users_manage', 'products_manage', 'complaints_manage', 'feedback_view', 'analytics_view']
    }],
    isActive: { type: Boolean, default: true },
    lastLoginDate: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true }
);

adminSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};
// Default permissions by role
adminSchema.methods.getDefaultPermissions = function() {
  const permissionMap = {
    'super_admin': ['users_manage', 'products_manage', 'complaints_manage', 'feedback_view', 'analytics_view'],
    'admin': ['users_manage', 'products_manage', 'complaints_manage', 'feedback_view'],
    'moderator': ['complaints_manage', 'feedback_view']
  };
  return permissionMap[this.role] || [];
};

export default mongoose.model('Admin', adminSchema);
