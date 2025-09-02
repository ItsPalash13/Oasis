import mongoose, { Schema, Document } from 'mongoose';

export interface IExam extends Document {
    name: string;
    description: string;
    topics: mongoose.Types.ObjectId[];
    status: boolean;
    chapterIds: mongoose.Types.ObjectId[];
    type: 'org_exam_mode';
    questionBank: Array<{
        quesId: mongoose.Types.ObjectId;
        ques: string;
        options: string[];
        correct: number;
        quesImage: string;
        solution: string;
        solutionType: string;
        topics: Array<{ id: mongoose.Types.ObjectId | string; name: string }>;
    }>;
}