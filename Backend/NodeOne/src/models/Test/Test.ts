import mongoose, { Schema, Document } from 'mongoose';

export interface ITest extends Document {
    name: string;
    description: string;
    type: 'org_exam_mode';
    status: 'draft' | 'active' | 'inactive';
    questionBank: mongoose.Types.ObjectId[];
    orgId: mongoose.Types.ObjectId;
}

const TestSchema = new Schema<ITest>({
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
    type: { 
        type: String, 
        required: true,
        enum: ['org_exam_mode'],
        default: 'org_exam_mode'
    },
    status: { 
        type: String, 
        required: true,
        enum: ['draft', 'active', 'inactive'],
        default: 'draft'
    },
    questionBank: [{
        type: Schema.Types.ObjectId,
        ref: 'Questions',
        required: true
    }],
    orgId: {
        type: Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    }
}, { timestamps: true });

// Indexes for faster queries
TestSchema.index({ orgId: 1 });
TestSchema.index({ status: 1 });
TestSchema.index({ type: 1 });

export const Test = mongoose.model<ITest>('Test', TestSchema);