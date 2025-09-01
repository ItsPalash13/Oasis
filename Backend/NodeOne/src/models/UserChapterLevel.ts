import mongoose, { Schema, Document } from 'mongoose';

export interface IUserChapterLevel extends Document {
  // Common fields
  userId: mongoose.Types.ObjectId;
  chapterId: mongoose.Types.ObjectId;
  levelId: mongoose.Types.ObjectId;
  levelNumber: number;
  status: 'not_started' | 'in_progress' | 'completed';
  attemptType: 'time_rush' | 'precision_path';
  completedAt?: Date;
  lastAttemptedAt: Date;
  progress: number;

  // Time Rush specific fields (only present when attemptType is 'time_rush')
  timeRush?: {
    attempts?: number;
    minTime?: number | null;
    maxXp?: number;
    requiredCorrectQuestions?: number;
    timeLimit?: number;  // Time limit for Time Rush mode
    totalQuestions?: number;
    maxCorrectQuestions?: number;
  };

  // Precision Path specific fields (only present when attemptType is 'precision_path')
  precisionPath?: {
    attempts?: number;
    minTime?: number | null;
    maxXp?: number;
    requiredCorrectQuestions?: number;
    totalQuestions?: number;
    expectedTime?: number;
    maxCorrectQuestions?: number;
  };
}

export const UserChapterLevelSchema = new Schema<IUserChapterLevel>({
  // Common fields
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  chapterId: {
    type: Schema.Types.ObjectId,
    ref: 'Chapter',
    required: true
  },
  levelId: {
    type: Schema.Types.ObjectId,
    ref: 'Level',
    required: true
  },
  levelNumber: {        
    type: Number,
    required: true,
    min: 1
  },        
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed'],
    default: 'not_started',
    required: true
  },
  attemptType: {
    type: String,
    enum: ['time_rush', 'precision_path'],
    required: true
  },
  completedAt: {
    type: Date
  },
  lastAttemptedAt: {
    type: Date,
    default: Date.now,
    required: true
  },
  progress:{
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },

  // Time Rush specific fields (conditional based on attemptType)
  timeRush: {
    attempts: {
      type: Number,
      min: 0
    },
    minTime: {
      type: Number
    },
    maxXp: {
      type: Number,
      min: 0
    },
    requiredCorrectQuestions: {
      type: Number,
      min: 0
    },
    timeLimit: {
      type: Number,
      min: 0
    },
    totalQuestions: {
      type: Number,
      min: 0
    },
    maxCorrectQuestions: {
      type: Number,
      min: 0
    }
  },

  // Precision Path specific fields (conditional based on attemptType)
  precisionPath: {
    attempts: {
      type: Number,
      default: 0,
      min: 0
    },
    minTime: {
      type: Number
    },
    maxXp: {
      type: Number,
      min: 0
    },
    requiredCorrectQuestions: {
      type: Number,
      min: 0
    },
    totalQuestions: {
      type: Number,
      min: 0
    },
    expectedTime: {
      type: Number,
      min: 0
    },
    maxCorrectQuestions: {
      type: Number,
      min: 0
    }
  }
});

// Index for faster queries
UserChapterLevelSchema.index({ userId: 1, chapterId: 1, levelId: 1, attemptType: 1 }, { unique: true });

// Pre-save middleware to update appropriate high score
UserChapterLevelSchema.pre('save', function(next) {
  if (this.completedAt && this.lastAttemptedAt) {
    const timeTaken = (this.completedAt.getTime() - this.lastAttemptedAt.getTime()) / 1000;
    
    if (this.attemptType === 'precision_path' && this.precisionPath) {
      // Precision Path: Update min time if current time is faster
      const currentMinTime = this.precisionPath.minTime;
      if (currentMinTime === null || currentMinTime === undefined || timeTaken < currentMinTime) {
        this.precisionPath.minTime = timeTaken;
      }
    } else if (this.attemptType === 'time_rush' && this.timeRush) {
      // Time Rush: Update minTime (which stores maxTime remaining) if current time remaining is higher
      // Note: This middleware is not used for Time Rush as the logic is handled in the API routes
      // The minTime field stores the maximum time remaining for Time Rush
    }
  }
  next();
});

export const UserChapterLevel = mongoose.models.UserChapterLevel || mongoose.model<IUserChapterLevel>('UserChapterLevel', UserChapterLevelSchema);
