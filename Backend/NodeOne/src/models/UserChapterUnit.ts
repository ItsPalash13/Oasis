import mongoose, { Schema, Document } from 'mongoose';

interface IUserChapterUnit extends Document {
    userId: mongoose.Types.ObjectId;
    chapterId: mongoose.Types.ObjectId;
    unitId: mongoose.Types.ObjectId;
    status: 'not_started' | 'in_progress' | 'completed';
}

const UserChapterUnitSchema = new Schema<IUserChapterUnit>({
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
    unitId: {
        type: Schema.Types.ObjectId,
        ref: 'Unit',
        required: true
    },
    status: {
        type: String,
        enum: ['not_started', 'in_progress', 'completed'],     
        default: 'not_started'
    }
});

export const UserChapterUnit = mongoose.model<IUserChapterUnit>('UserChapterUnit', UserChapterUnitSchema);
