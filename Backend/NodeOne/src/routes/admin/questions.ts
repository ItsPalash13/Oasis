import express from 'express';
import { Question } from '../../models/Questions';
import { QuestionTs } from '../../models/QuestionTs';
import { Chapter } from '../../models/Chapter';
import { Topic } from '../../models/Topic';
import { Unit } from '../../models/Units';
import mongoose from 'mongoose';
import { Request, Response } from 'express';
import multer from 'multer';
import { uploadBufferToBucket } from '../../utils/gcp';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Number(process.env.MAX_UPLOAD_BYTES) || 10 * 1024 * 1024 }
});

// Create question
router.post('/', async (req: Request, res: Response) => {
  try {
    const { ques, options, correct, chapterId, unitId, topics, xpCorrect, xpIncorrect, mu, sigma, solution } = req.body;

    // Validate required fields
    if (!ques || !options || correct === undefined || !chapterId) {
      return res.status(400).json({ error: 'Question text, options, correct answer, and chapter are required' });
    }

    if (!Array.isArray(options) || options.length !== 4) {
      return res.status(400).json({ error: 'Exactly 4 options are required' });
    }

    if (correct < 0 || correct > 3) {
      return res.status(400).json({ error: 'Correct answer must be 0, 1, 2, or 3' });
    }

    // Validate chapter exists
    const chapter = await Chapter.findById(chapterId);
    if (!chapter) {
      return res.status(404).json({ error: 'Chapter not found' });
    }

    // Validate unit exists if provided
    if (unitId) {
      const unit = await Unit.findById(unitId);
      if (!unit) {
        return res.status(404).json({ error: 'Unit not found' });
      }
    }

    // Create question
    const question = new Question({
      ques,
      options,
      correct,
      chapterId: new mongoose.Types.ObjectId(chapterId),
      unitId: unitId ? new mongoose.Types.ObjectId(unitId) : undefined,
      topics: topics || [],
      solution: solution || ''
    });

    const savedQuestion = await question.save();

    // Create QuestionTs entry if difficulty or XP values provided
    if (mu !== undefined || sigma !== undefined || xpCorrect !== undefined || xpIncorrect !== undefined) {
      const questionTs = new QuestionTs({
        quesId: savedQuestion._id,
        difficulty: {
          mu: mu || 0,
          sigma: sigma || 1
        },
        xp: {
          correct: xpCorrect || 2,
          incorrect: xpIncorrect || 0
        }
      });
      await questionTs.save();
    }

    return res.status(201).json(savedQuestion);

  } catch (error) {
    console.error('Error creating question:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Multi-add questions endpoint
router.post('/multi-add', async (req: Request, res: Response) => {
  try {
    const { questions, chapterId, unitId, topicIds, xpCorrect, xpIncorrect, mu, sigma } = req.body;

    // Validate required fields
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Questions array is required and must not be empty' });
    }

    if (!chapterId) {
      return res.status(400).json({ error: 'Chapter ID is required' });
    }

    if (!topicIds || !Array.isArray(topicIds) || topicIds.length === 0) {
      return res.status(400).json({ error: 'Topic IDs array is required and must not be empty' });
    }

    if (typeof xpCorrect !== 'number' || typeof xpIncorrect !== 'number') {
      return res.status(400).json({ error: 'XP values must be numbers' });
    }

    if (typeof mu !== 'number' || typeof sigma !== 'number') {
      return res.status(400).json({ error: 'Mu and sigma values must be numbers' });
    }

    // Validate chapter exists
    const chapter = await Chapter.findById(chapterId);
    if (!chapter) {
      return res.status(404).json({ error: 'Chapter not found' });
    }

    // Validate unit exists if provided
    if (unitId) {
      const unit = await Unit.findById(unitId);
      if (!unit) {
        return res.status(404).json({ error: 'Unit not found' });
      }
    }

    // Validate topics exist and get their names
    const topics = await Topic.find({ _id: { $in: topicIds } });
    if (topics.length !== topicIds.length) {
      return res.status(404).json({ error: 'Some topics not found' });
    }

    const topicMap = topics.reduce((acc, topic) => {
      acc[String(topic._id)] = topic.topic;
      return acc;
    }, {} as Record<string, string>);

    const createdQuestions = [];
    const createdQuestionTs = [];

    // Process each question
    for (const questionData of questions) {
      if (!Array.isArray(questionData) || questionData.length < 6) {
        return res.status(400).json({ 
          error: `Invalid question format. Expected array with at least 6 elements: [question, option1, option2, option3, option4, correctIndex] or 7 elements with solution: [question, option1, option2, option3, option4, correctIndex, solution]` 
        });
      }

      const [questionText, option1, option2, option3, option4, correctIndex, solution] = questionData;

      // Validate question data
      if (typeof questionText !== 'string' || questionText.trim() === '') {
        return res.status(400).json({ error: 'Question text is required' });
      }

      if (![option1, option2, option3, option4].every(opt => typeof opt === 'string' && opt.trim() !== '')) {
        return res.status(400).json({ error: 'All options must be non-empty strings' });
      }

      if (typeof correctIndex !== 'number' || correctIndex < 0 || correctIndex > 3) {
        return res.status(400).json({ error: 'Correct index must be 0, 1, 2, or 3' });
      }

      // Create question
      const question = new Question({
        ques: questionText.trim(),
        options: [option1.trim(), option2.trim(), option3.trim(), option4.trim()],
        correct: correctIndex,
        chapterId: new mongoose.Types.ObjectId(chapterId),
        unitId: unitId ? new mongoose.Types.ObjectId(unitId) : undefined,
        topics: topicIds.map(id => ({
          id: new mongoose.Types.ObjectId(id),
          name: topicMap[id]
        })),
        solution: solution ? solution.trim() : ''
      });

      const savedQuestion = await question.save();
      createdQuestions.push(savedQuestion);

      // Create QuestionTs entry
      const questionTs = new QuestionTs({
        quesId: savedQuestion._id,
        difficulty: {
          mu: mu,
          sigma: sigma
        },
        xp: {
          correct: xpCorrect,
          incorrect: xpIncorrect
        }
      });

      const savedQuestionTs = await questionTs.save();
      createdQuestionTs.push(savedQuestionTs);
    }

    return res.status(201).json({
      message: `Successfully created ${createdQuestions.length} questions`,
      questions: createdQuestions,
      questionTs: createdQuestionTs
    });

  } catch (error) {
    console.error('Error in multi-add questions:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload and attach image to a specific question
router.post('/:id/image', upload.single('file'), async (req: Request & { file?: Express.Multer.File }, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid question ID' });
    }

    const question = await Question.findById(id);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Use form field name "file"' });
    }

    const file = req.file as Express.Multer.File;

    const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const originalExt = safeOriginalName.includes('.') ? `.${safeOriginalName.split('.').pop()?.toLowerCase()}` : '';
    const mimeToExt: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif'
    };
    const mimeExt = mimeToExt[file.mimetype] || '';
    const finalExt = originalExt || mimeExt || '.png';
    // Fixed destination so uploads overwrite the same object for this question
    const destination = `questions-images/${id}/question${finalExt}`;

    const { publicUrl } = await uploadBufferToBucket(file.buffer, destination, {
      makePublic: true,
      contentType: file.mimetype,
      bucketName: process.env.GCP_BUCKET_NAME,
    });

    question.quesImage = publicUrl;
    await question.save();

    return res.status(200).json({
      message: 'Image uploaded and attached successfully',
      quesImage: publicUrl,
      questionId: id,
    });
  } catch (error: any) {
    console.error('Error uploading question image:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all questions
router.get('/', async (req: Request, res: Response) => {
  try {
    const { chapterId, unitId, topicId } = req.query;

    let query: any = {};
    
    if (chapterId) {
      query.chapterId = chapterId;
    }

    if (unitId) {
      query.unitId = unitId;
    }

    if (topicId) {
      query['topics.id'] = topicId;
    }

    const questions = await Question.find(query)
      .populate('chapterId', 'name')
      .populate('unitId', 'name')
      .sort({ createdAt: -1 });

    // Get QuestionTs data for each question
    const questionIds = questions.map(q => q._id);
    const questionTsData = await QuestionTs.find({ quesId: { $in: questionIds } });
    
    // Create a map for quick lookup
    const questionTsMap = questionTsData.reduce((acc, qt) => {
      acc[String(qt.quesId)] = qt;
      return acc;
    }, {} as Record<string, any>);

    // Attach QuestionTs data to questions (no URL rewriting)
    const questionsWithTs = questions.map(question => ({
      ...question.toObject(),
      questionTs: questionTsMap[String(question._id)]
    }));

    return res.json({
      data: questionsWithTs
    });

  } catch (error) {
    console.error('Error fetching questions:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get question by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const question = await Question.findById(req.params.id)
      .populate('chapterId', 'name')
      .populate('unitId', 'name')
      .populate('topics.id', 'name');

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    return res.json(question);

  } catch (error) {
    console.error('Error fetching question:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Update question
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { ques, options, correct, chapterId, unitId, topics, xpCorrect, xpIncorrect, mu, sigma, solution } = req.body;

    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Update question
    if (ques) question.ques = ques;
    if (options) question.options = options;
    if (correct !== undefined) question.correct = correct;
    if (chapterId) question.chapterId = chapterId;
    if (unitId !== undefined) question.unitId = unitId || null;
    if (topics) question.topics = topics;
    if (solution !== undefined) question.solution = solution;

    await question.save();

    // Update QuestionTs if difficulty or XP values provided
    if (mu !== undefined || sigma !== undefined || xpCorrect !== undefined || xpIncorrect !== undefined) {
      const questionTs = await QuestionTs.findOne({ quesId: question._id });
      
      if (questionTs) {
        if (mu !== undefined) questionTs.difficulty.mu = mu;
        if (sigma !== undefined) questionTs.difficulty.sigma = sigma;
        if (xpCorrect !== undefined) questionTs.xp.correct = xpCorrect;
        if (xpIncorrect !== undefined) questionTs.xp.incorrect = xpIncorrect;
        await questionTs.save();
      }
    }

    return res.json(question);

  } catch (error) {
    console.error('Error updating question:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete question
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Delete associated QuestionTs
    await QuestionTs.deleteOne({ quesId: question._id });

    // Delete question
    await Question.findByIdAndDelete(req.params.id);

    return res.json({ message: 'Question deleted successfully' });

  } catch (error) {
    console.error('Error deleting question:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get mu for all questions by topics
router.post('/mu-by-topics', async (req: Request, res: Response) => {
  try {
    const { topics } = req.body; // topics: array of topic IDs
    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      return res.status(400).json({ success: false, error: 'topics array required' });
    }
    
    // Use MongoDB aggregation to efficiently filter questions
    // Questions must have at least one topic from selected topics AND no topics outside selected topics
    const questions = await Question.aggregate([
      {
        $match: {
          'topics': { $exists: true, $ne: [] }, // Questions must have topics
          'topics.id': { $in: topics.map(id => new mongoose.Types.ObjectId(id)) } // At least one topic from selected
        }
      },
      {
        $addFields: {
          // Check if ALL question topics are in the selected topics
          allTopicsInSelected: {
            $reduce: {
              input: '$topics',
              initialValue: true,
              in: {
                $and: [
                  '$$value',
                  { $in: ['$$this.id', topics.map(id => new mongoose.Types.ObjectId(id))] }
                ]
              }
            }
          }
        }
      },
      {
        $match: {
          allTopicsInSelected: true // Only questions where ALL topics are in selected
        }
      },
      {
        $project: {
          _id: 1,
          ques: 1,
          options: 1,
          correct: 1,
          topics: 1
        }
      }
    ]);
    
    const quesIds = questions.map(q => q._id);
    
    // Get mu for each filtered question
    const questionTs = await QuestionTs.find({ quesId: { $in: quesIds } }).select('quesId difficulty.mu');
    
    // Create a map for quick lookup
    const questionTsMap = questionTs.reduce((acc, qt) => {
      acc[String(qt.quesId)] = qt.difficulty.mu;
      return acc;
    }, {} as Record<string, number>);

    // Combine question data with mu values and include topics
    const questionsWithMu = questions.map(question => ({
      quesId: question._id,
      ques: question.ques,
      options: question.options,
      correct: question.correct,
      topics: question.topics, // Include the question topics
      mu: questionTsMap[String(question._id)] || null
    }));

    return res.json({ success: true, data: questionsWithMu });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
