import { Question } from "../../../models/Questions";
import { IQuestionTs, QuestionTs } from "./../../../models/QuestionTs";
import { IUserChapterSession } from "./../../../models/UserChapterSession";
import mongoose from "mongoose";
import { QUESTION_FETCH_LIMIT } from "../../../config/constants";

export const fetchQuestionsByChapterIdAndMuRange = async ({
	chapterId,
	userMu,
	excludeQuestionIds = [],
}: {
	chapterId: string;
	userMu: number;
	excludeQuestionIds?: string[];
}): Promise<IQuestionTs[]> => {
	console.log(`[FetchQuestions] Starting fetchQuestionsByChapterIdAndMuRange`);
	console.log(`[FetchQuestions] Parameters:`, {
		chapterId,
		userMu,
		excludeQuestionIdsCount: excludeQuestionIds.length,
		excludeQuestionIds: excludeQuestionIds,
		QUESTION_FETCH_LIMIT
	});

	// Start with initial mu range: user mu ± 1
	let muMin = userMu - 1;
	let muMax = userMu + 1;
	
	const allFetchedQuestions: IQuestionTs[] = [];
	const fetchedQuestionIds = new Set<string>(excludeQuestionIds);
	
	const targetFetchLimit = 2 * QUESTION_FETCH_LIMIT;
	console.log(`[FetchQuestions] Initial state:`, {
		muMin,
		muMax,
		initialExcludedCount: excludeQuestionIds.length,
		targetLimit: targetFetchLimit
	});
	
	let iterationCount = 0;
	
	// Iteratively expand mu range until we have enough questions
	while (allFetchedQuestions.length < targetFetchLimit) {
		iterationCount++;
		console.log(`[FetchQuestions] Iteration ${iterationCount}:`, {
			muRange: `[${muMin.toFixed(2)}, ${muMax.toFixed(2)}]`,
			currentFetchedCount: allFetchedQuestions.length,
			remainingNeeded: targetFetchLimit - allFetchedQuestions.length,
			excludedQuestionIdsCount: fetchedQuestionIds.size
		});

		const queryFilter = {
			chapterId,
			"difficulty.mu": { $gte: muMin, $lte: muMax },
			quesId: { $nin: Array.from(fetchedQuestionIds) },
			type: { $in: ['single', 'multicorrect'] },
		};
		console.log(`[FetchQuestions] Query filter:`, JSON.stringify(queryFilter, null, 2));

		const questions = await QuestionTs.find(queryFilter)
			.populate("quesId")
			.sort({ "difficulty.mu": 1 }) // Sort by mu ascending
			.exec();
		
		console.log(`[FetchQuestions] Iteration ${iterationCount} - Found ${questions.length} questions from database`);
		
		let questionsAddedThisIteration = 0;
		
		// Add new questions that haven't been fetched yet
		for (const question of questions) {
			// Extract question ID - handle both populated (document with _id) and unpopulated (ObjectId) cases
			const quesIdValue = question.quesId;
			const questionId = quesIdValue?._id 
				? quesIdValue._id.toString() 
				: quesIdValue?.toString();
			
			if (questionId && !fetchedQuestionIds.has(questionId)) {
				allFetchedQuestions.push(question);
				fetchedQuestionIds.add(questionId);
				questionsAddedThisIteration++;
				
				console.log(`[FetchQuestions] Added question ${allFetchedQuestions.length}/${targetFetchLimit}:`, {
					questionId,
					questionMu: question.difficulty?.mu,
					questionType: question.type
				});
				
				// Stop if we've reached the limit
				if (allFetchedQuestions.length >= targetFetchLimit) {
					console.log(`[FetchQuestions] Reached target fetch limit (${targetFetchLimit}), breaking from inner loop`);
					break;
				}
			} else {
				console.log(`[FetchQuestions] Skipped question (already fetched or invalid ID):`, {
					questionId,
					alreadyInSet: questionId ? fetchedQuestionIds.has(questionId) : false
				});
			}
		}
		
		console.log(`[FetchQuestions] Iteration ${iterationCount} summary:`, {
			questionsFound: questions.length,
			questionsAdded: questionsAddedThisIteration,
			totalFetched: allFetchedQuestions.length,
			targetLimit: targetFetchLimit
		});
		
		// If we have enough questions, break
		if (allFetchedQuestions.length >= targetFetchLimit) {
			console.log(`[FetchQuestions] Reached target fetch limit (${targetFetchLimit}), breaking from while loop`);
			break;
		}
		
		// If no new questions were found in this iteration, break to avoid infinite loop
		if (questions.length === 0) {
			console.log(`[FetchQuestions] No questions found in iteration ${iterationCount}, breaking to avoid infinite loop`);
			// break;
		}
		
		// Expand mu range by 0.5 on each side
		muMin -= 0.5;
		muMax += 0.5;
		console.log(`[FetchQuestions] Expanding mu range for next iteration: [${muMin.toFixed(2)}, ${muMax.toFixed(2)}]`);
	}
	
	console.log(`[FetchQuestions] While loop completed after ${iterationCount} iterations`);
	console.log(`[FetchQuestions] Total questions fetched before shuffle: ${allFetchedQuestions.length}`);
	
	// Fisher–Yates (Knuth) Shuffle
	const fisherYatesShuffle = <T>(array: T[]): T[] => {
		const shuffled = [...array];
	  
		// time + crypto entropy
		let seed =
		  Date.now() ^
		  crypto.getRandomValues(new Uint32Array(1))[0];
	  
		for (let i = shuffled.length - 1; i > 0; i--) {
		  // xorshift32 to diffuse entropy
		  seed ^= seed << 13;
		  seed ^= seed >>> 17;
		  seed ^= seed << 5;
	  
		  const j = Math.abs(seed) % (i + 1);
		  [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
		}
	  
		return shuffled;
	  };
	  
	
	// Shuffle the fetched questions
	const shuffledQuestions = fisherYatesShuffle(allFetchedQuestions);
	console.log(`[FetchQuestions] Questions shuffled, count: ${shuffledQuestions.length}`);
	
	// Return exactly QUESTION_FETCH_LIMIT questions (or all available if less)
	const finalQuestions = shuffledQuestions.slice(0, QUESTION_FETCH_LIMIT);
	console.log(`[FetchQuestions] Final result:`, {
		finalCount: finalQuestions.length,
		requestedLimit: QUESTION_FETCH_LIMIT,
		chapterId,
		userMu,
		totalIterations: iterationCount,
		finalMuRange: `[${muMin.toFixed(2)}, ${muMax.toFixed(2)}]`
	});
	
	return finalQuestions;
};

export const fetchUserChapterSessionQuestionPool = async ({
	userChapterSession,
	userTrueSkillData
}: {
	userChapterSession: IUserChapterSession,
	userTrueSkillData: { mu: number; sigma: number }
}) => {
	const questionAttemptedList = userChapterSession.ongoing?.questions || [];
	const mu = userTrueSkillData.mu;

	const questions = await fetchQuestionsByChapterIdAndMuRange({
		chapterId: userChapterSession.chapterId.toString(),
		userMu: mu,
		excludeQuestionIds: questionAttemptedList.map(q => q.toString()),
	});

	return questions;
};

export const getQuestionCountByChapterId = async ({chapterId}: {chapterId: string}) => {
	const result = await Question.aggregate([
		{
			$match: {
				chapterId: new mongoose.Types.ObjectId(chapterId)
			}
		},
		{
			$count: "total"
		}
	]);
	return result[0]?.total || 0;
};
