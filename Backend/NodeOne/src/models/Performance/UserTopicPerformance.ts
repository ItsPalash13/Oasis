import mongoose, { Schema, Document } from 'mongoose';

interface IAccuracyPoint {
  timestamp: Date;
  accuracy: number; // 0.0 - 1.0
}

interface ITopicPerformanceEntry {
  topicId: mongoose.Types.ObjectId;
  attemptsWindow: IAttemptsPoint[];
  accuracyHistory: IAccuracyPoint[];
}

interface ISectionPerformanceEntry {
  sectionId: mongoose.Types.ObjectId;
  topics: ITopicPerformanceEntry[];
}

export interface IUserTopicPerformance extends Document {
  userId: mongoose.Types.ObjectId;
  sections: ISectionPerformanceEntry[];
  createdAt: Date;
  updatedAt: Date;
}

interface IAttemptsPoint {
  timestamp: Date;
  value: number; // numeric value for the window (e.g., attempts count)
}

const AttemptsPointSchema = new Schema<IAttemptsPoint>({
  timestamp: { type: Date, required: true, default: () => new Date() },
  value: { type: Number, required: true, min: 0 }
}, { _id: false });

const AccuracyPointSchema = new Schema<IAccuracyPoint>({
  timestamp: { type: Date, required: true, default: () => new Date() },
  accuracy: { type: Number, required: true, min: 0, max: 1 }
}, { _id: false });

const TopicPerformanceEntrySchema = new Schema<ITopicPerformanceEntry>({
  topicId: {
    type: Schema.Types.ObjectId,
    ref: 'Topic',
    required: true
  },
  attemptsWindow: {
    type: [AttemptsPointSchema],
    required: true,
    default: []
  },
  accuracyHistory: {
    type: [AccuracyPointSchema],
    required: true,
    default: []
  }
}, { _id: false });

const SectionPerformanceEntrySchema = new Schema<ISectionPerformanceEntry>({
  sectionId: {
    type: Schema.Types.ObjectId,
    ref: 'Section',
    required: true
  },
  topics: {
    type: [TopicPerformanceEntrySchema],
    required: true,
    default: []
  }
}, { _id: false });

export const UserTopicPerformanceSchema = new Schema<IUserTopicPerformance>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sections: {
    type: [SectionPerformanceEntrySchema],
    required: true,
    default: []
  }
}, { timestamps: true });

// Helpful indexes for querying user's performance on sections and topics
UserTopicPerformanceSchema.index({ userId: 1, 'sections.sectionId': 1 });
UserTopicPerformanceSchema.index({ userId: 1, 'sections.topics.topicId': 1 });
UserTopicPerformanceSchema.index({ userId: 1, 'sections.sectionId': 1, 'sections.topics.topicId': 1 });

export const UserTopicPerformance = mongoose.model<IUserTopicPerformance>('UserTopicPerformance', UserTopicPerformanceSchema);


