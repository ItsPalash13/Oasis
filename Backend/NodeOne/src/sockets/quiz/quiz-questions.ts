import { Socket } from 'socket.io';
import { logger } from '../../utils/logger';
import { UserLevelSession } from '../../models/UserLevelSession';
import { Question } from '../../models/Questions';
import { QuestionTs } from '../../models/QuestionTs';
import { UserChapterLevel } from '../../models/UserChapterLevel';
import { Level } from '../../models/Level';
// Removed: UserLevelSessionTopicsLogs model
import { getSkewNormalRandom } from '../../utils/math';

import { UserProfile } from '../../models/UserProfile';
import Badge from '../../models/Badge';
import axios from 'axios';
import mongoose from 'mongoose';

// Helper to push a snapshot entry into session.questionsHistory and persist
const pushQuestionHistoryEntry = async (
  session: any,
  questionDoc: any,
  userOptionChoice: number
) => {
  if (!questionDoc || !Array.isArray(questionDoc.options)) {
    throw new Error('Invalid question document');
  }
  if (
    typeof userOptionChoice !== 'number' ||
    userOptionChoice < 0 ||
    userOptionChoice >= questionDoc.options.length
  ) {
    throw new Error('Invalid user option choice');
  }

  if (!Array.isArray(session.questionsHistory)) {
    session.questionsHistory = [];
  }

  session.questionsHistory.push({
    quesId: questionDoc._id,
    question: questionDoc.ques,
    options: questionDoc.options,
    userOptionChoice,
    correctOption: (questionDoc as any).correct,
    topics: Array.isArray((questionDoc as any).topics)
      ? (questionDoc as any).topics.map((t: any) => ({
          topicId: (t.id?._id ?? t.id ?? t._id),
          topicName: (t.name ?? t.topic ?? '')
        }))
      : [],
    solution: (questionDoc as any).solution
  });

  await session.save();
};

// Helper function to replenish question bank using MU-based strategy
const replenishQuestionBankByMu = async (session: any, level: any) => {
  const replenishmentSize = Math.ceil(session.questionBank.length * 0.5); // 50% of current bank size
  const newQuestions: any[] = [];
  
  // Generate difficulty using same parameters as initial load
  const difficulty = getSkewNormalRandom(
    level.difficultyParams?.mean || 0,
    level.difficultyParams?.sd || 1,
    level.difficultyParams?.alpha || 0
  );

  // Get allowed topic IDs for this level (fetch Topic docs for names)
  const topicDocs = await require('../../models/Topic').Topic.find({ _id: { $in: level.topics } });
  const levelTopicIds = topicDocs.map((t: any) => t._id.toString());

  // Helper function to filter questions by topics
  const filterQuestionsByTopics = (questions: any[]): any[] => {
    return questions.filter(qt => {
      if (!qt.quesId || typeof qt.quesId !== 'object' || !('topics' in qt.quesId) || !Array.isArray(qt.quesId.topics) || !qt.quesId.topics.length) return false;
      const topicIds = qt.quesId.topics.map((t: any) => t.id.toString());
      return topicIds.length >= 1 && topicIds.every((id: string) => levelTopicIds.includes(id));
    });
  };

  // Strategy 1: Get questions based on difficulty and topic subset
  let difficultyQuestions = await QuestionTs.find({
    'difficulty.mu': { $gte: difficulty },
    'quesId': { $nin: session.questionBank }
  })
  .populate('quesId')
  .sort({ 'difficulty.mu': 1 })
  .limit(replenishmentSize);
  newQuestions.push(...filterQuestionsByTopics(difficultyQuestions));

  // Strategy 2: If not enough, add wrong questions from user history (with topic filter)
  if (newQuestions.length < replenishmentSize && session.questionsAnswered.incorrect.length > 0) {
    const wrongQuestionsNeeded = replenishmentSize - newQuestions.length;
    const wrongQuestionIds = session.questionsAnswered.incorrect.filter(
      (id: any) => !session.questionBank.includes(id)
    );
    
    if (wrongQuestionIds.length > 0) {
      const wrongQuestions = await QuestionTs.find({
        'quesId': { $in: wrongQuestionIds.slice(0, wrongQuestionsNeeded) }
      })
      .populate('quesId');
      newQuestions.push(...filterQuestionsByTopics(wrongQuestions));
    }
  }

  // Strategy 3: If still not enough, add correct questions from user history (with topic filter)
  if (newQuestions.length < replenishmentSize && session.questionsAnswered.correct.length > 0) {
    const correctQuestionsNeeded = replenishmentSize - newQuestions.length;
    const correctQuestionIds = session.questionsAnswered.correct.filter(
      (id: any) => !session.questionBank.includes(id)
    );
    
    if (correctQuestionIds.length > 0) {
      const correctQuestions = await QuestionTs.find({
        'quesId': { $in: correctQuestionIds.slice(0, correctQuestionsNeeded) }
      })
      .populate('quesId');
      newQuestions.push(...filterQuestionsByTopics(correctQuestions));
    }
  }

  // Strategy 4: If still not enough, add random questions (with topic filter)
  if (newQuestions.length < replenishmentSize) {
    const randomQuestionsNeeded = replenishmentSize - newQuestions.length;
    const existingQuestionIds = [...session.questionBank, ...newQuestions.map(q => q.quesId._id ? q.quesId._id : q.quesId)];
    const randomQuestions = await QuestionTs.aggregate([
      { $match: { 'quesId': { $nin: existingQuestionIds } } },
      { $lookup: {
          from: 'questions',
          localField: 'quesId',
          foreignField: '_id',
          as: 'quesObj'
      }},
      { $unwind: '$quesObj' },
      { $sample: { size: randomQuestionsNeeded } }
    ]);
    // Attach quesId for consistency
    randomQuestions.forEach(q => { q.quesId = q.quesObj; });
    newQuestions.push(...filterQuestionsByTopics(randomQuestions));
  }

  // Shuffle the new questions and add to bank
  const shuffledQuestions = newQuestions.sort(() => Math.random() - 0.5);
  const newQuestionIds = shuffledQuestions.map(q => q.quesId);
  
  return newQuestionIds;
};

// Helper function to replenish question bank using unit-based strategy
const replenishQuestionBankByUnit = async (session: any, level: any) => {
  const replenishmentSize = Math.ceil(session.questionBank.length * 0.5); // 50% of current bank size
  const newQuestions: any[] = [];

  // Get allowed topic IDs for this level
  const topicDocs = await require('../../models/Topic').Topic.find({ _id: { $in: level.topics } });
  const levelTopicIds = topicDocs.map((t: any) => t._id.toString());

  // Helper function to filter questions by topics
  const filterQuestionsByTopics = (questions: any[]): any[] => {
    return questions.filter(question => {
      if (!question.topics || !Array.isArray(question.topics) || !question.topics.length) return false;
      const questionTopicIds = question.topics.map((t: any) => t.id.toString());
      return questionTopicIds.length >= 1 && questionTopicIds.every((id: string) => levelTopicIds.includes(id));
    });
  };

  // Strategy 1: Get random questions from the level's unit (excluding already used questions)
  const unitQuestions = await Question.find({ 
    unitId: level.unitId,
    _id: { $nin: session.questionBank }
  })
  .populate('topics.id')
  .limit(replenishmentSize * 3);

  const filteredUnitQuestions = filterQuestionsByTopics(unitQuestions);
  // Shuffle and take random questions from unit
  const shuffledUnitQuestions = filteredUnitQuestions.sort(() => Math.random() - 0.5);
  newQuestions.push(...shuffledUnitQuestions.slice(0, replenishmentSize));

  // Strategy 2: If not enough, get random questions from the same chapter (different units)
  if (newQuestions.length < replenishmentSize) {
    const chapterQuestions = await Question.find({ 
      chapterId: level.chapterId,
      unitId: { $ne: level.unitId },
      _id: { $nin: [...session.questionBank, ...newQuestions.map(q => q._id)] }
    })
    .populate('topics.id')
    .limit((replenishmentSize - newQuestions.length) * 2);

    const filteredChapterQuestions = filterQuestionsByTopics(chapterQuestions);
    // Shuffle and add random questions from chapter
    const shuffledChapterQuestions = filteredChapterQuestions.sort(() => Math.random() - 0.5);
    newQuestions.push(...shuffledChapterQuestions.slice(0, replenishmentSize - newQuestions.length));
  }

  // Strategy 3: If still not enough, get random questions from the chapter
  if (newQuestions.length < replenishmentSize) {
    const anyChapterQuestions = await Question.find({ 
      chapterId: level.chapterId,
      _id: { $nin: [...session.questionBank, ...newQuestions.map(q => q._id)] }
    })
    .populate('topics.id')
    .limit((replenishmentSize - newQuestions.length) * 2);
    
    // Shuffle and add random questions
    const shuffledAnyChapterQuestions = anyChapterQuestions.sort(() => Math.random() - 0.5);
    newQuestions.push(...shuffledAnyChapterQuestions.slice(0, replenishmentSize - newQuestions.length));
  }

  // Strategy 4: If still not enough, get random questions from all questions
  if (newQuestions.length < replenishmentSize) {
    const randomQuestionsNeeded = replenishmentSize - newQuestions.length;
    const existingQuestionIds = [...session.questionBank, ...newQuestions.map(q => q._id)];
    const randomQuestions = await Question.aggregate([
      { $match: { _id: { $nin: existingQuestionIds } } },
      { $lookup: { from: 'topics', localField: 'topics.id', foreignField: '_id', as: 'topics' } },
      { $sample: { size: randomQuestionsNeeded * 2 } }
    ]);
    
    // Shuffle and add random questions
    const shuffledRandomQuestions = randomQuestions.sort(() => Math.random() - 0.5);
    newQuestions.push(...shuffledRandomQuestions.slice(0, replenishmentSize - newQuestions.length));
  }

  // Final shuffle of all selected questions
  const shuffledQuestions = newQuestions.sort(() => Math.random() - 0.5);
  const newQuestionIds = shuffledQuestions.map(q => q._id);
  
  return newQuestionIds;
};

// Main function to replenish question bank based on environment variable
// @ts-ignore
const replenishQuestionBank = async (session: any, level: any) => {
  const questionFetchStrategy = process.env.QUESTION_FETCH || '0';
  
  if (questionFetchStrategy === '1') {
    console.log('Using Unit-based question replenishment strategy');
    return await replenishQuestionBankByUnit(session, level);
  } else {
    console.log('Using MU-based question replenishment strategy');
    return await replenishQuestionBankByMu(session, level);
  }
};

// Socket event handlers for quiz questions and answers
export const quizQuestionHandlers = (socket: Socket) => {
  logger.info(`Quiz question socket connected: ${socket.id}`);

  // Handle question requests
  // Generates a new question based on level difficulty
  socket.on('question', async ({ userLevelSessionId, userLevelId }) => {
    try {
      const session = await UserLevelSession.findById(userLevelSessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      const level = await Level.findById(userLevelId);
      if (!level) {
        throw new Error(`Level not found: ${userLevelId}`);
      }


      const currentQuestionId = session.questionBank[session.currentQuestionIndex];
      const question = await Question.findById(currentQuestionId);

      // Update session with current question
      session.currentQuestion = currentQuestionId;
      await session.save();

      // Send question to client
      socket.emit('question', {
        question: question?.ques,
        options: question?.options,
        correctAnswer: question?.correct,
        topics: question?.topics?.map(t => t.name) || [],
        questionImage: question?.quesImage,
        currentQuestionIndex: session.currentQuestionIndex,
        totalQuestions: session.questionBank.length,
        currentStreak: session.streak || 0
      });

      // Check if we need to replenish the question bank (at 40% threshold)
      // Only replenish question bank for time_rush mode
      // Stopping this for now as it is not needed
      //if (session.attemptType === 'time_rush' && session.currentQuestionIndex >= session.questionBank.length * 0.4) {
      //    const newQuestions = await replenishQuestionBank(session, level);
      //    session.questionBank.push(...newQuestions);
      //    await session.save();
      //}
      
      // Get current question from bank
      if (session.currentQuestionIndex >= session.questionBank.length) {
          throw new Error('No more questions available in bank');
      }
      
      if (!question) {
        throw new Error('Question not found');
      }


    } catch (error) {
      logger.error('Error in question:', error);
      if (error.message.includes('not found')) {
        socket.emit('quizError', { 
          type: 'failure',
          message: 'Quiz session is invalid. Please start a new quiz.' 
        });
      } else {
        socket.emit('quizError', { 
          type: 'error',
          message: error.message || 'Failed to get question' 
        });
      }
    }
  });

  // Handle answer submission
  // Processes user's answer and updates XP
socket.on('answer', async ({ userLevelSessionId, answer, currentTime }: { userLevelSessionId: string; answer: number; currentTime: number }) => {
    try {
      const session = await UserLevelSession.findById(userLevelSessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      if (!session.currentQuestion) {
        throw new Error('No active question found');
      }

      // Verify answer correctness
      const question = await Question.findById(session.currentQuestion);
      if (!question) {
        throw new Error('Question not found');
      }

      const isCorrect = answer === question.correct;
      
      // Persist question snapshot with user's choice
      try {
        await pushQuestionHistoryEntry(session, question, answer);
      } catch (historyErr) {
        logger.error('Failed to push question history entry:', historyErr);
      }
      
      // Update uniqueTopics in session
      if (question.topics && Array.isArray(question.topics)) {
        const topicIds = question.topics.map(topic => topic.id.toString());
        // Combine existing and new topic IDs, ensure uniqueness using Set
        const allTopicIds = new Set([
          ...((session.uniqueTopics || []).map(id => id.toString())),
          ...topicIds
        ]);
        session.uniqueTopics = Array.from(allTopicIds).map(id => new mongoose.Types.ObjectId(id));
      }

      // Log time spent on this question

      // Model removed: skip session topics log update
      
      // Get question details for XP calculation
      const questionTs = await QuestionTs.findOne({ quesId: session.currentQuestion });
      if (!questionTs) {
        throw new Error('QuestionTs not found');
      }

      // Calculate XP earned
      const xpEarned = isCorrect ? questionTs.xp.correct : questionTs.xp.incorrect;
      
      // Update XP based on game mode
      if (session.attemptType === 'time_rush') {
        session.timeRush.currentXp = (session.timeRush.currentXp || 0) + Number(xpEarned);
      } else {
        session.precisionPath.currentXp = (session.precisionPath.currentXp || 0) + Number(xpEarned);
      }
      
      // Track answered questions
      if (!session.questionsAnswered) {
        session.questionsAnswered = { correct: [], incorrect: [] };
      }
      if (isCorrect) {
        session.questionsAnswered.correct.push(session.currentQuestion);
        
        // Push correct question to UserChapterLevel immediately
        try {
          await UserChapterLevel.findOneAndUpdate(
            {
              userId: session.userId,
              chapterId: session.chapterId,
              levelId: session.levelId,
              attemptType: session.attemptType
            },
            {
              $addToSet: { correctQuestions: session.currentQuestion },
              $pull: { wrongQuestions: session.currentQuestion } // Remove from wrong if it was there
            },
            { upsert: true }
          );
          console.log(`✅ Added question ${session.currentQuestion} to correctQuestions for user ${session.userId}`);
        } catch (error) {
          console.error('Error updating UserChapterLevel with correct question:', error);
        }
        
        // Handle streak logic for correct answers
        session.streak = (session.streak || 0) + 1;
        
        // Check for streak milestones (3, 6, 9)
        if (session.streak === 3 || session.streak === 6 || session.streak === 9) {
          // Award bonus XP for streak milestones
          const bonusXp = session.streak;
          
          // Update XP based on game mode
          if (session.attemptType === 'time_rush') {
            session.timeRush.currentXp += bonusXp;
          } else {
            session.precisionPath.currentXp += bonusXp;
          }
          
          socket.emit('streak', {
            streakCount: session.streak,
            milestone: session.streak,
            bonusXp: bonusXp,
            message: `Amazing! ${session.streak} correct answers in a row! +${bonusXp} bonus XP!`
          });
        }
        
        // Reset streak after reaching 9
        if (session.streak > 9) {
          session.streak = 0;
        }
      } else {
        session.questionsAnswered.incorrect.push(session.currentQuestion);
        
        // Push incorrect question to UserChapterLevel immediately
        try {
          await UserChapterLevel.findOneAndUpdate(
            {
              userId: session.userId,
              chapterId: session.chapterId,
              levelId: session.levelId,
              attemptType: session.attemptType
            },
            {
              $addToSet: { wrongQuestions: session.currentQuestion }
            },
            { upsert: true }
          );
          console.log(`❌ Added question ${session.currentQuestion} to wrongQuestions for user ${session.userId}`);
        } catch (error) {
          console.error('Error updating UserChapterLevel with wrong question:', error);
        }
        
        // Reset streak on incorrect answer
        session.streak = 0;
      }
      
      // Clear current question and increment index
      session.currentQuestion = null;
      session.currentQuestionIndex = (session.currentQuestionIndex || 0) + 1;
      await session.save();

      // Random phrases for answer feedback
      const correctPhrases = [
        'Nice one',
        'Good job',
        'Well done',
        'Great work',
        'Fabulous',
        'Marvelous',
        'Awesome',
        'Brilliant',
        'Excellent',
        'That\'s great'
      ];
      
      const incorrectPhrases = [
        'Try again',
        'Better luck next time',
        'Not quite',
        'Oops',
        'Incorrect',
        'Give it another try',
        'Nope',
        'Wrong answer',
        'Hmm... not this one',
        'That\'s not right'
      ];

      // Select random phrase based on answer correctness
      const randomPhrase = isCorrect 
        ? correctPhrases[Math.floor(Math.random() * correctPhrases.length)]
        : incorrectPhrases[Math.floor(Math.random() * incorrectPhrases.length)];
      
      const message = `${randomPhrase}`;
      // Check for level completion
      const currentXp = session.attemptType === 'time_rush' ? 
        session.timeRush.currentXp : 
        session.precisionPath.currentXp;
      const requiredXp = session.attemptType === 'time_rush' ? 
        session.timeRush.requiredXp : 
        session.precisionPath.requiredXp;


      // If level is completed (XP requirement met)
      if (session.status === 0 && currentXp >= requiredXp) {
        // Update user's chapter level status
        const userChapterLevel = await UserChapterLevel.findOneAndUpdate(
          {
            userId: session.userId,
            chapterId: session.chapterId,
            levelId: session.levelId,
            attemptType: session.attemptType
          },
          {
            status: 'completed'
          }
        );
        if (!userChapterLevel) {
          throw new Error('UserChapterLevel not found');
        }
        await UserLevelSession.findOneAndUpdate(
          { _id: session._id },
          { status: 1 }
        );
        console.log('Level completed', session._id);
        
        // Call the end API to process final results for both modes
        const response = await axios.post(`${process.env.BACKEND_URL}/api/levels/end`, {
          userLevelSessionId,
          userId: session.userId,
          currentTime: currentTime
        });

        // Process badges and fetch earned badges
        const userProfile = await UserProfile.findOne({ userId: session.userId });
        let earnedBadges: Array<{ badgeId: string, level: number, badgeName: string, badgeImage: string, badgeDescription: string }> = [];
        if (userProfile && userProfile.badges) {
          const sessionBadges = userProfile.badges.filter(b => b.userLevelSessionId === userLevelSessionId);
          for (const badge of sessionBadges) {
            const badgeDoc = await Badge.findById(badge.badgeId);
            if (badgeDoc) {
              earnedBadges.push({ 
                badgeId: badge.badgeId.toString(), 
                level: badge.level, 
                badgeName: badgeDoc.badgeName,
                badgeImage: badgeDoc.badgelevel?.[badge.level]?.badgeImage || '',
                badgeDescription: badgeDoc.badgeDescription || ''
              });
            }
          }
        }
        socket.emit('answerResult', {
          isCorrect,
          correctAnswer: question.correct,
          xpEarned: Number(xpEarned),
          currentXp: session.attemptType === 'time_rush' ? 
            session.timeRush.currentXp : 
            session.precisionPath.currentXp,
          totalQuestions: session.questionBank.length,
          currentStreak: session.streak,
          message: message
        });

        // Send final results to client for both modes
        socket.emit('quizFinished', { 
          message: response.data.message,
          attemptType: session.attemptType,
          questionsHistory: session.questionsHistory || [],
                     ...(session.attemptType === 'time_rush' ? {
             timeRush: {
               currentXp: response.data.data.currentXp,
               requiredXp: response.data.data.requiredXp,
               minTime: response.data.data.minTime,
               timeTaken: response.data.data.timeTaken,
               percentile: response.data.data.percentile,
               rank: response.data.data.rank,
               leaderboard: response.data.data.leaderboard
             }
           } : {
            precisionPath: {
              currentXp: response.data.data.currentXp,
              requiredXp: response.data.data.requiredXp,
              timeTaken: response.data.data.timeTaken,
              bestTime: response.data.data.bestTime,  
              percentile: response.data.data.percentile,
              rank: response.data.data.rank,
              leaderboard: response.data.data.leaderboard
            }
          }),
          hasNextLevel: response.data.data.hasNextLevel,
          nextLevelNumber: response.data.data.nextLevelNumber,
          nextLevelId: response.data.data.nextLevelId,
          nextLevelAttemptType: response.data.data.nextLevelAttemptType,
          xpNeeded: response.data.data.xpNeeded,
          earnedBadges,
          isNewHighScore: response.data.data.isNewHighScore,
          aiFeedback: response.data.data.aiFeedback,
          topics: response.data.data.topics || []
        });
        socket.disconnect();
      } else if (session.currentQuestionIndex >= session.questionBank.length && currentXp < requiredXp) {
        // For both modes: if this was the last question and level not completed, end the quiz
        const response = await axios.post(`${process.env.BACKEND_URL}/api/levels/end`, {
          userLevelSessionId,
          userId: session.userId,
          currentTime: currentTime
        });
        
        // Process badges and fetch earned badges
        const userProfile = await UserProfile.findOne({ userId: session.userId });
        let earnedBadges: Array<{ badgeId: string, level: number, badgeName: string, badgeImage: string, badgeDescription: string }> = [];
        if (userProfile && userProfile.badges) {
          const sessionBadges = userProfile.badges.filter(b => b.userLevelSessionId === userLevelSessionId);
          for (const badge of sessionBadges) {
            const badgeDoc = await Badge.findById(badge.badgeId);
            if (badgeDoc) {
              earnedBadges.push({ 
                badgeId: badge.badgeId.toString(), 
                level: badge.level, 
                badgeName: badgeDoc.badgeName,
                badgeImage: badgeDoc.badgelevel?.[badge.level]?.badgeImage || '',
                badgeDescription: badgeDoc.badgeDescription || ''
              });
            }
          }
        }

        socket.emit('answerResult', {
          isCorrect,
          correctAnswer: question.correct,
          xpEarned: Number(xpEarned),
          currentXp: session.attemptType === 'time_rush' ? 
            session.timeRush.currentXp : 
            session.precisionPath.currentXp,
          totalQuestions: session.questionBank.length,
          currentStreak: session.streak,
          message: message
        });

        // Send final results to client for both modes
        socket.emit('quizFinished', { 
          message: response.data.message,
          attemptType: session.attemptType,
          questionsHistory: session.questionsHistory || [],
          ...(session.attemptType === 'time_rush' ? {
            timeRush: {
              currentXp: response.data.data.currentXp,
              requiredXp: response.data.data.requiredXp,
              minTime: response.data.data.minTime,
              timeTaken: response.data.data.timeTaken,
              percentile: response.data.data.percentile,
              rank: response.data.data.rank,
              leaderboard: response.data.data.leaderboard
            }
          } : {
            precisionPath: {
              currentXp: response.data.data.currentXp,
              requiredXp: response.data.data.requiredXp,
              timeTaken: response.data.data.timeTaken,
              bestTime: response.data.data.bestTime,
              percentile: response.data.data.percentile,
              rank: response.data.data.rank,
              leaderboard: response.data.data.leaderboard
            }
          }),
          hasNextLevel: response.data.data.hasNextLevel,
          nextLevelNumber: response.data.data.nextLevelNumber,
          nextLevelId: response.data.data.nextLevelId,
          nextLevelAttemptType: response.data.data.nextLevelAttemptType,
          xpNeeded: response.data.data.xpNeeded,
          earnedBadges,
          isNewHighScore: response.data.data.isNewHighScore,
          aiFeedback: response.data.data.aiFeedback,
          topics: response.data.data.topics || []
        });
        socket.disconnect();
      } else{
        socket.emit('answerResult', {
          isCorrect,
          correctAnswer: question.correct,
          xpEarned: Number(xpEarned),
          currentXp: session.attemptType === 'time_rush' ? 
            session.timeRush.currentXp : 
            session.precisionPath.currentXp,
          totalQuestions: session.questionBank.length,
          currentStreak: session.streak,
          message: message
        });
      }

    } catch (error) {
      logger.error('Error in answer submission:', error);
      socket.emit('quizError', {
        type: 'error',
        message: error.message || 'Failed to process answer'
      });
    }
  });
}; 