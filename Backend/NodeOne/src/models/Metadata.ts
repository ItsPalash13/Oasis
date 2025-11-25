import mongoose, { Schema, Document } from 'mongoose';

export interface IMetadata extends Document {
  metadataId: string;
  metadataType: string;
  metadataName: string;
  imageUrl: string;
  description?: string;
  status?: boolean;
  minRank?: number;
  maxRank?: number;
  createdAt: Date;
  updatedAt: Date;
}

const MetadataSchema = new Schema<IMetadata>(
  {
    metadataId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    metadataType: {
      type: String,
      required: true,
      trim: true
    },
    metadataName: {
      type: String,
      required: true,
      trim: true
    },
    imageUrl: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    status: {
      type: Boolean,
      default: true
    },
    minRank: {
      type: Number,
      required: false
    },
    maxRank: {
      type: Number,
      required: false
    }
  },
  {
    timestamps: true
  }
);

// Indexes for faster queries
MetadataSchema.index({ metadataType: 1 });
MetadataSchema.index({ metadataId: 1 });

export const Metadata = mongoose.model<IMetadata>('Metadata', MetadataSchema);

export default Metadata;
