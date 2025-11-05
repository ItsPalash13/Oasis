import mongoose, { Schema, Document } from 'mongoose';

interface IDifficulty {
  mu: number;    // Mean of the difficulty rating
  sigma: number; // Standard deviation of the difficulty rating
}

interface IQuestionTs extends Document {
  quesId: mongoose.Types.ObjectId;
  difficulty: IDifficulty;
  xp: {correct: number, incorrect: number};
  tsChangeLogs?: Array<{
    timestamp: Date;
    questionId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    isCorrect: boolean;
    beforeUts: { mu: number; sigma: number };
    beforeQts: { mu: number; sigma: number };
    afterUts: { mu: number; sigma: number };
    afterQts: { mu: number; sigma: number };
  }>;
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
  },
  tsChangeLogs: {
    type: [new Schema({
      timestamp: { type: Date, required: true, default: () => new Date() },
      questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
      userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      isCorrect: { type: Boolean, required: true },
      beforeUts: { type: { mu: Number, sigma: Number }, required: true },
      beforeQts: { type: { mu: Number, sigma: Number }, required: true },
      afterUts: { type: { mu: Number, sigma: Number }, required: true },
      afterQts: { type: { mu: Number, sigma: Number }, required: true },
    }, { _id: false })],
    default: []
  }
});

const QuestionTs = mongoose.model<IQuestionTs>('QuestionsTs', QuestionTsSchema);

export { QuestionTs, IQuestionTs, IDifficulty };
