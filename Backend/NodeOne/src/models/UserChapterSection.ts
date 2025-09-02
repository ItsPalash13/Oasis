import mongoose, { Schema, Document } from 'mongoose';

interface IUserChapterSection extends Document {
    userId: mongoose.Types.ObjectId;
    chapterId: mongoose.Types.ObjectId;
    sectionId: mongoose.Types.ObjectId;
    status: 'not_started' | 'in_progress' | 'completed';
    correctQuestions: mongoose.Types.ObjectId[];
    wrongQuestions: mongoose.Types.ObjectId[];
}

const UserChapterSectionSchema = new Schema<IUserChapterSection>({
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
    sectionId: {
        type: Schema.Types.ObjectId,
        ref: 'Section',
        required: true
    },
    status: {
        type: String,
        enum: ['not_started', 'in_progress', 'completed'],     
        default: 'not_started'
    },
    correctQuestions: {
        type: [Schema.Types.ObjectId],
        ref: 'Question',
        default: []
    },
    wrongQuestions: {
        type: [Schema.Types.ObjectId],
        ref: 'Question',
        default: []
    }
});

export const UserChapterSection = mongoose.model<IUserChapterSection>('UserChapterSection', UserChapterSectionSchema);
