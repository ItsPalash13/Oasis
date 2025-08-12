    import express, { Request, Response, RequestHandler } from 'express';
    import { Level } from '../models/Level';
    import { Chapter } from '../models/Chapter';
    import { Unit } from '../models/Units';
    import { UserChapterLevel } from '../models/UserChapterLevel';
    import { UserChapterUnit } from '../models/UserChapterUnit';
    import { UserLevelSession } from '../models/UserLevelSession';
    import { QuestionTs } from '../models/QuestionTs';
    import { Question } from '../models/Questions';
    import { UserProfile } from '../models/UserProfile';
    import authMiddleware from '../middleware/authMiddleware';
    import mongoose from 'mongoose';
    import { getSkewNormalRandom } from '../utils/math';
    import { Topic } from '../models/Topic';
    import { processBadgesAfterQuiz } from '../utils/badgeprocessor';
    import { getShortLevelFeedback } from '../utils/gpt';
    import { processUserLevelSession } from '../utils/performance';
import { UserTopicPerformance } from '../models/Performance/UserTopicPerformance';

    // Helper: compute topics accuracy updates from the in-memory session
    const computeTopicsAccuracyUpdates = async (session: any) => {
      try {
        const result = await processUserLevelSession(session);
        return result.topics.map(t => ({
          topicId: t.topicId,
          topicName: t.topicName || null,
          previousAcc: t.previousAccuracy,
          updatedAcc: t.updatedAccuracy
        }));
      } catch (procErr) {
        console.error('Performance processing failed:', (procErr as any)?.message || procErr);
        return [] as Array<{ topicId: string; topicName: string | null; previousAcc: number | null; updatedAcc: number }>;
      }
    };

    // Helper: update user's question history based on session results
    const updateUserQuestionHistory = async (session: any, userId: string) => {
      try {
        console.log(`\n=== Updating User Question History ===`);
        console.log(`User ID: ${userId}`);
        console.log(`Session ID: ${session._id}`);
        console.log(`Level ID: ${session.levelId}`);
        console.log(`Attempt Type: ${session.attemptType}`);
        
        if (!session.questionsAnswered) {
          console.log('No questionsAnswered data found in session');
          return;
        }

        const correctQuestionIds = (session.questionsAnswered.correct || []).map((id: any) => 
          new mongoose.Types.ObjectId(id.toString())
        );
        const incorrectQuestionIds = (session.questionsAnswered.incorrect || []).map((id: any) => 
          new mongoose.Types.ObjectId(id.toString())
        );
        
        console.log(`Correct questions in this session: ${correctQuestionIds.length}`);
        console.log(`Incorrect questions in this session: ${incorrectQuestionIds.length}`);
        console.log(`Correct question IDs: [${correctQuestionIds.slice(0, 3).map((id: mongoose.Types.ObjectId) => id.toString()).join(', ')}${correctQuestionIds.length > 3 ? '...' : ''}]`);
        console.log(`Incorrect question IDs: [${incorrectQuestionIds.slice(0, 3).map((id: mongoose.Types.ObjectId) => id.toString()).join(', ')}${incorrectQuestionIds.length > 3 ? '...' : ''}]`);

        // Update UserChapterLevel with question history
        const updateOperation: any = {};

        // Add correct questions to correctQuestions array (avoid duplicates)
        if (correctQuestionIds.length > 0) {
          updateOperation.$addToSet = {
            ...(updateOperation.$addToSet || {}),
            correctQuestions: { $each: correctQuestionIds }
          };
        }

        // Add incorrect questions to wrongQuestions array (avoid duplicates)
        if (incorrectQuestionIds.length > 0) {
          updateOperation.$addToSet = {
            ...(updateOperation.$addToSet || {}),
            wrongQuestions: { $each: incorrectQuestionIds }
          };
        }

        // Remove any questions from wrongQuestions that are now in correctQuestions
        if (correctQuestionIds.length > 0) {
          updateOperation.$pull = {
            ...(updateOperation.$pull || {}),
            wrongQuestions: { $in: correctQuestionIds }
          };
        }

        if (Object.keys(updateOperation).length > 0) {
          console.log(`\n--- Database Update Operation ---`);
          console.log(`Update operation:`, JSON.stringify(updateOperation, null, 2));
          
          await UserChapterLevel.findOneAndUpdate(
            {
              userId: new mongoose.Types.ObjectId(userId),
              chapterId: session.chapterId,
              levelId: session.levelId,
              attemptType: session.attemptType
            },
            updateOperation,
            { upsert: true }
          );

          console.log(`✅ Successfully updated question history for user ${userId}:`);
          console.log(`- Added ${correctQuestionIds.length} correct questions`);
          console.log(`- Added ${incorrectQuestionIds.length} wrong questions`);
          console.log(`- Removed ${correctQuestionIds.length} questions from wrongQuestions (if they were there)`);
        } else {
          console.log(`No update operation needed - no new questions to add`);
        }
        
        console.log(`=== End User Question History Update ===\n`);
      } catch (error) {
        console.error('Error updating user question history:', error);
        // Don't throw error to avoid breaking the main flow
      }
    };



    // Function to initialize first level for a user in a chapter
    const initializeFirstLevel = async (userId: string, chapterId: string): Promise<void> => {
      try {
        // Find the first level of this chapter (lowest levelNumber)
        const firstLevel = await Level.findOne({ 
          chapterId: new mongoose.Types.ObjectId(chapterId) 
        })
        .sort({ levelNumber: 1 })
        .select('_id levelNumber unitId type timeRush precisionPath');

        if (!firstLevel) {
          console.log(`No levels found for chapter ${chapterId}`);
          return;
        }

        // Check if UserChapterUnit exists for this user/chapter/unit
        const existingUserChapterUnit = await UserChapterUnit.findOne({
          userId: new mongoose.Types.ObjectId(userId),
          chapterId: new mongoose.Types.ObjectId(chapterId),
          unitId: firstLevel.unitId
        });

        // Create UserChapterUnit if it doesn't exist
        if (!existingUserChapterUnit) {
          await UserChapterUnit.create({
            userId: new mongoose.Types.ObjectId(userId),
            chapterId: new mongoose.Types.ObjectId(chapterId),
            unitId: firstLevel.unitId,
            status: 'not_started'
          });
          console.log(`Created UserChapterUnit for user ${userId}, chapter ${chapterId}, unit ${firstLevel.unitId}`);
        }

        // Check if UserChapterLevel exists for this user/chapter/level/type
        const existingUserChapterLevel = await UserChapterLevel.findOne({
          userId: new mongoose.Types.ObjectId(userId),
          chapterId: new mongoose.Types.ObjectId(chapterId),
          levelId: firstLevel._id,
          attemptType: firstLevel.type
        });

        // Create UserChapterLevel if it doesn't exist
        if (!existingUserChapterLevel) {
          const userChapterLevelData: any = {
            userId: new mongoose.Types.ObjectId(userId),
            chapterId: new mongoose.Types.ObjectId(chapterId),
            levelId: firstLevel._id,
            levelNumber: firstLevel.levelNumber,
            status: 'not_started',
            attemptType: firstLevel.type,
            lastAttemptedAt: new Date(),
            progress: 0
          };

          // Add type-specific fields based on level type
          if (firstLevel.type === 'time_rush' && firstLevel.timeRush) {
            userChapterLevelData.timeRush = {
              attempts: 0,
              minTime: 0, // For Time Rush, this stores maxTime (best remaining time)
              requiredXp: firstLevel.timeRush.requiredXp,
              timeLimit: firstLevel.timeRush.totalTime,
              totalQuestions: firstLevel.timeRush.totalQuestions
            };
          } else if (firstLevel.type === 'precision_path' && firstLevel.precisionPath) {
            userChapterLevelData.precisionPath = {
              attempts: 0,
              minTime: null,
              requiredXp: firstLevel.precisionPath.requiredXp,
              totalQuestions: firstLevel.precisionPath.totalQuestions
            };
          }

          await UserChapterLevel.create(userChapterLevelData);
          console.log(`Created UserChapterLevel for user ${userId}, chapter ${chapterId}, level ${firstLevel._id}, type ${firstLevel.type}`);
        }
      } catch (error) {
        console.error('Error initializing first level:', error);
        // Don't throw error, just log it to avoid breaking the main flow
      }
    };

    // Function to create question bank based on level and attempt type using MU (difficulty)
    const createQuestionBankByMu = async (level: any, attemptType: string): Promise<any[]> => {
      try {
        // Generate difficulty using skew normal distribution
        const difficulty = getSkewNormalRandom(
          level.difficultyParams?.mean || 0,
          level.difficultyParams?.sd || 1,
          level.difficultyParams?.alpha || 0
        );

        // Determine number of questions for the session
        let numQuestions = 10;
        if (attemptType === 'precision_path') {
          numQuestions = level.precisionPath?.totalQuestions || 10;
        } else if (attemptType === 'time_rush') {
          numQuestions = level.timeRush?.totalQuestions || 10;
        }

        // Fetch topic IDs for the level's topic names
        const topicDocs = await Topic.find({ _id: { $in: level.topics } });
        const levelTopicIds = topicDocs.map((t: any) => t._id.toString());
        
        // Helper function to filter questions by topics
        const filterQuestionsByTopics = (questions: any[]): any[] => {
          return questions.filter(qt => {
            if (!qt.quesId || typeof qt.quesId !== 'object' || !('topics' in qt.quesId) || !Array.isArray(qt.quesId.topics) || !qt.quesId.topics.length) return false;
            const topicIds = qt.quesId.topics.map((t: any) => t.id.toString());
            return topicIds.length >= 1 && topicIds.every((id: string) => levelTopicIds.includes(id));
          });
        };

        // Get questions with difficulty >= generated
        const questionTsList = await QuestionTs.find({
          'difficulty.mu': { $gte: difficulty }
        })
        .populate('quesId')
        .sort({ 'difficulty.mu': 1 })
        .limit(numQuestions);

        let finalQuestionTsList = filterQuestionsByTopics(questionTsList);

        // If not enough questions found with difficulty >= generated, get questions with difficulty <= generated
        if (finalQuestionTsList.length < numQuestions) {
          const additionalQuestions = await QuestionTs.find({
            'difficulty.mu': { $lte: difficulty }
          })
          .populate('quesId')
          .sort({ 'difficulty.mu': -1 })
          .limit(numQuestions - finalQuestionTsList.length);
          
          const filteredAdditional = filterQuestionsByTopics(additionalQuestions);
          finalQuestionTsList.push(...filteredAdditional);
        }

        // If still not enough, relax difficulty (only topic filter)
        if (finalQuestionTsList.length < numQuestions) {
          const moreByTopic = await QuestionTs.find({})
            .populate('quesId')
            .sort({ 'difficulty.mu': 1 })
            .limit(numQuestions - finalQuestionTsList.length);
          
          const filteredMoreByTopic = filterQuestionsByTopics(moreByTopic);
          finalQuestionTsList.push(...filteredMoreByTopic);
        }

        // If still not enough, fill with any random questions
        if (finalQuestionTsList.length < numQuestions) {
          const randomQuestions = await QuestionTs.aggregate([
            { $sample: { size: numQuestions - finalQuestionTsList.length } },
            { $lookup: { from: 'questions', localField: 'quesId', foreignField: '_id', as: 'quesObj' } },
            { $unwind: '$quesObj' }
          ]);
          randomQuestions.forEach(q => { q.quesId = q.quesObj; });
          finalQuestionTsList.push(...randomQuestions);
        }

        // Truncate to numQuestions if overfilled
        finalQuestionTsList = finalQuestionTsList.slice(0, numQuestions);

        if (!finalQuestionTsList.length) {
          throw new Error('No suitable questions found');
        }

        // Extract question IDs for the question bank
        return finalQuestionTsList.map(qt => qt.quesId);
      } catch (error) {
        console.error('Error creating question bank by MU:', error);
        throw error;
      }
    };

    // Helper function to execute all question selection phases
    const executeQuestionSelectionPhases = async (
      numQuestions: number,
      wrongQuestionsQuota: number,
      newQuestions: any[],
      availableWrongQuestions: any[],
      availableCorrectQuestions: any[],
      allQuestions: any[]
    ): Promise<{
      finalQuestions: any[],
      wrongQuestionsToRemove: string[],
      correctQuestionsToRemove: string[]
    }> => {
      let finalQuestions: any[] = [];
      let usedQuestionIds = new Set<string>();
      const wrongQuestionsToRemove: string[] = [];
      const correctQuestionsToRemove: string[] = [];

      // Phase 1: Handle wrong questions quota (pop from beginning)
      console.log(`\n--- Phase 1: Wrong Questions Selection ---`);
      const wrongQuestionsToUse = Math.min(wrongQuestionsQuota, availableWrongQuestions.length);
      
      console.log(`Wrong questions quota: ${wrongQuestionsQuota}`);
      console.log(`Available wrong questions: ${availableWrongQuestions.length}`);
      console.log(`Wrong questions to use: ${wrongQuestionsToUse}`);
      
      // Pop from beginning (FIFO) for wrong questions
      for (let i = 0; i < wrongQuestionsToUse; i++) {
        const question = availableWrongQuestions[i];
        finalQuestions.push(question);
        usedQuestionIds.add(question._id);
        wrongQuestionsToRemove.push(question._id);
      }
      console.log(`Selected ${wrongQuestionsToUse} wrong questions (from beginning)`);
      console.log(`Questions to remove from wrongQuestions: [${wrongQuestionsToRemove.slice(0, 3).join(', ')}${wrongQuestionsToRemove.length > 3 ? '...' : ''}]`);
      console.log(`Total questions selected so far: ${finalQuestions.length}`);

      // Phase 2: Fill remaining slots with new questions
      console.log(`\n--- Phase 2: New Questions Selection ---`);
      const remainingSlots = numQuestions - finalQuestions.length;
      const availableNewQuestions = newQuestions.filter(q => !usedQuestionIds.has(q._id));
      const newQuestionsToUse = Math.min(remainingSlots, availableNewQuestions.length);
      const shuffledNewQuestions = availableNewQuestions.sort(() => Math.random() - 0.5);
      
      console.log(`Remaining slots: ${remainingSlots}`);
      console.log(`Available new questions (after filtering used): ${availableNewQuestions.length}`);
      console.log(`New questions to use: ${newQuestionsToUse}`);
      
      for (let i = 0; i < newQuestionsToUse; i++) {
        finalQuestions.push(shuffledNewQuestions[i]);
        usedQuestionIds.add(shuffledNewQuestions[i]._id);
      }
      console.log(`Selected ${newQuestionsToUse} new questions`);
      console.log(`Total questions selected so far: ${finalQuestions.length}`);

      // Phase 3: If still need more questions, use correct questions (pop from beginning)
      if (finalQuestions.length < numQuestions) {
        console.log(`\n--- Phase 3: Correct Questions Selection (Fallback) ---`);
        const stillNeed = numQuestions - finalQuestions.length;
        const availableCorrectQuestionsFiltered = availableCorrectQuestions.filter(q => !usedQuestionIds.has(q._id));
        
        console.log(`Still need: ${stillNeed} questions`);
        console.log(`Available correct questions (after filtering used): ${availableCorrectQuestionsFiltered.length}`);
        const correctQuestionsToUse = Math.min(stillNeed, availableCorrectQuestionsFiltered.length);
        console.log(`Correct questions to use: ${correctQuestionsToUse}`);
        
        // Pop from beginning (FIFO) for correct questions
        for (let i = 0; i < correctQuestionsToUse; i++) {
          const question = availableCorrectQuestionsFiltered[i];
          finalQuestions.push(question);
          usedQuestionIds.add(question._id);
          correctQuestionsToRemove.push(question._id);
        }
        console.log(`Selected ${correctQuestionsToUse} correct questions (from beginning)`);
        console.log(`Questions to remove from correctQuestions: [${correctQuestionsToRemove.slice(0, 3).join(', ')}${correctQuestionsToRemove.length > 3 ? '...' : ''}]`);
        console.log(`Total questions selected so far: ${finalQuestions.length}`);
      } else {
        console.log(`\n--- Phase 3: Skipped (no additional questions needed) ---`);
      }


      // Final shuffle of all selected questions
      console.log(`\n--- Final Processing ---`);
      console.log(`Final questions before shuffle: ${finalQuestions.length}`);
      finalQuestions = finalQuestions.sort(() => Math.random() - 0.5);

      // Ensure we have the exact number of questions needed
      finalQuestions = finalQuestions.slice(0, numQuestions);
      console.log(`Final questions after truncation: ${finalQuestions.length}`);

      if (!finalQuestions.length) {
        throw new Error('No suitable questions found for this unit');
      }

      // Convert back to original Question format (remove string _id, keep original ObjectId)
      const result = finalQuestions.map(q => {
        const originalQuestion = allQuestions.find(orig => (orig._id as any).toString() === q._id);
        return originalQuestion || q;
      });

      return {
        finalQuestions: result,
        wrongQuestionsToRemove,
        correctQuestionsToRemove
      };
    };

    // Function to create question bank based on level's unitId
    const createQuestionBankByUnit = async (level: any, attemptType: string, userId?: string): Promise<any[]> => {
      try {
        console.log(`\n=== Starting createQuestionBankByUnit ===`);
        console.log(`Level ID: ${level._id}`);
        console.log(`Level Name: ${level.name}`);
        console.log(`Attempt Type: ${attemptType}`);
        console.log(`User ID: ${userId || 'No user ID provided'}`);
        console.log(`Unit ID: ${level.unitId}`);
        console.log(`Level Topics: ${level.topics?.join(', ') || 'No topics'}`);

        // Determine number of questions for the session
        let numQuestions = 10;
        if (attemptType === 'precision_path') {
          numQuestions = level.precisionPath?.totalQuestions || 10;
        } else if (attemptType === 'time_rush') {
          numQuestions = level.timeRush?.totalQuestions || 10;
        }
        console.log(`Required questions: ${numQuestions}`);

        // Get user's performance history for this level
        let userChapterLevel = null;
        let correctQuestions: string[] = [];
        let wrongQuestions: string[] = [];
        
        if (userId) {
          console.log(`\n--- Fetching user performance history ---`);
          userChapterLevel = await UserChapterLevel.findOne({
            userId: new mongoose.Types.ObjectId(userId),
            chapterId: level.chapterId,
            levelId: level._id,
            attemptType
          });
          
          if (userChapterLevel) {
            correctQuestions = (userChapterLevel.correctQuestions || []).map(id => id.toString());
            wrongQuestions = (userChapterLevel.wrongQuestions || []).map(id => id.toString());
            console.log(`Found user chapter level: ${userChapterLevel._id}`);
            console.log(`Previous correct questions: ${correctQuestions.length}`);
            console.log(`Previous wrong questions: ${wrongQuestions.length}`);
            console.log(`Correct question IDs: [${correctQuestions.slice(0, 5).join(', ')}${correctQuestions.length > 5 ? '...' : ''}]`);
            console.log(`Wrong question IDs: [${wrongQuestions.slice(0, 5).join(', ')}${wrongQuestions.length > 5 ? '...' : ''}]`);
          } else {
            console.log(`No previous user chapter level found for this user/level/type combination`);
          }
        } else {
          console.log(`No user ID provided - proceeding without user history`);
        }

        // Get all available questions for this unit and topics
        console.log(`\n--- Fetching questions from database ---`);
        console.log(`Querying questions for unitId: ${level.unitId}`);
        console.log(`Topic filter: excluding questions without required topics`);
        
        const allQuestions = await Question.find({
          unitId: level.unitId,
          "topics": {
            $not: {
              $elemMatch: {
                id: { $nin: level.topics }
              }
            }
          }
        }).populate('topics.id');

        console.log(`Total questions found in database: ${allQuestions.length}`);

        if (!allQuestions.length) {
          throw new Error('No questions found for this unit with the required topics');
        }

                // Convert questions to array with string IDs for easier comparison
        const questionPool = allQuestions.map(q => ({
          ...q.toObject(),
          _id: (q._id as any).toString()
        }));

        // Calculate quotas
        const wrongQuestionsQuota = Math.ceil(numQuestions * 0.3); // 30%
        console.log(`\n--- Calculating quotas ---`);
        console.log(`Wrong questions quota (30%): ${wrongQuestionsQuota}`);
        console.log(`New questions quota (70%): ${numQuestions - wrongQuestionsQuota}`);
        
        // Separate questions into categories
        console.log(`\n--- Categorizing questions ---`);
        const newQuestions = questionPool.filter(q => 
          !correctQuestions.includes(q._id) && !wrongQuestions.includes(q._id)
        );
        
        const availableWrongQuestions = questionPool.filter(q => 
          wrongQuestions.includes(q._id)
        );
        
        const availableCorrectQuestions = questionPool.filter(q => 
          correctQuestions.includes(q._id)
        ).sort((a, b) => {
          // Sort by oldest first (assuming _id contains timestamp or we can use creation order)
          // For ObjectId, older IDs are lexicographically smaller
          return a._id.localeCompare(b._id);
        });

        console.log(`Question pool size: ${questionPool.length}`);
        console.log(`New questions available: ${newQuestions.length}`);
        console.log(`Wrong questions available: ${availableWrongQuestions.length}`);
        console.log(`Correct questions available: ${availableCorrectQuestions.length}`);

        // Execute question selection phases
        const selectionResult = await executeQuestionSelectionPhases(
          numQuestions,
          wrongQuestionsQuota,
          newQuestions,
          availableWrongQuestions,
          availableCorrectQuestions,
          allQuestions
        );

        const { finalQuestions: result, wrongQuestionsToRemove, correctQuestionsToRemove } = selectionResult;

        console.log(`\n=== Question Selection Summary ===`);
        console.log(`User ID: ${userId || 'No user ID'}`);
        console.log(`Total questions needed: ${numQuestions}`);
        console.log(`Total questions returned: ${result.length}`);
        
        const newQuestionsUsed = result.filter(q => newQuestions.some(nq => nq._id === q._id.toString())).length;
        const wrongQuestionsUsed = result.filter(q => wrongQuestions.includes(q._id.toString())).length;
        const correctQuestionsUsed = result.filter(q => correctQuestions.includes(q._id.toString())).length;
        const randomQuestionsUsed = result.length - newQuestionsUsed - wrongQuestionsUsed - correctQuestionsUsed;
        
        console.log(`- New questions used: ${newQuestionsUsed} (${((newQuestionsUsed/numQuestions)*100).toFixed(1)}%)`);
        console.log(`- Wrong questions used: ${wrongQuestionsUsed} (${((wrongQuestionsUsed/numQuestions)*100).toFixed(1)}%)`);
        console.log(`- Correct questions used: ${correctQuestionsUsed} (${((correctQuestionsUsed/numQuestions)*100).toFixed(1)}%)`);
        console.log(`- Random questions used: ${randomQuestionsUsed} (${((randomQuestionsUsed/numQuestions)*100).toFixed(1)}%)`);
        
        // Update UserChapterLevel to remove used questions from arrays
        if (userId && (wrongQuestionsToRemove.length > 0 || correctQuestionsToRemove.length > 0)) {
          console.log(`\n--- Updating UserChapterLevel (Removing Used Questions) ---`);
          const updateOperation: any = {};
          
          if (wrongQuestionsToRemove.length > 0) {
            updateOperation.$pull = {
              ...(updateOperation.$pull || {}),
              wrongQuestions: { $in: wrongQuestionsToRemove.map(id => new mongoose.Types.ObjectId(id)) }
            };
            console.log(`Removing ${wrongQuestionsToRemove.length} questions from wrongQuestions array`);
          }
          
          if (correctQuestionsToRemove.length > 0) {
            updateOperation.$pull = {
              ...(updateOperation.$pull || {}),
              correctQuestions: { $in: correctQuestionsToRemove.map(id => new mongoose.Types.ObjectId(id)) }
            };
            console.log(`Removing ${correctQuestionsToRemove.length} questions from correctQuestions array`);
          }
          
          if (Object.keys(updateOperation).length > 0) {
            await UserChapterLevel.findOneAndUpdate(
              {
                userId: new mongoose.Types.ObjectId(userId),
                chapterId: level.chapterId,
                levelId: level._id,
                attemptType
              },
              updateOperation,
              { upsert: false } // Don't create if it doesn't exist
            );
            console.log(`✅ Successfully removed used questions from UserChapterLevel arrays`);
          }
        }

        console.log(`=== End createQuestionBankByUnit ===\n`);

        return result;
      } catch (error) {
        console.error('Error creating question bank by Unit:', error);
        throw error;
      }
    };

    // Main function to create question bank based on environment variable
    const createQuestionBank = async (level: any, attemptType: string, userId?: string): Promise<any[]> => {
      const questionFetchStrategy = process.env.QUESTION_FETCH || '0';
      
      if (questionFetchStrategy === '1') {
        console.log('Using Unit-based question fetching strategy');
        return await createQuestionBankByUnit(level, attemptType, userId);
      } else {
        console.log('Using MU-based question fetching strategy');
        return await createQuestionBankByMu(level, attemptType);
      }
    };

    // Combined helper function to calculate percentile for both Time Rush and Precision Path
    const calculateLevelPercentile = async (
      chapterId: string, 
      levelId: string, 
      userTime: number, 
      userId: string, 
      attemptType: 'time_rush' | 'precision_path'
    ): Promise<{ 
      percentile: number, 
      participantCount: number, 
      rank: number, 
      leaderboard: Array<{
        userId: string,
        fullName: string | null,
        avatar: string | null,
        avatarBgColor: string | null,
        time: number,
        rank: number
      }> | null
    }> => {
      try {
        // Configure query based on attempt type
        const fieldPath = attemptType === 'time_rush' ? 'timeRush.minTime' : 'precisionPath.minTime';
        const selectField = attemptType === 'time_rush' ? 'timeRush.minTime userId' : 'precisionPath.minTime userId';
        
        // Get all completed attempts for this level, including current user
        const allAttempts = await UserChapterLevel.find({
          chapterId,
          levelId,
          attemptType,
          [fieldPath]: { $exists: true, $nin: [null, Infinity] }
        }).select(selectField);

        if (allAttempts.length === 0) {
          return { 
            percentile: 100, 
            participantCount: 0, 
            rank: 1, 
            leaderboard: null 
          };
        }

        // Extract and prepare ranking data
        const rankingData = allAttempts
          .map(attempt => ({
            userId: attempt.userId,
            time: attemptType === 'time_rush' ? attempt.timeRush?.minTime : attempt.precisionPath?.minTime
          }))
          .filter(data => data.time !== null && data.time !== undefined && data.time !== Infinity)
          .sort((a, b) => {
            // Sort based on attempt type: Time Rush (higher is better), Precision Path (lower is better)
            const aTime = a.time!;
            const bTime = b.time!;
            return attemptType === 'time_rush' ? bTime - aTime : aTime - bTime;
          });

        if (rankingData.length === 0) {
          return { 
            percentile: 100, 
            participantCount: 0, 
            rank: 1, 
            leaderboard: null 
          };
        }

        // Find user's rank
        const userRank = rankingData.findIndex(data => data.userId.toString() === userId) + 1;
        
        // Calculate percentile (excluding current user from comparison)
        const otherUsersData = rankingData.filter(data => data.userId.toString() !== userId);
        let usersWithWorsePerformance: number;
        
        if (attemptType === 'time_rush') {
          // For Time Rush: count users with lower maxTime (completed with less time remaining) - worse performance
          usersWithWorsePerformance = otherUsersData.filter(data => data.time! < userTime).length;
        } else {
          // For Precision Path: count users with higher minTime (slower) - worse performance
          usersWithWorsePerformance = otherUsersData.filter(data => data.time! > userTime).length;
        }
        
        const percentile = otherUsersData.length > 0 ? 
          Math.round((usersWithWorsePerformance / otherUsersData.length) * 100) : 100;

        // Generate leaderboard if user is in top 5
        let leaderboard = null;
        if (userRank <= 5) {
          // Get top 5 users' profile data
          const top5UserIds = rankingData.slice(0, 5).map(data => data.userId.toString());
          const userProfiles = await UserProfile.find({ 
            userId: { $in: top5UserIds } 
          }).select('userId fullName avatar avatarBgColor');

          // Create profile lookup map
          const profileMap = new Map();
          userProfiles.forEach(profile => {
            profileMap.set(profile.userId, {
              fullName: profile.fullName || null,
              avatar: profile.avatar || null,
              avatarBgColor: profile.avatarBgColor || null
            });
          });

          // Build leaderboard array
          leaderboard = rankingData.slice(0, 5).map((data, index) => {
            const profile = profileMap.get(data.userId.toString()) || {};
            return {
              userId: data.userId.toString(),
              fullName: profile.fullName || null,
              avatar: profile.avatar || null,
              avatarBgColor: profile.avatarBgColor || null,
              time: data.time!,
              rank: index + 1
            };
          });
        }
        
        return { 
          percentile, 
          participantCount: otherUsersData.length, 
          rank: userRank || (rankingData.length + 1), 
          leaderboard 
        };
      } catch (error) {
        console.error(`Error calculating ${attemptType} percentile:`, error);
        return { 
          percentile: 0, 
          participantCount: 0, 
          rank: 0, 
          leaderboard: null 
        };
      }
    };

    interface AuthRequest extends Request {
      user: {
        id: string;
      };
    }


    const router = express.Router();

    // Start a level
    router.post('/start', authMiddleware, (async (req: AuthRequest, res: Response) => {
      try {
        const { levelId, attemptType } = req.body;
        const userId = req.user.id;

        if (!attemptType || !['time_rush', 'precision_path'].includes(attemptType)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid attempt type. Must be either time_rush or precision_path'
          });
        }

        // Find the level
        const level = await Level.findById(levelId);
        if (!level) {
          return res.status(404).json({
            success: false,
            error: 'Level not found'
          });
        }

        // Validate that the attemptType matches the level's supported type
        if (level.type !== attemptType) {
          return res.status(400).json({
            success: false,
            error: `This level does not support ${attemptType} mode. It only supports ${level.type} mode.`
          });
        }

        // Check user's health before allowing to start level
        const userProfile = await UserProfile.findOne({ userId });
        if (!userProfile) {
          return res.status(404).json({
            success: false,
            error: 'User profile not found'
          });
        }

        if (userProfile.health <= 0) {
          return res.status(403).json({
            success: false,
            error: 'Insufficient health to start level. You need health greater than 0 to play.'
          });
        }

        // Check if UserChapterUnit exists, create if not found
        await UserChapterUnit.findOneAndUpdate(
          {
            userId,
            chapterId: level.chapterId,
            unitId: level.unitId
          },
          {
            $setOnInsert: {
              status: 'in_progress',
              startedAt: new Date()
            }
          },
          {
            upsert: true,
            new: true
          }
        );
        
        // Deduct 1 health when starting a level (never go below 0)
        await UserProfile.findOneAndUpdate(
          { userId },
          { $inc: { health: -1 } },
          { upsert: true }
        );
        
        // Ensure health doesn't go below 0
        await UserProfile.findOneAndUpdate(
          { userId, health: { $lt: 0 } },
          { $set: { health: 0 } }
        );

        // Find existing UserChapterLevel
        let userChapterLevel = await UserChapterLevel.findOne({
          userId,
          levelId,
          chapterId: level.chapterId,
          attemptType
        });

        // Prepare update object
        const updateObj: any = {
          $set: {
            lastAttemptedAt: new Date()
          }
        };

        // Handle attempts differently for new vs existing documents
        if (!userChapterLevel) {
          // New document - set attempts to 1 and initialize the mode-specific object
          const fieldName = attemptType === 'time_rush' ? 'timeRush' : 'precisionPath';
          updateObj.$set[fieldName] = {
            attempts: 1,
            requiredXp: attemptType === 'time_rush' ? (level.timeRush?.requiredXp || 0) : (level.precisionPath?.requiredXp || 0),
            ...(attemptType === 'time_rush' ? {
              minTime: 0, // For Time Rush, this stores maxTime (best remaining time)
              timeLimit: level.timeRush?.totalTime || 0,
              totalQuestions: level.timeRush?.totalQuestions || 10
            } : {
              minTime: null
            })
          };
          updateObj.$set.status = 'in_progress';
        } else {
          // Existing document - update the entire mode-specific object with incremented attempts
          const fieldName = attemptType === 'time_rush' ? 'timeRush' : 'precisionPath';
          const currentAttempts = (userChapterLevel as any)[fieldName]?.attempts || 0;
          const newAttempts = currentAttempts + 1;
          
          // Set the entire object to ensure proper update
          updateObj.$set[fieldName] = {
            ...(userChapterLevel as any)[fieldName],
            attempts: newAttempts
          };
          
          // Only update status to 'in_progress' if it's currently 'not_started'
          if (userChapterLevel.status === 'not_started') {
            updateObj.$set.status = 'in_progress';
          }
        }

        // Update or create UserChapterLevel
        userChapterLevel = await UserChapterLevel.findOneAndUpdate({
          userId,
          levelId,
          chapterId: level.chapterId,
          attemptType
        }, updateObj, {
          new: true, // Return the updated document
          upsert: true // Create if doesn't exist
        });

        // Delete all existing sessions for this userChapterLevelId
        if (userChapterLevel) {
          await UserLevelSession.deleteMany({
            userChapterLevelId: userChapterLevel._id
          });
        }

        // Create question bank using the helper function
        const questionBank = await createQuestionBank(level, attemptType, userId);

        // Create new session with question bank
        const session = await UserLevelSession.create({
          userChapterLevelId: userChapterLevel?._id,
          userId,
          chapterId: level.chapterId,
          levelId: level._id,
          attemptType,
          status: 0,
          currentQuestion: questionBank[0], // Set first question as current
          currentQuestionIndex: 0,
          questionBank,
          questionsAnswered: {
            correct: [],
            incorrect: []
          },
          ...(attemptType === 'time_rush' ? {
            timeRush: {
              requiredXp: level.timeRush?.requiredXp || 0,
              currentXp: 0,
              minTime: userChapterLevel?.timeRush?.minTime || 0, // For Time Rush, this stores maxTime
              timeLimit: level.timeRush?.totalTime || 0,
              currentTime: level.timeRush?.totalTime || 0,
              totalQuestions: level.timeRush?.totalQuestions || 10
            }
          } : {
            precisionPath: {
              requiredXp: level.precisionPath?.requiredXp || 0,
              currentXp: 0,
              currentTime: 0,
              minTime: userChapterLevel?.precisionPath?.minTime || Infinity,
              totalQuestions: level.precisionPath?.totalQuestions || 10
            }
          })
        });

        // Get the first question details
        const firstQuestion = await Question.findById(questionBank[0]);
        if (!firstQuestion) {
          throw new Error('Question not found');
        }
        // Extract topic names for the first question
        const firstQuestionTopics = firstQuestion.topics?.map(t => t.name) || [];

        return res.status(201).json({
          success: true,
          data: {
            session,
            currentQuestion: {
              question: firstQuestion.ques,
              options: firstQuestion.options,
              correctAnswer: firstQuestion.correct,
              topics: firstQuestionTopics
            },
            totalQuestions: questionBank.length
          }
        });
      } catch (error) {
        console.error('Error starting level:', error);
        return res.status(500).json({
          success: false,
          error: error.message || 'Server Error'
        });
      }
    }) as unknown as RequestHandler);

    // Get levels by chapter ID
    router.get('/:chapterId', authMiddleware, (async (req: AuthRequest, res: Response) => {
      try {
        const { chapterId } = req.params;
        const userId = req.user.id;
        
        // Initialize first level for the user if it's their first time accessing this chapter
        await initializeFirstLevel(userId, chapterId);

        // Fetch chapter
        const chapter = await Chapter.findById(chapterId)
          .select('name description gameName status thumbnailUrl');

        if (!chapter) {
          return res.status(404).json({
            success: false,
            error: 'Chapter not found'
          });
        }

        // Get topics for this chapter
        const chapterTopics = await Topic.find({ chapterId: chapterId }).select('topic').lean();
        const chapterTopicNames = chapterTopics.map((topic: any) => topic.topic);
        
        // Get latest accuracy for chapter topics
        const userTopicPerformance = await UserTopicPerformance.findOne({ userId: new mongoose.Types.ObjectId(userId) });
        const topicAccuracyMap = new Map();
        
        if (userTopicPerformance && userTopicPerformance.topics) {
          for (const topicEntry of userTopicPerformance.topics) {
            const topicId = topicEntry.topicId.toString();
            const accuracyHistory = topicEntry.accuracyHistory || [];
            if (accuracyHistory.length > 0) {
              // Get the latest accuracy entry
              const latestAccuracy = accuracyHistory.reduce((latest: any, current: any) => 
                new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest
              );
              topicAccuracyMap.set(topicId, latestAccuracy.accuracy);
            }
          }
        }
        
        // Create chapter topics with accuracy data
        const chapterTopicsWithAccuracy = chapterTopics.map((topic: any) => ({
          _id: topic._id,
          topic: topic.topic,
          accuracy: topicAccuracyMap.get(topic._id.toString()) || null
        }));

        // Get all units for this chapter (not just those the user has access to)
        const chapterUnits = await Unit.find({
          chapterId: new mongoose.Types.ObjectId(chapterId)
        }).select('_id name description status topics');

        // Fetch all topic names for these units in one go
        const allTopicIds = Array.from(new Set(chapterUnits.flatMap(unit => unit.topics.map(tid => tid.toString()))));
        const unitTopics = await Topic.find({ _id: { $in: allTopicIds } }).select('_id topic');
        const topicIdToName = new Map(unitTopics.map((t: any) => [t._id.toString(), t.topic]));

        // Get all UserChapterUnit for this user/chapter
        const userChapterUnits = await UserChapterUnit.find({
          userId: new mongoose.Types.ObjectId(userId),
          chapterId: new mongoose.Types.ObjectId(chapterId)
        });
        const userUnitIds = new Set(userChapterUnits.map(ucu => ucu.unitId.toString()));

        // Map units to include topic names and locked property
        const unitsWithTopicNames = chapterUnits.map(unit => ({
          _id: unit._id,
          name: unit.name,
          description: unit.description,
          status: unit.status,
          topics: unit.topics.map(tid => topicIdToName.get(tid.toString()) || tid.toString()),
          locked: !userUnitIds.has((unit._id as any).toString())
        }));

        // Get all levels for these units (not just those the user has access to)
        const allUnitIds = chapterUnits.map(unit => unit._id);
        const levels = await Level.find({ 
          chapterId,
          unitId: { $in: allUnitIds }
        })
          .select('name levelNumber description type timeRush precisionPath topics status unitId')
          .populate('topics', 'topic') // Populate topics with their names
          .sort({ levelNumber: 1 })
          .lean() as any[];

        // Get all UserChapterLevel for this user/chapter/levels
        const userProgress = await UserChapterLevel.find({
          userId: new mongoose.Types.ObjectId(userId),
          chapterId: new mongoose.Types.ObjectId(chapterId),
          levelId: { $in: levels.map(level => new mongoose.Types.ObjectId(level._id)) }
        });
        const progressMap = new Map(
          userProgress.map(progress => [`${progress.levelId.toString()}_${progress.attemptType}`, progress])
        );

        // Process levels: add locked property if no UCL for this user/level/type
        const mixedLevels = await Promise.all(levels.map(async (level) => {
          const progressKey = `${level._id.toString()}_${level.type}`;
          const hasProgress = progressMap.has(progressKey);
          const rawProgress = progressMap.get(progressKey);
          // Clean user progress to only include relevant fields for the level's type
          let cleanProgress = null;
          if (rawProgress) {
            cleanProgress = {
              ...rawProgress.toObject(),
              ...(level.type === 'time_rush' ? { precisionPath: undefined } : { timeRush: undefined }),
              ...(level.type === 'precision_path' && level.precisionPath?.totalQuestions ? {
                precisionPath: {
                  ...rawProgress.toObject().precisionPath,
                  totalQuestions: level.precisionPath.totalQuestions
                }
              } : {})
            };
          }
          
          // Calculate percentile for this level
          let percentile = null;
          let participantCount = null;
          let rank = null;
          let leaderboard = null;
          if (rawProgress) {
            if (level.type === 'time_rush' && rawProgress.timeRush?.minTime && rawProgress.timeRush.minTime > 0) {
              const result = await calculateLevelPercentile(
                chapterId,
                level._id.toString(),
                rawProgress.timeRush.minTime, // This stores maxTime for Time Rush
                userId,
                'time_rush'
              );
              percentile = result.percentile;
              participantCount = result.participantCount;
              rank = result.rank;
              leaderboard = result.leaderboard;
            } else if (level.type === 'precision_path' && rawProgress.precisionPath?.minTime && rawProgress.precisionPath.minTime !== Infinity) {
              const result = await calculateLevelPercentile(
                chapterId,
                level._id.toString(),
                rawProgress.precisionPath.minTime,
                userId,
                'precision_path'
              );
              percentile = result.percentile;
              participantCount = result.participantCount;
              rank = result.rank;
              leaderboard = result.leaderboard;
            }
          }
          
          // Level is locked if user does not have UCL for this level/type
          const locked = !hasProgress;
                      return {
              ...level,
              // Expose raw activation status separately so frontend can show "Coming Soon"
              isActive: level.status,
              userProgress: cleanProgress,
              isStarted: hasProgress,
              status: level.status && hasProgress, // keep status logic for backward compat
              mode: level.type,
              locked,
              progress: rawProgress?.progress || 0, // Include progress field from UserChapterLevel
              percentile: percentile, // Include percentile ranking
              participantCount: participantCount, // Include participant count
              rank: rank, // Include user's rank
              leaderboard: leaderboard // Include top 5 leaderboard if user is in top 5
            };
        }));

        return res.status(200).json({
          success: true,
          count: {
            total: mixedLevels.length,
            timeRush: mixedLevels.filter(level => level.type === 'time_rush').length,
            precisionPath: mixedLevels.filter(level => level.type === 'precision_path').length
          },
          meta: {
            chapter: {
              ...chapter.toObject(),
              topics: chapterTopicsWithAccuracy
            },
            units: unitsWithTopicNames
          },
          data: mixedLevels
        });
      } catch (error) {
        console.error('Error fetching levels:', error);
        return res.status(500).json({
          success: false,
          error: 'Server Error'
        });
      }
    }) as unknown as RequestHandler);

    // End a level
    router.post('/end', (async (req: Request, res: Response) => {
      try {
        const { userLevelSessionId, userId, currentTime } = req.body;
        
        if (!userId || !userLevelSessionId) {
          return res.status(400).json({
            success: false,
            error: 'userId and userLevelSessionId are required'
          });
        }

        // Find the session
        const session = await UserLevelSession.findById(userLevelSessionId);
        if (!session) {
          return res.status(404).json({
            success: false,
            error: 'Session not found'
          });
        }

        // Get current UserChapterLevel
        const userChapterLevel = await UserChapterLevel.findOne({
          userId,
          chapterId: session.chapterId,
          levelId: session.levelId,
          attemptType: session.attemptType
        });

         // Before processing badges, merge uniqueTopics from session into user profile
         if (session.uniqueTopics && Array.isArray(session.uniqueTopics)) {
          const userProfile = await UserProfile.findOne({ userId });
          if (userProfile) {
            const profileTopics = (userProfile.uniqueTopics || []).map((t: any) => t.toString());
            const sessionTopics = session.uniqueTopics.map((t: any) => t.toString());
            const allTopicsSet = new Set([...profileTopics, ...sessionTopics]);
            userProfile.uniqueTopics = Array.from(allTopicsSet);
            await userProfile.save();
          }
        }


        // Phase 2: Set status to 1 for all session topic logs for this session TODAY
        try {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          // Model removed: no session topic logs to update
          
        } catch (sessionLogError) {
          console.error('Error updating session topic logs status:', sessionLogError);
          // Don't break the level end flow if session logging fails
        }

        let highScoreMessage = '';
        let newHighScore = false;

        if (session.attemptType === 'time_rush') {
          // Time Rush: Check if current time (remaining) is better than stored maxTime
          const finalTime = currentTime || session.timeRush?.currentTime || 0;
          const maxTime = userChapterLevel?.timeRush?.minTime || 0; // This field stores maxTime for Time Rush
          const currentXp = session.timeRush?.currentXp || 0;
          
          if (finalTime > maxTime && currentXp >= (session.timeRush?.requiredXp || 0)) {
            newHighScore = true;
            let totalMilliseconds = Math.floor(finalTime * 1000); // convert to ms
            let minutes = Math.floor(totalMilliseconds / 60000);
            let seconds = Math.floor((totalMilliseconds % 60000) / 1000);
            let milliseconds = totalMilliseconds % 1000;

            let formatted = `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
            highScoreMessage = `New best time: ${formatted} remaining!`;
          }

          // Check if user has enough XP
          if (currentXp >= (session.timeRush?.requiredXp || 0)) {
            // Find the current level
            const currentLevel = await Level.findById(session.levelId);
            if (!currentLevel) {
              throw new Error('Level not found');
            }

            // Find the next level in the same chapter with the same type
            const nextLevel = await Level.findOne({
              chapterId: session.chapterId,
              levelNumber: currentLevel.levelNumber + 1,
              status: true
            }).select('_id levelNumber type');

            // Calculate progress: min(required score, current level scored) / required score * 100
            const requiredXp = session.timeRush?.requiredXp || 0;
            const achievedXp = Math.min(currentXp, requiredXp);
            const calculatedProgress = requiredXp > 0 ? Math.round((achievedXp / requiredXp) * 100) : 0;
            const currentProgress = userChapterLevel?.progress || 0;
            const progress = Math.max(calculatedProgress, currentProgress);

            // Update UserChapterLevel for current level
            await UserChapterLevel.findOneAndUpdate(
              {
                userId,
                chapterId: session.chapterId,
                levelId: session.levelId,
                attemptType: 'time_rush'
              },
              {
                $set: {
                  status: 'completed',
                  completedAt: new Date(),
                  'timeRush.minTime': Math.max(finalTime, maxTime), // Store the maximum time remaining
                  progress: progress
                }
              },
              { upsert: true }
            );
            const currentMonth = new Date().toISOString().slice(0, 7).replace('-', '/'); // YYYY/MM
            // Update user's totalCoins and health when level is completed
            await UserProfile.findOneAndUpdate(
              { userId },
              { 
                $inc: { 
                  totalCoins: currentXp, 
                  health: 1,
                  [`monthlyXp.${currentMonth}`]: currentXp
                }
              },
              { upsert: true }
            );           
            // Ensure health doesn't exceed 6
            await UserProfile.findOneAndUpdate(
              { userId, health: { $gt: 6 } },
              { $set: { health: 6 } }
            );

            // If next level exists, check if UserChapterLevel already exists for it
            if (nextLevel && typeof nextLevel.levelNumber === 'number' && !isNaN(nextLevel.levelNumber)) {
              const existingNextLevel = await UserChapterLevel.findOne({
                userId,
                chapterId: session.chapterId,
                levelId: nextLevel._id,
                attemptType: nextLevel.type
              });

              // Only create if it doesn't exist
              if (!existingNextLevel) {
                await UserChapterLevel.create({
                  userId,
                  chapterId: session.chapterId,
                  levelId: nextLevel._id,
                  attemptType: nextLevel.type,
                  status: 'not_started',
                  levelNumber: nextLevel.levelNumber,
                  // Set mode-specific fields based on next level's type
                  ...(nextLevel.type === 'time_rush' ? {
                    timeRush: {
                      minTime: null,
                      attempts: 0,
                      requiredXp: nextLevel.timeRush?.requiredXp || 0,
                      timeLimit: nextLevel.timeRush?.totalTime || 0,
                      totalQuestions: nextLevel.timeRush?.totalQuestions || 10
                    }
                  } : {
                    precisionPath: {
                      minTime: null,
                      attempts: 0,
                      requiredXp: nextLevel.precisionPath?.requiredXp || 0
                    }
                  })
                });
              }
            }

            // Calculate percentile based on maxTime
            const percentileResult = await calculateLevelPercentile(
              session.chapterId.toString(),
              session.levelId.toString(),
              Math.max(finalTime, maxTime),
              userId,
              'time_rush'
            );
            const percentile = percentileResult.percentile;
            const rank = percentileResult.rank;
            const leaderboard = percentileResult.leaderboard;

            // Get level details for GPT feedback
            const level = await Level.findById(session.levelId);
            const levelTopics = level?.topics || [];
            const topicNames = await Topic.find({ _id: { $in: levelTopics } }).select('topic');
            const topicNamesList = topicNames.map(t => t.topic);
            
            // Get user's first name
            const userProfile = await UserProfile.findOne({ userId });
            const fullName = userProfile?.fullName || 'Student';
            const firstName = fullName.split(' ')[0] || 'Student';
            
            // Generate personalized feedback
            let aiFeedback = "Great job completing this level!";
            try {
              aiFeedback = await getShortLevelFeedback({
                levelName: level?.name || 'Level',
                levelTopics: topicNamesList,
                studentXP: currentXp,
                requiredXP: session.timeRush?.requiredXp || 0,
                accuracy: Math.round((session.questionsAnswered?.correct?.length || 0) / (session.questionBank.length || 1) * 100),
                timeTaken: `${Math.floor(finalTime / 60)}:${(finalTime % 60).toFixed(1)}`,
                levelResult: 'completed',
                nextLevel: nextLevel ? `Level ${nextLevel.levelNumber}` : 'No next level',
                firstName: firstName,
                newHighScore: newHighScore
              });
            } catch (error) {
              console.error('Error generating AI feedback:', error);
            }

            // Update user's question history before processing badges
            await updateUserQuestionHistory(session, userId);

            // Now process badges
            await processBadgesAfterQuiz(userLevelSessionId);

            const topicsAccuracyUpdates = await computeTopicsAccuracyUpdates(session);

            // Delete the session
            await UserLevelSession.findByIdAndDelete(userLevelSessionId);

            return res.status(200).json({
              success: true,
              message: highScoreMessage ? 
                `Level completed successfully! You have unlocked the next level. ${highScoreMessage}` :
                'Level completed successfully! You have unlocked the next level.',
              data: {
                currentXp,
                requiredXp: session.timeRush?.requiredXp,
                minTime: Math.max(finalTime, maxTime), // Best time remaining
                timeTaken: finalTime,
                hasNextLevel: !!nextLevel,
                nextLevelNumber: nextLevel?.levelNumber,
                nextLevelId: nextLevel?._id,
                nextLevelAttemptType: nextLevel?.type,
                isNewHighScore: newHighScore,
                percentile,
                rank,
                leaderboard,
                topics: topicsAccuracyUpdates,
                aiFeedback
              }
            });
          } else {
            // Calculate progress: min(required score, current level scored) / required score * 100
            const requiredXp = session.timeRush?.requiredXp || 0;
            const achievedXp = Math.min(currentXp, requiredXp);
            const calculatedProgress = requiredXp > 0 ? Math.round((achievedXp / requiredXp) * 100) : 0;
            const currentProgress = userChapterLevel?.progress || 0;
            const progress = Math.max(calculatedProgress, currentProgress);

            // Update progress even if level not completed (don't update best time)
            await UserChapterLevel.findOneAndUpdate(
              {
                userId,
                chapterId: session.chapterId,
                levelId: session.levelId,
                attemptType: 'time_rush'
              },
              {
                $set: {
                  progress: progress
                }
              },
              { upsert: true }
            );

            // Calculate percentile based on current best time (if available)
            const percentileData = maxTime > 0 ? await calculateLevelPercentile(
              session.chapterId.toString(),
              session.levelId.toString(),
              maxTime,
              userId,
              'time_rush'
            ) : { percentile: 0, rank: 0, leaderboard: null };
            const percentile = percentileData.percentile;
            const rank = percentileData.rank;
            const leaderboard = percentileData.leaderboard;

            // Get level details for GPT feedback
            const level = await Level.findById(session.levelId);
            const levelTopics = level?.topics || [];
            const topicNames = await Topic.find({ _id: { $in: levelTopics } }).select('topic');
            const topicNamesList = topicNames.map(t => t.topic);
            
            // Get user's first name
            const userProfile = await UserProfile.findOne({ userId });
            const fullName = userProfile?.fullName || 'Student';
            const firstName = fullName.split(' ')[0] || 'Student';
            
            // Generate personalized feedback for incomplete level
            let aiFeedback = "Keep trying! You're getting closer to completing this level.";
            try {
              aiFeedback = await getShortLevelFeedback({
                levelName: level?.name || 'Level',
                levelTopics: topicNamesList,
                studentXP: currentXp,
                requiredXP: session.timeRush?.requiredXp || 0,
                accuracy: Math.round((session.questionsAnswered?.correct?.length || 0) / (session.questionBank.length || 1) * 100),
                timeTaken: `${Math.floor(finalTime / 60)}:${(finalTime % 60).toFixed(1)}`,
                levelResult: 'incomplete',
                nextLevel: 'Retry this level',
                firstName: firstName,
                newHighScore: newHighScore
              });
            } catch (error) {
              console.error('Error generating AI feedback:', error);
            }

            // Update user's question history before processing badges
            await updateUserQuestionHistory(session, userId);

            // Before deleting the session, process badges
            await processBadgesAfterQuiz(userLevelSessionId);

            const topicsAccuracyUpdates = await computeTopicsAccuracyUpdates(session);

            // Delete the session
            await UserLevelSession.findByIdAndDelete(userLevelSessionId);
            console.log("Check ",newHighScore);
            return res.status(200).json({
              success: true,
              message: highScoreMessage ? 
                `Level ended. You need more XP to complete this level. ${highScoreMessage}` :
                'Level ended. You need more XP to complete this level.',
              data: {
                currentXp,
                requiredXp: session.timeRush?.requiredXp,
                minTime: maxTime, // Best time remaining
                timeTaken: finalTime,
                xpNeeded: (session.timeRush?.requiredXp || 0) - currentXp,
                hasNextLevel: false,
                nextLevelNumber: null,
                nextLevelId: null,
                nextLevelAttemptType: null,
                isNewHighScore: newHighScore,
                percentile,
                rank,
                leaderboard,
                topics: topicsAccuracyUpdates,
                aiFeedback
              }
            });
          }
        } else {
          // Precision Path: Check if current time is better than min time
          const finalTime = currentTime || session.precisionPath?.currentTime || 0;
          const minTime = userChapterLevel?.precisionPath?.minTime || Infinity;
          const currentXp = session.precisionPath?.currentXp || 0;
          
          // Check if user has enough XP
          if (currentXp >= (session.precisionPath?.requiredXp || 0)) {
            // Level completed - check and update best time
            if (finalTime < minTime) {
              newHighScore = true;
              let totalMilliseconds = Math.floor(finalTime * 1000); // convert to ms
              let minutes = Math.floor(totalMilliseconds / 60000);
              let seconds = Math.floor((totalMilliseconds % 60000) / 1000);
              let milliseconds = totalMilliseconds % 1000;

              let formatted = `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
              highScoreMessage = `New best time: ${formatted}!`;
            }

            // Find the current level
            const currentLevel = await Level.findById(session.levelId);
            if (!currentLevel) {
              throw new Error('Level not found');
            }

            // Find the next level in the same chapter with the same type
            const nextLevel = await Level.findOne({
              chapterId: session.chapterId,
              levelNumber: currentLevel.levelNumber + 1,
              status: true
            }).select('_id levelNumber type');

            // Calculate progress: min(required score, current level scored) / required score * 100
            const requiredXp = session.precisionPath?.requiredXp || 0;
            const achievedXp = Math.min(currentXp, requiredXp);
            const calculatedProgress = requiredXp > 0 ? Math.round((achievedXp / requiredXp) * 100) : 0;
            const currentProgress = userChapterLevel?.progress || 0;
            const progress = Math.max(calculatedProgress, currentProgress);

            // Update UserChapterLevel for current level
            await UserChapterLevel.findOneAndUpdate(
              {
                userId,
                chapterId: session.chapterId,
                levelId: session.levelId,
                attemptType: 'precision_path'
              },
              {
                $set: {
                  status: 'completed',
                  completedAt: new Date(),
                  'precisionPath.minTime': Math.min(finalTime, minTime),
                  progress: progress
                }
              },
              { upsert: true }
            );

            // Update user's totalCoins and health when level is completed
            //check if todays date is 1 more than last attempt date 
            const currentMonth = new Date().toISOString().slice(0, 7).replace('-', '/'); // YYYY/MM
            await UserProfile.findOneAndUpdate(
              { userId },
              { 
                $inc: { 
                  totalCoins: currentXp, 
                  health: 1,
                  [`monthlyXp.${currentMonth}`]: currentXp
                }
              },
              { upsert: true }
            );
            
            // Ensure health doesn't exceed 6
            await UserProfile.findOneAndUpdate(
              { userId, health: { $gt: 6 } },
              { $set: { health: 6 } }
            );

            // If next level exists, check if UserChapterLevel already exists for it
            if (nextLevel && typeof nextLevel.levelNumber === 'number' && !isNaN(nextLevel.levelNumber)) {
              const existingNextLevel = await UserChapterLevel.findOne({
                userId,
                chapterId: session.chapterId,
                levelId: nextLevel._id,
                attemptType: nextLevel.type
              });

              // Only create if it doesn't exist
              if (!existingNextLevel) {
                await UserChapterLevel.create({
                  userId,
                  chapterId: session.chapterId,
                  levelId: nextLevel._id,
                  attemptType: nextLevel.type,
                  status: 'not_started',
                  levelNumber: nextLevel.levelNumber,
                  // Set mode-specific fields based on next level's type
                  ...(nextLevel.type === 'time_rush' ? {
                    timeRush: {
                      minTime: null,
                      attempts: 0,
                      requiredXp: nextLevel.timeRush?.requiredXp || 0,
                      timeLimit: nextLevel.timeRush?.totalTime || 0
                    }
                  } : {
                    precisionPath: {
                      minTime: null,
                      attempts: 0,
                      requiredXp: nextLevel.precisionPath?.requiredXp || 0
                    }
                  })
                });
              }
            }

            // Calculate percentile based on minTime
            const percentileResult = await calculateLevelPercentile(
              session.chapterId.toString(),
              session.levelId.toString(),
              Math.min(finalTime, minTime),
              userId,
              'precision_path'
            );
            const percentile = percentileResult.percentile;
            const rank = percentileResult.rank;
            const leaderboard = percentileResult.leaderboard;

            // Get level details for GPT feedback
            const level = await Level.findById(session.levelId);
            const levelTopics = level?.topics || [];
            const topicNames = await Topic.find({ _id: { $in: levelTopics } }).select('topic');
            const topicNamesList = topicNames.map(t => t.topic);
            
            // Get user's first name
            const userProfile = await UserProfile.findOne({ userId });
            const fullName = userProfile?.fullName || 'Student';
            const firstName = fullName.split(' ')[0] || 'Student';
            
            // Generate personalized feedback
            let aiFeedback = "Great job completing this level!";
            try {
              aiFeedback = await getShortLevelFeedback({
                levelName: level?.name || 'Level',
                levelTopics: topicNamesList,
                studentXP: currentXp,
                requiredXP: session.precisionPath?.requiredXp || 0,
                accuracy: Math.round((session.questionsAnswered?.correct?.length || 0) / (session.questionBank.length || 1) * 100),
                timeTaken: `${Math.floor(finalTime / 60)}:${(finalTime % 60).toFixed(1)}`,
                levelResult: 'completed',
                nextLevel: nextLevel ? `Level ${nextLevel.levelNumber}` : 'No next level',
                firstName: firstName,
                newHighScore: newHighScore
              });
            } catch (error) {
              console.error('Error generating AI feedback:', error);
            }

            // Update user's question history before processing badges
            await updateUserQuestionHistory(session, userId);

            // Before deleting the session, process badges
            await processBadgesAfterQuiz(userLevelSessionId);

            const topicsAccuracyUpdates = await computeTopicsAccuracyUpdates(session);

            // Delete the session
            await UserLevelSession.findByIdAndDelete(userLevelSessionId);

            return res.status(200).json({
              success: true,
              message: highScoreMessage ? 
                `Level completed successfully! You have unlocked the next level. ${highScoreMessage}` :
                'Level completed successfully! You have unlocked the next level.',
              data: {
                currentXp,
                requiredXp: session.precisionPath?.requiredXp,
                timeTaken: finalTime,
                bestTime: Math.min(finalTime, minTime),
                hasNextLevel: !!nextLevel,
                nextLevelNumber: nextLevel?.levelNumber,
                nextLevelId: nextLevel?._id,
                nextLevelAttemptType: nextLevel?.type,
                isNewHighScore: newHighScore,
                percentile,
                rank,
                leaderboard,
                topics: topicsAccuracyUpdates,
                aiFeedback
              }
            });
          } else {
            // Calculate progress: min(required score, current level scored) / required score * 100
            const requiredXp = session.precisionPath?.requiredXp || 0;
            const achievedXp = Math.min(currentXp, requiredXp);
            const calculatedProgress = requiredXp > 0 ? Math.round((achievedXp / requiredXp) * 100) : 0;
            const currentProgress = userChapterLevel?.progress || 0;
            const progress = Math.max(calculatedProgress, currentProgress);

            // Update progress even if level not completed
            await UserChapterLevel.findOneAndUpdate(
              {
                userId,
                chapterId: session.chapterId,
                levelId: session.levelId,
                attemptType: 'precision_path'
              },
              {
                $set: {
                  progress: progress
                }
              },
              { upsert: true }
            );

            // Level not completed - don't update best time
            // Calculate percentile based on current best time (if available)
            const percentileData = minTime !== Infinity ? await calculateLevelPercentile(
              session.chapterId.toString(),
              session.levelId.toString(),
              minTime,
              userId,
              'precision_path'
            ) : { percentile: 0, rank: 0, leaderboard: null };
            const percentile = percentileData.percentile;
            const rank = percentileData.rank;
            const leaderboard = percentileData.leaderboard;

            // Get level details for GPT feedback
            const level = await Level.findById(session.levelId);
            const levelTopics = level?.topics || [];
            const topicNames = await Topic.find({ _id: { $in: levelTopics } }).select('topic');
            const topicNamesList = topicNames.map(t => t.topic);
            
            // Get user's first name
            const userProfile = await UserProfile.findOne({ userId });
            const fullName = userProfile?.fullName || 'Student';
            const firstName = fullName.split(' ')[0] || 'Student';
            
            // Generate personalized feedback for incomplete level
            let aiFeedback = "Keep trying! You're getting closer to completing this level.";
            try {
              aiFeedback = await getShortLevelFeedback({
                levelName: level?.name || 'Level',
                levelTopics: topicNamesList,
                studentXP: currentXp,
                requiredXP: session.precisionPath?.requiredXp || 0,
                accuracy: Math.round((session.questionsAnswered?.correct?.length || 0) / (session.questionBank.length || 1) * 100),
                timeTaken: `${Math.floor(finalTime / 60)}:${(finalTime % 60).toFixed(1)}`,
                levelResult: 'incomplete',
                nextLevel: 'Retry this level',
                firstName: firstName,
                newHighScore: newHighScore
              });
            } catch (error) {
              console.error('Error generating AI feedback:', error);
            }

            // Update user's question history before processing badges
            await updateUserQuestionHistory(session, userId);

            // Before deleting the session, process badges
            await processBadgesAfterQuiz(userLevelSessionId);

            const topicsAccuracyUpdates = await computeTopicsAccuracyUpdates(session);

            // Delete the session
            await UserLevelSession.findByIdAndDelete(userLevelSessionId);

            return res.status(200).json({
              success: true,
              message: 'Level ended. You need more XP to complete this level.',
              data: {
                currentXp,
                requiredXp: session.precisionPath?.requiredXp,
                timeTaken: finalTime,
                bestTime: minTime,
                xpNeeded: (session.precisionPath?.requiredXp || 0) - currentXp,
                hasNextLevel: false,
                nextLevelNumber: null,
                nextLevelId: null,
                nextLevelAttemptType: null,
                percentile,
                rank,
                leaderboard,
                topics: topicsAccuracyUpdates,
                aiFeedback
              }
            });
          }
        }
      } catch (error) {
        console.error('Error ending level:', error);
        return res.status(500).json({
          success: false,
          error: error.message || 'Server Error'
        });
      }
    }) as unknown as RequestHandler);

    export default router; 