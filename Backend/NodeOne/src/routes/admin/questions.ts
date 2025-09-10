import express from 'express';
import { Question } from '../../models/Questions';
import { QuestionTs } from '../../models/QuestionTs';
import { Chapter } from '../../models/Chapter';
import { Topic } from '../../models/Topic';
import { Section } from '../../models/Section';
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
router.post('/', upload.array('files'), async (req: Request, res: Response) => {
  try {
    const { 
      ques, options, correct, chapterId, sectionId, topics, 
      xpCorrect, xpIncorrect, mu, sigma, solution,
      quesImages, optionImages, solutionImages, gridSize
    } = JSON.parse(req.body.data);

    // Validate required fields
    if (!options || correct === undefined || !chapterId) {
      return res.status(400).json({ error: 'Options, correct answer, and chapter are required' });
    }

    // Validate that question has content (either text or images)
    const hasQuestionText = ques && ques.trim() !== '';
    const hasQuestionImages = quesImages && Array.isArray(quesImages) && quesImages.some(img => 
      (img.url && img.url.trim() !== '') || (img.existingUrl && img.existingUrl.trim() !== '') || img.isModified
    );
    
    if (!hasQuestionText && !hasQuestionImages) {
      return res.status(400).json({ error: 'Question must have either text content or images' });
    }

    // Validate that all options have content (either text or images)
    for (let i = 0; i < options.length; i++) {
      const option = options[i];
      const hasOptionText = option && option.trim() !== '';
      const hasOptionImages = optionImages && Array.isArray(optionImages) && 
        Array.isArray(optionImages[i]) && optionImages[i].some((img: any) => 
          (img.url && img.url.trim() !== '') || (img.existingUrl && img.existingUrl.trim() !== '') || img.isModified
        );
      
      if (!hasOptionText && !hasOptionImages) {
        return res.status(400).json({ error: `Option ${i + 1} must have either text content or images` });
      }
    }

    if (!Array.isArray(options) || options.length !== 4) {
      return res.status(400).json({ error: 'Exactly 4 options are required' });
    }

    // Validate correct answers - can be single number or array
    const correctAnswers = Array.isArray(correct) ? correct : [correct];
    if (!correctAnswers.every(ans => ans >= 0 && ans <= 3)) {
      return res.status(400).json({ error: 'Correct answers must be 0, 1, 2, or 3' });
    }

    // Validate chapter exists
    const chapter = await Chapter.findById(chapterId);
    if (!chapter) {
      return res.status(404).json({ error: 'Chapter not found' });
    }

    // Validate section exists if provided
    if (sectionId) {
      const section = await Section.findById(sectionId);
      if (!section) {
        return res.status(404).json({ error: 'Section not found' });
      }
    }

    // Validate topics if provided
    if (topics && Array.isArray(topics)) {
      for (const topic of topics) {
        if (!topic.id || !topic.name) {
          return res.status(400).json({ error: 'Each topic must have both id and name fields' });
        }
        // Validate topic exists
        const topicExists = await Topic.findById(topic.id);
        if (!topicExists) {
          return res.status(404).json({ error: `Topic with id ${topic.id} not found` });
        }
      }
    }

    // Create question first to get the ID for organizing images
    const question = new Question({
      ques,
      options,
      correct,
      chapterId: new mongoose.Types.ObjectId(chapterId),
      sectionId: sectionId ? new mongoose.Types.ObjectId(sectionId) : undefined,
      topics: topics || [],
      solution: solution || '',
      quesImages: quesImages || [],
      optionImages: optionImages || [[], [], [], []],
      solutionImages: solutionImages || [],
      gridSize: gridSize || { xs: 12, sm: 6, md: 3 }
    });

    const savedQuestion = await question.save();
    const questionId = (savedQuestion._id as mongoose.Types.ObjectId).toString();

    // Handle file uploads with organized folder structure
    const uploadedFiles = (req.files || []) as Express.Multer.File[];
    let fileIndex = 0;
    const uploadedImages: Array<{
      originalName: string;
      url: string;
      type: 'question' | 'solution' | 'option';
      index?: number;
      optionIndex?: number;
      imageIndex?: number;
    }> = [];

    // Process question images first
    if (quesImages && Array.isArray(quesImages)) {
      for (let i = 0; i < quesImages.length; i++) {
        const img = quesImages[i];
        if (img.isModified && uploadedFiles[fileIndex]) {
          const file = uploadedFiles[fileIndex];
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
          
          const destination = `questions-images/${questionId}/questionImages/question_${i}${finalExt}`;

          const { publicUrl } = await uploadBufferToBucket(file.buffer, destination, {
            makePublic: true,
            contentType: file.mimetype,
            bucketName: process.env.GCP_BUCKET_NAME,
          });

          uploadedImages.push({
            originalName: file.originalname,
            url: publicUrl,
            type: 'question',
            index: i
          });
          fileIndex++;
        }
      }
    }

    // Process solution images
    if (solutionImages && Array.isArray(solutionImages)) {
      for (let i = 0; i < solutionImages.length; i++) {
        const img = solutionImages[i];
        if (img.isModified && uploadedFiles[fileIndex]) {
          const file = uploadedFiles[fileIndex];
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
          
          const destination = `questions-images/${questionId}/solutionImages/solution_${i}${finalExt}`;

          const { publicUrl } = await uploadBufferToBucket(file.buffer, destination, {
            makePublic: true,
            contentType: file.mimetype,
            bucketName: process.env.GCP_BUCKET_NAME,
          });

          uploadedImages.push({
            originalName: file.originalname,
            url: publicUrl,
            type: 'solution',
            index: i
          });
          fileIndex++;
        }
      }
    }

    // Process option images
    if (optionImages && Array.isArray(optionImages)) {
      for (let optIndex = 0; optIndex < optionImages.length; optIndex++) {
        const optImgs = optionImages[optIndex];
        for (let imgIndex = 0; imgIndex < optImgs.length; imgIndex++) {
          const img = optImgs[imgIndex];
          if (img.isModified && uploadedFiles[fileIndex]) {
            const file = uploadedFiles[fileIndex];
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
            
            const destination = `questions-images/${questionId}/optionImages/option_${optIndex}_${imgIndex}${finalExt}`;

            const { publicUrl } = await uploadBufferToBucket(file.buffer, destination, {
              makePublic: true,
              contentType: file.mimetype,
              bucketName: process.env.GCP_BUCKET_NAME,
            });

            uploadedImages.push({
              originalName: file.originalname,
              url: publicUrl,
              type: 'option',
              optionIndex: optIndex,
              imageIndex: imgIndex
            });
            fileIndex++;
          }
        }
      }
    }

    interface ImageData {
      file?: File | string;
      url?: string;
      caption: string;
      width: number;
      height: number;
      lockRatio: boolean;
      originalRatio: number;
      existingUrl?: string;
      isModified?: boolean;
    }

    // Process images with uploaded URLs
    let processedQuesImages = quesImages as ImageData[];
    let processedOptionImages = optionImages as ImageData[][];
    let processedSolutionImages = solutionImages as ImageData[];

    // Process question images
    if (quesImages && Array.isArray(quesImages)) {
      processedQuesImages = quesImages.map((img: ImageData, index: number) => {
        const uploadedImg = uploadedImages.find(uploaded => uploaded.type === 'question' && uploaded.index === index);
        if (uploadedImg) {
          return {
            caption: img.caption,
            width: img.width,
            height: img.height,
            lockRatio: img.lockRatio,
            originalRatio: img.originalRatio,
            url: uploadedImg.url
          };
        }
        // Keep existing URL if image wasn't modified
        if (!img.isModified && img.existingUrl) {
          return {
            caption: img.caption,
            width: img.width,
            height: img.height,
            lockRatio: img.lockRatio,
            originalRatio: img.originalRatio,
            url: img.existingUrl
          };
        }
        // Default empty image
        return {
          caption: img.caption,
          width: img.width,
          height: img.height,
          lockRatio: img.lockRatio,
          originalRatio: img.originalRatio,
          url: ''
        };
      });
    }

    // Process solution images
    if (solutionImages && Array.isArray(solutionImages)) {
      processedSolutionImages = solutionImages.map((img: ImageData, index: number) => {
        const uploadedImg = uploadedImages.find(uploaded => uploaded.type === 'solution' && uploaded.index === index);
        if (uploadedImg) {
          return {
            caption: img.caption,
            width: img.width,
            height: img.height,
            lockRatio: img.lockRatio,
            originalRatio: img.originalRatio,
            url: uploadedImg.url
          };
        }
        // Keep existing URL if image wasn't modified
        if (!img.isModified && img.existingUrl) {
          return {
            caption: img.caption,
            width: img.width,
            height: img.height,
            lockRatio: img.lockRatio,
            originalRatio: img.originalRatio,
            url: img.existingUrl
          };
        }
        // Default empty image
        return {
          caption: img.caption,
          width: img.width,
          height: img.height,
          lockRatio: img.lockRatio,
          originalRatio: img.originalRatio,
          url: ''
        };
      });
    }

    // Process option images
    if (optionImages && Array.isArray(optionImages)) {
      processedOptionImages = optionImages.map((optImgs: ImageData[], optIndex: number) => 
        optImgs.map((img: ImageData, imgIndex: number) => {
          const uploadedImg = uploadedImages.find(uploaded => 
            uploaded.type === 'option' && 
            uploaded.optionIndex === optIndex && 
            uploaded.imageIndex === imgIndex
          );
          if (uploadedImg) {
            return {
              caption: img.caption,
              width: img.width,
              height: img.height,
              lockRatio: img.lockRatio,
              originalRatio: img.originalRatio,
              url: uploadedImg.url
            };
          }
          // Keep existing URL if image wasn't modified
          if (!img.isModified && img.existingUrl) {
            return {
              caption: img.caption,
              width: img.width,
              height: img.height,
              lockRatio: img.lockRatio,
              originalRatio: img.originalRatio,
              url: img.existingUrl
            };
          }
          // Default empty image
          return {
            caption: img.caption,
            width: img.width,
            height: img.height,
            lockRatio: img.lockRatio,
            originalRatio: img.originalRatio,
            url: ''
          };
        })
      );
    }

    // Update the question with processed images
    savedQuestion.quesImages = processedQuesImages as any;
    savedQuestion.optionImages = processedOptionImages as any;
    savedQuestion.solutionImages = processedSolutionImages as any;
    await savedQuestion.save();

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
    const { questions, chapterId, sectionId, topicIds, xpCorrect, xpIncorrect, mu, sigma } = req.body;

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

    // Validate section exists if provided
    if (sectionId) {
      const section = await Section.findById(sectionId);
      if (!section) {
        return res.status(404).json({ error: 'Section not found' });
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

      // Handle both single and multiple correct answers
      const correctAnswers = Array.isArray(correctIndex) ? correctIndex : [correctIndex];
      if (!correctAnswers.every(ans => typeof ans === 'number' && ans >= 0 && ans <= 3)) {
        return res.status(400).json({ error: 'Correct answers must be 0, 1, 2, or 3' });
      }

      // Create question
      const question = new Question({
        ques: questionText.trim(),
        options: [option1.trim(), option2.trim(), option3.trim(), option4.trim()],
        correct: correctAnswers,
        chapterId: new mongoose.Types.ObjectId(chapterId),
        sectionId: sectionId ? new mongoose.Types.ObjectId(sectionId) : undefined,
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


// Get all questions
router.get('/', async (req: Request, res: Response) => {
  try {
    const { chapterId, sectionId, topicId } = req.query;

    let query: any = {};
    
    if (chapterId) {
      query.chapterId = chapterId;
    }

    if (sectionId) {
      query.sectionId = sectionId;
    }

    if (topicId) {
      query['topics.id'] = topicId;
    }

    const questions = await Question.find(query)
      .populate('chapterId', 'name')
      .populate('sectionId', 'name')
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
      .populate('sectionId', 'name')
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

// Bulk assign section to multiple questions
router.put('/bulk-assign-section', async (req: Request, res: Response) => {
  try {
    const { questionIds, sectionId, chapterId } = req.body;

    // Validate required fields
    if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({ error: 'Question IDs array is required and must not be empty' });
    }

    if (!chapterId) {
      return res.status(400).json({ error: 'Chapter ID is required' });
    }

    // Validate chapter exists
    const chapter = await Chapter.findById(chapterId);
    if (!chapter) {
      return res.status(404).json({ error: 'Chapter not found' });
    }

    // Validate section exists if provided
    if (sectionId) {
      const section = await Section.findById(sectionId);
      if (!section) {
        return res.status(404).json({ error: 'Section not found' });
      }
    }

    // Validate all questions exist and belong to the specified chapter
    const questions = await Question.find({ 
      _id: { $in: questionIds },
      chapterId: chapterId
    });

    if (questions.length !== questionIds.length) {
      return res.status(400).json({ 
        error: 'Some questions not found or do not belong to the specified chapter' 
      });
    }

    // Update all questions with the new section ID
    const updateResult = await Question.updateMany(
      { _id: { $in: questionIds } },
      { sectionId: sectionId || null }
    );

    return res.json({
      message: `Successfully assigned section to ${updateResult.modifiedCount} questions`,
      modifiedCount: updateResult.modifiedCount,
      sectionId: sectionId || null
    });

  } catch (error) {
    console.error('Error bulk assigning section:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Update question
router.put('/:id', upload.array('files'), async (req: Request, res: Response) => {
  try {
    console.log('PUT request body raw:', req.body);
    console.log('PUT request files:', req.files);
    console.log('Content-Type:', req.headers['content-type']);
    
    if (!req.body.data) {
      return res.status(400).json({ error: 'Missing data in request body' });
    }

    let parsedData;
    try {
      parsedData = JSON.parse(req.body.data);
      console.log('Successfully parsed data:', parsedData);
    } catch (error) {
      console.error('Error parsing data:', error);
      return res.status(400).json({ error: 'Invalid JSON data in request body' });
    }
    
    const { 
      ques, options, correct, chapterId, sectionId, topics, 
      xpCorrect, xpIncorrect, mu, sigma, solution,
      quesImages, optionImages, solutionImages, gridSize
    } = parsedData;
    
    console.log('Parsed data:', {
      ques, options, correct, chapterId, sectionId, topics,
      quesImages, optionImages, solutionImages
    });

    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Validate that question has content (either text or images) if updating
    if (ques !== undefined || quesImages !== undefined) {
      const hasQuestionText = ques && ques.trim() !== '';
      const hasQuestionImages = quesImages && Array.isArray(quesImages) && quesImages.some(img => 
        (img.url && img.url.trim() !== '') || (img.existingUrl && img.existingUrl.trim() !== '') || img.isModified
      );
      
      if (!hasQuestionText && !hasQuestionImages) {
        return res.status(400).json({ error: 'Question must have either text content or images' });
      }
    }

    // Validate that all options have content (either text or images) if updating
    if (options !== undefined || optionImages !== undefined) {
      for (let i = 0; i < options.length; i++) {
        const option = options[i];
        const hasOptionText = option && option.trim() !== '';
        const hasOptionImages = optionImages && Array.isArray(optionImages) && 
          Array.isArray(optionImages[i]) && optionImages[i].some((img: any) => 
            (img.url && img.url.trim() !== '') || (img.existingUrl && img.existingUrl.trim() !== '') || img.isModified
          );
        
        if (!hasOptionText && !hasOptionImages) {
          return res.status(400).json({ error: `Option ${i + 1} must have either text content or images` });
        }
      }
    }

    const questionId = (question._id as mongoose.Types.ObjectId).toString();

    // Handle file uploads with organized folder structure
    const uploadedFiles = (req.files || []) as Express.Multer.File[];
    let fileIndex = 0;
    const uploadedImages: Array<{
      originalName: string;
      url: string;
      type: 'question' | 'solution' | 'option';
      index?: number;
      optionIndex?: number;
      imageIndex?: number;
    }> = [];
    console.log(quesImages);

    // Process question images first
    if (quesImages && Array.isArray(quesImages)) {
      for (let i = 0; i < quesImages.length; i++) {
        const img = quesImages[i];
        if (img.isModified && uploadedFiles[fileIndex]) {
          const file = uploadedFiles[fileIndex];
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
          
          const destination = `questions-images/${questionId}/questionImages/question_${i}${finalExt}`;

          const { publicUrl } = await uploadBufferToBucket(file.buffer, destination, {
            makePublic: true,
            contentType: file.mimetype,
            bucketName: process.env.GCP_BUCKET_NAME,
          });

          uploadedImages.push({
            originalName: file.originalname,
            url: publicUrl,
            type: 'question',
            index: i
          });
          fileIndex++;
        }
      }
    }

    // Process solution images
    if (solutionImages && Array.isArray(solutionImages)) {
      for (let i = 0; i < solutionImages.length; i++) {
        const img = solutionImages[i];
        if (img.isModified && uploadedFiles[fileIndex]) {
          const file = uploadedFiles[fileIndex];
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
          
          const destination = `questions-images/${questionId}/solutionImages/solution_${i}${finalExt}`;

          const { publicUrl } = await uploadBufferToBucket(file.buffer, destination, {
            makePublic: true,
            contentType: file.mimetype,
            bucketName: process.env.GCP_BUCKET_NAME,
          });

          uploadedImages.push({
            originalName: file.originalname,
            url: publicUrl,
            type: 'solution',
            index: i
          });
          fileIndex++;
        }
      }
    }

    // Process option images
    if (optionImages && Array.isArray(optionImages)) {
      for (let optIndex = 0; optIndex < optionImages.length; optIndex++) {
        const optImgs = optionImages[optIndex];
        for (let imgIndex = 0; imgIndex < optImgs.length; imgIndex++) {
          const img = optImgs[imgIndex];
          if (img.isModified && uploadedFiles[fileIndex]) {
            const file = uploadedFiles[fileIndex];
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
            
            const destination = `questions-images/${questionId}/optionImages/option_${optIndex}_${imgIndex}${finalExt}`;

            const { publicUrl } = await uploadBufferToBucket(file.buffer, destination, {
              makePublic: true,
              contentType: file.mimetype,
              bucketName: process.env.GCP_BUCKET_NAME,
            });

            uploadedImages.push({
              originalName: file.originalname,
              url: publicUrl,
              type: 'option',
              optionIndex: optIndex,
              imageIndex: imgIndex
            });
            fileIndex++;
          }
        }
      }
    }

    interface ImageData {
      file?: File | string;
      url?: string;
      caption: string;
      width: number;
      height: number;
      lockRatio: boolean;
      originalRatio: number;
      existingUrl?: string;
      isModified?: boolean;
    }

    // Process images with uploaded URLs
    let processedQuesImages = quesImages as ImageData[];
    let processedOptionImages = optionImages as ImageData[][];
    let processedSolutionImages = solutionImages as ImageData[];

    // Process question images
    if (quesImages && Array.isArray(quesImages)) {
      processedQuesImages = quesImages.map((img: ImageData, index: number) => {
        const uploadedImg = uploadedImages.find(uploaded => uploaded.type === 'question' && uploaded.index === index);
        if (uploadedImg) {
          return {
            caption: img.caption,
            width: img.width,
            height: img.height,
            lockRatio: img.lockRatio,
            originalRatio: img.originalRatio,
            url: uploadedImg.url
          };
        }
        // Keep existing URL if image wasn't modified
        if (!img.isModified && img.existingUrl) {
          return {
            caption: img.caption,
            width: img.width,
            height: img.height,
            lockRatio: img.lockRatio,
            originalRatio: img.originalRatio,
            url: img.existingUrl
          };
        }
        // Default empty image
        return {
          caption: img.caption,
          width: img.width,
          height: img.height,
          lockRatio: img.lockRatio,
          originalRatio: img.originalRatio,
          url: ''
        };
      });
    }

    // Process solution images
    if (solutionImages && Array.isArray(solutionImages)) {
      processedSolutionImages = solutionImages.map((img: ImageData, index: number) => {
        const uploadedImg = uploadedImages.find(uploaded => uploaded.type === 'solution' && uploaded.index === index);
        if (uploadedImg) {
          return {
            caption: img.caption,
            width: img.width,
            height: img.height,
            lockRatio: img.lockRatio,
            originalRatio: img.originalRatio,
            url: uploadedImg.url
          };
        }
        // Keep existing URL if image wasn't modified
        if (!img.isModified && img.existingUrl) {
          return {
            caption: img.caption,
            width: img.width,
            height: img.height,
            lockRatio: img.lockRatio,
            originalRatio: img.originalRatio,
            url: img.existingUrl
          };
        }
        // Default empty image
        return {
          caption: img.caption,
          width: img.width,
          height: img.height,
          lockRatio: img.lockRatio,
          originalRatio: img.originalRatio,
          url: ''
        };
      });
    }

    // Process option images
    if (optionImages && Array.isArray(optionImages)) {
      processedOptionImages = optionImages.map((optImgs: ImageData[], optIndex: number) => 
        optImgs.map((img: ImageData, imgIndex: number) => {
          const uploadedImg = uploadedImages.find(uploaded => 
            uploaded.type === 'option' && 
            uploaded.optionIndex === optIndex && 
            uploaded.imageIndex === imgIndex
          );
          if (uploadedImg) {
            return {
              caption: img.caption,
              width: img.width,
              height: img.height,
              lockRatio: img.lockRatio,
              originalRatio: img.originalRatio,
              url: uploadedImg.url
            };
          }
          // Keep existing URL if image wasn't modified
          if (!img.isModified && img.existingUrl) {
            return {
              caption: img.caption,
              width: img.width,
              height: img.height,
              lockRatio: img.lockRatio,
              originalRatio: img.originalRatio,
              url: img.existingUrl
            };
          }
          // Default empty image
          return {
            caption: img.caption,
            width: img.width,
            height: img.height,
            lockRatio: img.lockRatio,
            originalRatio: img.originalRatio,
            url: ''
          };
        })
      );
    }

    // Update question fields
    if (ques) question.ques = ques;
    if (options) question.options = options;
    if (correct !== undefined) {
      // Handle both single and multiple correct answers
      const correctAnswers = Array.isArray(correct) ? correct : [correct];
      question.correct = correctAnswers;
    }
    if (chapterId) question.chapterId = chapterId;
    if (sectionId !== undefined) question.sectionId = sectionId || null;
    if (topics) question.topics = topics;
    if (solution !== undefined) question.solution = solution;
    if (quesImages) question.quesImages = processedQuesImages as any;
    if (optionImages) question.optionImages = processedOptionImages as any;
    if (solutionImages) question.solutionImages = processedSolutionImages as any;
    if (gridSize) question.gridSize = gridSize;

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
