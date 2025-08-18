import mongoose, { Schema, Document } from 'mongoose';

interface IQuestion extends Document {
  ques: string;
  options: string[];
  correct: number;
  quesImage: string;
  solution: string;
  solutionType: string;
  chapterId: mongoose.Types.ObjectId; 
  unitId?: mongoose.Types.ObjectId;
  topics: Array<{ id: mongoose.Types.ObjectId | string; name: string }>;
}

const QuestionSchema = new Schema<IQuestion>({
  ques: { 
    type: String, 
    required: true 
  },
  options: [{ 
    type: String, 
    required: true 
  }],
  correct: { 
    type: Number, 
    required: true,
    min: 0,
    max: 3  // Since options are 0-based index
  },
  quesImage: {
    type: String,
    required: false
  },
  solution: {
    type: String
  },
  solutionType: {
    type: String,
    required: true,
    enum: ['text', 'latex']
  },
    chapterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chapter',
    required: true
  },
  unitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit'
  },
  topics: [{
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Topic',
      required: true
    },
    name: {
      type: String,
      required: true
    }
  }]
});

const Question = mongoose.model<IQuestion>('Question', QuestionSchema);

export { Question, IQuestion };
