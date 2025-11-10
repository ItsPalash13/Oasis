import mongoose, { Schema, Document } from 'mongoose';

interface IDifficulty {
  mu: number;    // Mean of the difficulty rating
  sigma: number; // Standard deviation of the difficulty rating
}

export interface IOngoingSession {
  _id?: mongoose.Types.ObjectId;
  questionsAttempted: number;
  questionsCorrect: number;
  questionsIncorrect: number;
  currentStreak: number;
  questionsAttemptedList: Array<mongoose.Types.ObjectId>;
  questionPool: Array<mongoose.Types.ObjectId>;
  lastAttemptedQuestionId: mongoose.Types.ObjectId;
  currentQuestionId: mongoose.Types.ObjectId;
  currentScore: number;
  heartsLeft: number;
  maxScoreReached: boolean;
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

const ongoingSchema = new Schema<IOngoingSession>({
  _id: { type: Schema.Types.ObjectId , auto: true, unique: true}, 
  questionsAttempted: { type: Number, default: 0 },
  questionsCorrect: { type: Number, default: 0 },
  questionsIncorrect: { type: Number, default: 0 },
  currentStreak: { type: Number, default: 0 },
  questionPool: [{ type: Schema.Types.ObjectId, ref: "Question" }],
  questionsAttemptedList: [{ type: Schema.Types.ObjectId, ref: "Question" }],
  lastAttemptedQuestionId: { type: Schema.Types.ObjectId, ref: "Question" },
  currentQuestionId: { type: Schema.Types.ObjectId, ref: "Question" },
  currentScore: { type: Number, default: 0 },
  heartsLeft: { type: Number, required: true, default: 3 },
  maxScoreReached: { type: Boolean, default: false },
}, { _id: true }); 


export interface IUserChapterTicket extends Document {
    userId: mongoose.Types.ObjectId;
    chapterId: mongoose.Types.ObjectId;
    trueSkillScore? : IDifficulty;
    ongoing: IOngoingSession;
    maxStreak: number;
    maxScore: number;
    tsChangeLogs?: ITrueSkillChangeLogEntry[];
}

const DifficultySchema = new Schema<IDifficulty>({
  mu: { type: Number, required: true},
  sigma: { type: Number, required: true}
}, { _id: false });  // Disable _id for difficulty subdocument


const UserChapterTicketSchema = new Schema<IUserChapterTicket>({
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
    ongoing: ongoingSchema,
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
    maxStreak: {
        type: Number,
        required: true
    },
    maxScore: {
        type: Number,
        required: true
    }
});

const UserChapterTicket = mongoose.model<IUserChapterTicket>('UserChapterTicket', UserChapterTicketSchema);

export type UserChapterTicketType = typeof UserChapterTicket;

export default UserChapterTicket;
