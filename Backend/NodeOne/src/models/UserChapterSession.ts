import mongoose, { Schema, Document } from 'mongoose';

interface IDifficulty {
  mu: number;    // Mean of the difficulty rating
  sigma: number; // Standard deviation of the difficulty rating
}

export interface IOngoingSessionV3 {
  _id?: mongoose.Types.ObjectId;
  questions: Array<mongoose.Types.ObjectId>; // Array of question IDs (currently 3)
  answers: Array<{ questionId: mongoose.Types.ObjectId; answerIndex: number | number[] | null }>; // User's answers
  questionsAttempted: number;
  questionsCorrect: number;
  questionsIncorrect: number;
  currentScore: number;
}

interface ITrueSkillChangeLogEntry {
  timestamp: Date;
  questionId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  isCorrect: boolean;
  beforeUts: { mu: number; sigma: number };
  beforeQts: { mu: number; sigma: number };
  afterUts: { mu: number; sigma: number };
  afterQts: { mu: number; sigma: number };
}

const ongoingSchemaV3 = new Schema<IOngoingSessionV3>({
  _id: { type: Schema.Types.ObjectId, auto: true, unique: true },
  questions: [{ type: Schema.Types.ObjectId, ref: "Question" }],
  answers: [{
    questionId: { type: Schema.Types.ObjectId, ref: "Question" },
    answerIndex: { type: Schema.Types.Mixed, default: null } // Can be number, number[], or null
  }],
  questionsAttempted: { type: Number, default: 0 },
  questionsCorrect: { type: Number, default: 0 },
  questionsIncorrect: { type: Number, default: 0 },
  currentScore: { type: Number, default: 0 },
}, { _id: true });

export interface IUserChapterSession extends Document {
  userId: mongoose.Types.ObjectId;
  chapterId: mongoose.Types.ObjectId;
  trueSkillScore?: IDifficulty;
  ongoing?: IOngoingSessionV3;
  lastPlayedTs: Date;
  maxScore: number;
  tsChangeLogs?: ITrueSkillChangeLogEntry[];
}

const DifficultySchema = new Schema<IDifficulty>({
  mu: { type: Number, required: true },
  sigma: { type: Number, required: true }
}, { _id: false });

const UserChapterSessionSchema = new Schema<IUserChapterSession>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  trueSkillScore: {
    type: DifficultySchema,
    required: false,
  },
  chapterId: {
    type: Schema.Types.ObjectId,
    ref: 'Chapter',
    required: true
  },
  lastPlayedTs: {
    type: Date,
    required: true,
    default: () => new Date()
  },
  ongoing: {
    type: ongoingSchemaV3,
    required: false,
  },
  tsChangeLogs: {
    type: [new Schema<ITrueSkillChangeLogEntry>({
      timestamp: { type: Date, required: true, default: () => new Date() },
      questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
      userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      isCorrect: { type: Boolean, required: true },
      beforeUts: { type: { mu: Number, sigma: Number }, required: true },
      beforeQts: { type: { mu: Number, sigma: Number }, required: true },
      afterUts: { type: { mu: Number, sigma: Number }, required: true },
      afterQts: { type: { mu: Number, sigma: Number }, required: true },
    }, { _id: false })],
    default: []
  },
  maxScore: {
    type: Number,
    required: true,
    default: 0
  }
});

const UserChapterSession = mongoose.model<IUserChapterSession>('UserChapterSession', UserChapterSessionSchema);

export type UserChapterSessionType = typeof UserChapterSession;

export default UserChapterSession;

