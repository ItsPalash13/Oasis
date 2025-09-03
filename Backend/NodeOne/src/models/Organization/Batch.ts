import mongoose, { Schema, Document } from 'mongoose';

// Batch Schema
interface IBatch extends Document {
  name: string;
  description: string;
  orgId: mongoose.Types.ObjectId;
  userIds: string[];
}

const BatchSchema = new Schema<IBatch>({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  description: { 
    type: String, 
    required: true,
    trim: true
  },
  orgId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  userIds: [{
    type: String,
    required: true
  }]
}, { timestamps: true });

// Indexes for faster queries
BatchSchema.index({ orgId: 1 });
BatchSchema.index({ userIds: 1 });

export const Batch = mongoose.model<IBatch>('Batch', BatchSchema);
