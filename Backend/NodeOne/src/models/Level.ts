import mongoose, { Schema, Document } from 'mongoose';

export interface ILevel extends Document {
  name: string;
  levelNumber: number;
  description: string;
  topics: mongoose.Types.ObjectId[];
  status: boolean;
  chapterId: mongoose.Types.ObjectId;
  unitId: mongoose.Types.ObjectId;
  sectionId: mongoose.Types.ObjectId;
  type: 'time_rush' | 'precision_path';
  
  // Time Rush specific fields (only present when type is 'time_rush')
  timeRush?: {
    requiredXp: number;
    totalTime: number;
    totalQuestions: number;
  };

  // Precision Path specific fields (only present when type is 'precision_path')
  precisionPath?: {
    requiredXp: number;
    totalQuestions: number;
  };

  difficultyParams: {
    mean: number;
    sd: number;
    alpha: number;
  };
}

export const LevelSchema = new Schema<ILevel>({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  levelNumber: {
    type: Number,
    required: true,
    min: 1
  },
  description: { 
    type: String, 
    required: true,
    trim: true
  },
  status: {
    type: Boolean,
    default: false
  },
  chapterId: {
    type: Schema.Types.ObjectId,
    ref: 'Chapter',
    required: true
  },
  unitId: {
    type: Schema.Types.ObjectId,
    ref: 'Unit',
    required: true
  },
  sectionId: {
    type: Schema.Types.ObjectId,
    ref: 'Section',
    required: true
  },
  type: {
    type: String,
    enum: ['time_rush', 'precision_path'],
    required: true
  },
  topics: [{ 
    type: Schema.Types.ObjectId,
    ref: 'Topic',
    required: true
  }],
  
  // Time Rush specific fields (conditional)
  timeRush: {
    type: {
      requiredXp: {
        type: Number,
        min: 0
      },
      totalTime: {
        type: Number,
        min: 0
      },
      totalQuestions: {
        type: Number,
        min: 0
      }
    },
    required: false
  },

  // Precision Path specific fields (conditional)
  precisionPath: {
    type: {
      requiredXp: {
        type: Number,
        min: 0
      },
      totalQuestions: {
        type: Number,
        min: 0
      }
    },
    required: false
  },

  difficultyParams: {
    mean: {
      type: Number,
      required: true,
      default: 750
    },
    sd: {
      type: Number,
      required: true,
      default: 150
    },
    alpha: {
      type: Number,
      required: true,
      default: 5
    }
  }
}, { timestamps: true });

// Indexes for faster queries
LevelSchema.index({ chapterId: 1 });
LevelSchema.index({ chapterId: 1, type: 1 });
LevelSchema.index({ chapterId: 1, levelNumber: 1 });

export const Level = mongoose.model<ILevel>('Level', LevelSchema); 