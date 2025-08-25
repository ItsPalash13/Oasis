import mongoose, { Schema, Document } from 'mongoose';

// Section Schema
interface ISection extends Document {
    name: string;
    description: string;
    status: boolean;
    chapterId: mongoose.Types.ObjectId;
    sectionNumber: number;
    topics: mongoose.Types.ObjectId[];
}

const SectionSchema = new Schema<ISection>({    
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: Boolean,
        default: true
    },
    sectionNumber: {
        type: Number,
        required: true,
        min: 1
    },
    chapterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chapter',
        required: true
    },
    topics: {
        type: [Schema.Types.ObjectId],
        ref: 'Topic',
        required: true
    }
});

export const Section = mongoose.model<ISection>('Section', SectionSchema);
