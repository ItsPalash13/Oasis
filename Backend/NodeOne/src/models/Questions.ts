import mongoose, { Schema, Document } from 'mongoose';

interface IQuestionImage {
  url: string;
  caption: string;
  width: number;
  height: number;
  lockRatio: boolean;
  originalRatio: number;
}

interface IQuestion extends Document {
  ques?: string;
  status: -1 | 0 | 1 ;
  options: (string | undefined)[];
  correct: number[];
  quesImages?: IQuestionImage[];
  optionImages?: IQuestionImage[][];
  solutionImages?: IQuestionImage[];
  gridSize?: { xs: number; sm: number; md: number };
  solution: string;
  quesType?: 'current' | 'html';
  optionsType?: 'current' | 'html';
  solutionType?: 'current' | 'html';
  chapterId: mongoose.Types.ObjectId; 
  sectionId?: mongoose.Types.ObjectId;
  topics: Array<{ id: mongoose.Types.ObjectId | string; name: string }>;
}

const QuestionSchema = new Schema<IQuestion>({
  ques: { 
    type: String, 
    required: false 
  },
  status: {
    type: Number,
    default: 0,
  },
  options: [{ 
    type: String, 
    required: false 
  }],
  correct: [{ 
    type: Number, 
    required: true,
    min: 0,
    max: 3  // Since options are 0-based index
  }],
  quesImages: [{
    url: {
      type: String,
    },
    caption: {
      type: String,
    },
    width: {
      type: Number,
    },
    height: {
      type: Number,
    },
    lockRatio: {
      type: Boolean,
    },
    originalRatio: {
      type: Number,
    }
  }],
  optionImages: [[{
    url: {
      type: String,
    },
    caption: {
      type: String,
    },
    width: {
      type: Number,
    },
    height: {
      type: Number,
    },
    lockRatio: {
      type: Boolean,
    },
    originalRatio: {
      type: Number,
    }
  }]],
  solutionImages: [{
    url: {
      type: String,
    },
    caption: {
      type: String,
    },
    width: {
      type: Number,
    },
    height: {
      type: Number,
    },
    lockRatio: {
      type: Boolean,
    },
    originalRatio: {
      type: Number,
    }
  }],
  gridSize: {
    xs: {
      type: Number,
      default: 12
    },
    sm: {
      type: Number,
      default: 6
    },
    md: {
      type: Number,
      default: 3
    }
  },
  solution: {
    type: String
  },
  quesType: {
    type: String,
    enum: ['current', 'html'],
    default: 'current'
  },
  optionsType: {
    type: String,
    enum: ['current', 'html'],
    default: 'current'
  },
  solutionType: {
    type: String,
    enum: ['current', 'html'],
    default: 'current'
  },
  chapterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chapter',
    required: true
  },
  sectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section'
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
