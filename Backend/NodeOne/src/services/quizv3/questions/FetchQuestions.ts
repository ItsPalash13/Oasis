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
	// Start with initial mu range: user mu ± 1
	let muMin = userMu - 1;
	let muMax = userMu + 1;
	
	const allFetchedQuestions: IQuestionTs[] = [];
	const fetchedQuestionIds = new Set<string>(excludeQuestionIds);
	
	// Iteratively expand mu range until we have enough questions
	while (allFetchedQuestions.length < QUESTION_FETCH_LIMIT) {
		const questions = await QuestionTs.find({
			chapterId,
			"difficulty.mu": { $gte: muMin, $lte: muMax },
			quesId: { $nin: Array.from(fetchedQuestionIds) },
			type: { $in: ['single', 'multicorrect'] },
		})
			.populate("quesId")
			.sort({ "difficulty.mu": 1 }) // Sort by mu ascending
			.exec();
		
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
				
				// Stop if we've reached the limit
				if (allFetchedQuestions.length >= QUESTION_FETCH_LIMIT) {
					break;
				}
			}
		}
		
		// If we have enough questions, break
		if (allFetchedQuestions.length >= QUESTION_FETCH_LIMIT) {
			break;
		}
		
		// If no new questions were found in this iteration, break to avoid infinite loop
		if (questions.length === 0) {
			break;
		}
		
		// Expand mu range by 0.5 on each side
		muMin -= 0.5;
		muMax += 0.5;
	}
	
	// Shuffle the fetched questions
	const shuffledQuestions = allFetchedQuestions.sort(() => Math.random() - 0.5);
	
	// Return exactly QUESTION_FETCH_LIMIT questions (or all available if less)
	return shuffledQuestions.slice(0, QUESTION_FETCH_LIMIT);
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
