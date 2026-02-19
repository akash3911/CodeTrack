import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  _id: string;
  firebaseUid: string;
  username: string;
  email: string;
  displayName?: string;
  avatar?: string;
  solvedProblems: string[];
  starredProblems: string[];
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>({
  firebaseUid: {
    type: String,
    required: [true, 'Firebase UID is required'],
    unique: true,
    index: true
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [30, 'Username must be less than 30 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email address'
    ]
  },
  displayName: {
    type: String,
    default: ''
  },
  avatar: {
    type: String,
    default: ''
  },
  solvedProblems: [{
    type: String,
    default: []
  }],
  starredProblems: [{
    type: String,
    default: []
  }]
}, {
  timestamps: true
});

// Index for better performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ firebaseUid: 1 });

export default mongoose.model<IUser>('User', userSchema);
