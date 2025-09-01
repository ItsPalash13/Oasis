import mongoose, { Schema, Document } from 'mongoose';

export interface IUserLevelSessionHistory extends Document {
  // Common fields
  userChapterLevelId: mongoose.Types.ObjectId;
  sessionId: mongoose.Types.ObjectId; // Reference to the original UserLevelSession
  userId: mongoose.Types.ObjectId;
  chapterId: mongoose.Types.ObjectId;
  levelId: mongoose.Types.ObjectId;
  status: 0 | 1;
  currentTime: number;
  uniqueTopics: mongoose.Types.ObjectId[];
  attemptType: 'time_rush' | 'precision_path';
  currentQuestion: mongoose.Types.ObjectId | null;
  questionsAnswered: {
    correct: mongoose.Types.ObjectId[];
    incorrect: mongoose.Types.ObjectId[];
  };

  // Question details history captured during the session
  questionsHistory: Array<{
    quesId: mongoose.Types.ObjectId;
    question: string;
    options: string[];
    userOptionChoice: number;
    correctOption: number;
    topics?: Array<{
      topicId: mongoose.Types.ObjectId | string;
      topicName: string;
    }>;
    solution?: string;
    solutionType?: string;
  }>;

  // Question Bank fields
  questionBank: mongoose.Types.ObjectId[];
  currentQuestionIndex: number;

  // User Level Session Strikes
  streak: number;

  // Time Rush specific fields
  timeRush: {
    requiredCorrectQuestions: number;
    currentXp: number;
    minTime: number;
    timeLimit: number;
    currentTime: number;
    totalQuestions: number;
  };

  // Precision Path specific fields
  precisionPath: {
    requiredCorrectQuestions: number;
    currentXp: number;
    currentTime: number;
    minTime: number;
    totalQuestions: number;
    expectedTime: number;
    };
}

export const UserLevelSessionHistorySchema = new Schema<IUserLevelSessionHistory>({
  // Common fields
  userChapterLevelId: {
    type: Schema.Types.ObjectId,
    ref: 'UserChapterLevel',
    required: true
  },
  sessionId: {
    type: Schema.Types.ObjectId,
    ref: 'UserLevelSession',
    required: true
  },
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
  uniqueTopics:[{
      type: Schema.Types.ObjectId,
      ref: 'Topic'
    }],
  status: {
    type: Number,
    default: 0,
    min: 0,
    required: true
  },
  attemptType: {
    type: String,
    enum: ['time_rush', 'precision_path'],
    required: true
  },
  currentTime: {
    type: Number,
    min: 0
  },
  currentQuestion: {
    type: Schema.Types.ObjectId,
    ref: 'Question',
    required: false,
    default: null
  },
  questionsAnswered: {
    correct: [{
      type: Schema.Types.ObjectId,
      ref: 'Question'
    }],
    incorrect: [{
      type: Schema.Types.ObjectId,
      ref: 'Question'
    }]
  },
  // Snapshot of asked questions with user choice and solution text
  questionsHistory: [{
    quesId: {
      type: Schema.Types.ObjectId,
      ref: 'Question',
      required: true
    },
    question: {
      type: String,
      required: true
    },
    options: [{
      type: String,
      required: true
    }],
    userOptionChoice: {
      type: Number,
      required: true,
      min: 0
    },
    correctOption: {
      type: Number,
      required: false,
      min: 0
    },
    topics: [{
      topicId: {
        type: Schema.Types.ObjectId,
        ref: 'Topic',
        required: true
      },
      topicName: {
        type: String,
        required: true
      }
    }],
    solution: {
      type: String,
      required: false
    },
    solutionType: {
      type: String,
      required: false,
      enum: ['text', 'latex']
    }
  }],
  streak: {
    type: Number,
    default: 0,
    min: 0
  },
  // Question Bank fields
  questionBank: [{
    type: Schema.Types.ObjectId,
    ref: 'Question'
  }],
  currentQuestionIndex: {
    type: Number,
    default: 0,
    min: 0
  },

  // Time Rush specific fields
  timeRush: {
    requiredCorrectQuestions: {
      type: Number,
      min: 0,
    },
    maxXp: {
      type: Number,
      min: 0,
    },
    currentXp: {
      type: Number,
      min: 0,
    },
    minTime: {
      type: Number,
      min: 0
    },
    timeLimit: {
      type: Number,
      min: 0,
    },
    currentTime: {
      type: Number,
      min: 0,
    },
    totalQuestions: {
      type: Number,
      min: 0
    }
  },

  // Precision Path specific fields
  precisionPath: {
    requiredCorrectQuestions: {
      type: Number,
      min: 0,
    },
    maxXp: {
      type: Number,
      min: 0,
    },
    currentXp: {
      type: Number,
      min: 0,
    },
    currentTime: {
      type: Number,
      min: 0,
    },
    minTime: {
      type: Number,
      min: 0,
    },
    totalQuestions: {
      type: Number,
      min: 0
    },
    expectedTime: {
      type: Number,
      min: 0
    }
  }
}, {
  timestamps: true
});

// Indexes for faster queries
UserLevelSessionHistorySchema.index({ userChapterLevelId: 1 });
UserLevelSessionHistorySchema.index({ sessionId: 1 });



export const UserLevelSessionHistory = mongoose.models.UserLevelSessionHistory || mongoose.model<IUserLevelSessionHistory>('UserLevelSessionHistory', UserLevelSessionHistorySchema);
