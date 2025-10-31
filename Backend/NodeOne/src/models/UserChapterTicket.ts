import mongoose, { Schema, Document } from 'mongoose';

interface IDifficulty {
  mu: number;    // Mean of the difficulty rating
  sigma: number; // Standard deviation of the difficulty rating
}

interface IUserChapterTicket extends Document {
    userId: mongoose.Types.ObjectId;
    chapterId: mongoose.Types.ObjectId;
    trueSkillScore? : IDifficulty;
    ongoing: {
        questionsAttempted?: number;
        questionsCorrect?: number;
        questionsIncorrect?: number;
        currentStreak?: number; //
        lastAttemptedQuestionId?: mongoose.Types.ObjectId;
        currentQuestionId?: mongoose.Types.ObjectId;
        currentScore?: number;
        heartsLeft: number
    };
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
    ongoing: {
        currentQuestionId: {
            type: Schema.Types.ObjectId,
            ref: 'Question',
            required: false
        },
        lastAttemptedQuestionId: {
            type: Schema.Types.ObjectId,
            ref: 'Question',
            required: false,
        },
        questionsAttempted: {
            type: Number,
            required: false
        },
        questionsCorrect: {
            type: Number,
            required: false
        },
        questionsIncorrect: {
            type: Number,
            required: false
        },
        currentStreak: {
            type: Number,
            required: false
        },  
        currentScore: {
            type: Number,
            required: false
        },
        heartsLeft: {
            type: Number,
            required: false
        }
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

export default UserChapterTicket;
