import { USER_RATING_DEFAULT, USER_RATING_MULTIPLIER } from './../config/constants';
import mongoose, { Schema, Document } from 'mongoose';

// Chapter Schema
interface IChapter extends Document {
  name: string;
  description: string;
  gameName: string;
  status: boolean;
  defaultRating: number;
  ratingMultiplier: number;
  subjectId: mongoose.Types.ObjectId;
  thumbnailUrl?: string;
}

const ChapterSchema = new Schema<IChapter>({
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
  gameName: { 
    type: String, 
    required: true,
    trim: true
  },
  status: {
    type: Boolean,
    default: false  
  },
  defaultRating: {
    type: Number,
    required: true,
    default: USER_RATING_DEFAULT
  },
  ratingMultiplier: {
    type: Number,
    required: true,
    default: USER_RATING_MULTIPLIER
  },
  subjectId: {
    type: Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  thumbnailUrl: {
    type: String,
    required: false,
    trim: true
  }
}, { timestamps: true });

// Index for faster queries
ChapterSchema.index({ subjectId: 1 });

export const Chapter = mongoose.model<IChapter>('Chapter', ChapterSchema);
