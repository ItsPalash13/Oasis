import mongoose, { Schema, Document } from 'mongoose';

// Result subdocument schema for user scores
interface IResult {
  userId: string;
  score: number;
}

const ResultSchema = new Schema<IResult>({
  userId: { type: String, required: true },
  score: { type: Number, required: true }
}, { _id: false });

// TestVersion Schema
export interface ITestVersion extends Document {
  startDate: Date;
  endDate: Date;
  versionId: string;
  correctScore: number;
  incorrectScore: number;
  batchId: mongoose.Types.ObjectId;
  result: IResult[];
  isActive: boolean;
}

const TestVersionSchema = new Schema<ITestVersion>({
  startDate: { 
    type: Date, 
    required: true 
  },
  endDate: { 
    type: Date, 
    required: true 
  },
  versionId: { 
    type: String, 
    required: true,
    unique: true,
    trim: true
  },
  correctScore: { 
    type: Number, 
    required: true,
    default: 1
  },
  incorrectScore: { 
    type: Number, 
    required: true,
    default: 0
  },
  batchId: {
    type: Schema.Types.ObjectId,
    ref: 'Batch',
    required: true
  },
  result: {
    type: [ResultSchema],
    default: []
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Indexes for faster queries
TestVersionSchema.index({ batchId: 1 });
TestVersionSchema.index({ versionId: 1 });
TestVersionSchema.index({ isActive: 1 });
TestVersionSchema.index({ startDate: 1, endDate: 1 });

export const TestVersion = mongoose.model<ITestVersion>('TestVersion', TestVersionSchema);
