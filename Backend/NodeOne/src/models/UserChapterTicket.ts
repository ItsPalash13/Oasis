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
        currentQuestionId: mongoose.Types.ObjectId;
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
            required: true
        },
        lastAttemptedQuestionId: {
            type: Schema.Types.ObjectId,
            ref: 'Question',
            required: false,
        },
        questionsAttempted: {
            type: Number,
            required: true
        },
        questionsCorrect: {
            type: Number,
            required: true 
        },
        questionsIncorrect: {
            type: Number,
            required: true
        },
        currentStreak: {
            type: Number,
            required: true
        },  
        currentScore: {
            type: Number,
            required: true
        },
        heartsLeft: {
            type: Number,
            required: true
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
