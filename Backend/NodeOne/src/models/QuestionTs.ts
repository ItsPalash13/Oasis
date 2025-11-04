import mongoose, { Schema, Document } from 'mongoose';

interface IDifficulty {
  mu: number;    // Mean of the difficulty rating
  sigma: number; // Standard deviation of the difficulty rating
}

interface IQuestionTs extends Document {
  quesId: mongoose.Types.ObjectId;
  difficulty: IDifficulty;
  xp: {correct: number, incorrect: number};
}

const DifficultySchema = new Schema<IDifficulty>({
  mu: { type: Number, required: true, },
  sigma: { type: Number, required: true, }
}, { _id: false });  // Disable _id for difficulty subdocument

const QuestionTsSchema = new Schema<IQuestionTs>({
  quesId: { 
    type: Schema.Types.ObjectId, 
    required: true,
    ref: 'Question'  // Reference to the Question model
  },
  difficulty: { 
    type: DifficultySchema, 
    required: true 
  },
  xp: {
    type: {correct: Number, incorrect: Number},
    required: true,
    default: {correct: 0, incorrect: 0}
  }
});

const QuestionTs = mongoose.model<IQuestionTs>('QuestionsTs', QuestionTsSchema);

export { QuestionTs, IQuestionTs, IDifficulty };
