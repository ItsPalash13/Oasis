import mongoose, { Schema, Document } from 'mongoose';

// Interface for dummy user
export interface IDummyUser {
  userId: string;
  fullName: string;
  userRating: number;
  avatarBgColor: string;
}

// Interface for Misc document
export interface IMisc extends Document {
  chapterId: string;
  users: IDummyUser[];
  createdAt: Date;
  updatedAt: Date;
}

// Schema for dummy user
const DummyUserSchema = new Schema<IDummyUser>({
  userId: { type: String, required: true },
  fullName: { type: String, required: true },
  userRating: { type: Number, required: true, default: 0 },
  avatarBgColor: { type: String, required: true },
}, { _id: false });

// Main Misc schema
const MiscSchema = new Schema<IMisc>({
  chapterId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  users: {
    type: [DummyUserSchema],
    default: []
  }
}, { timestamps: true });

// Index for faster queries
MiscSchema.index({ chapterId: 1 });

export const Misc = mongoose.model<IMisc>('Misc', MiscSchema);

