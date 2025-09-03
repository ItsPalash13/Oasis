import mongoose, { Schema, Document } from 'mongoose';

// Organization Schema
interface IOrganization extends Document {
  name: string;
  description: string;
}

const OrganizationSchema = new Schema<IOrganization>({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  description: { 
    type: String, 
    required: true,
    trim: true
  }
}, { timestamps: true });

// Index for faster queries
OrganizationSchema.index({ name: 1 });

export const Organization = mongoose.model<IOrganization>('Organization', OrganizationSchema);
