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
  lastAttemptedQuestionId: mongoose.Types.ObjectId;
  currentQuestionId: mongoose.Types.ObjectId;
  currentScore: number;
  heartsLeft: number;
}

const ongoingSchema = new Schema<IOngoingSession>({
  _id: { type: Schema.Types.ObjectId , auto: true, unique: true}, 
  questionsAttempted: { type: Number, default: 0 },
  questionsCorrect: { type: Number, default: 0 },
  questionsIncorrect: { type: Number, default: 0 },
  currentStreak: { type: Number, default: 0 },
  lastAttemptedQuestionId: { type: Schema.Types.ObjectId, ref: "Question" },
  currentQuestionId: { type: Schema.Types.ObjectId, ref: "Question" },
  currentScore: { type: Number, default: 0 },
  heartsLeft: { type: Number, required: true, default: 3 },
}, { _id: true }); 


interface IUserChapterTicket extends Document {
    userId: mongoose.Types.ObjectId;
    chapterId: mongoose.Types.ObjectId;
    trueSkillScore? : IDifficulty;
    ongoing: IOngoingSession;
    maxStreak: number;
    maxScore: number;
}

const DifficultySchema = new Schema<IDifficulty>({
  mu: { type: Number, required: true, default: 936 },
  sigma: { type: Number, required: true, default: 200 }
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
        default: {mu: 936, sigma: 200}
    },
    chapterId: {
        type: Schema.Types.ObjectId,
        ref: 'Chapter',
        required: true
    }, 
    ongoing: ongoingSchema,
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

export default UserChapterTicket;
