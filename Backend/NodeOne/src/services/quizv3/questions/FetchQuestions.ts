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
	// Fetch questions where question mu is within user mu ± 1
	const muMin = userMu - 1;
	const muMax = userMu + 1;

	const questions = await QuestionTs.find({
		chapterId,
		"difficulty.mu": { $gte: muMin, $lte: muMax },
		quesId: { $nin: excludeQuestionIds },
		type: { $in: ['single', 'multicorrect'] },
	})
		.populate("quesId")
		.sort({ "difficulty.mu": 1 }) // Sort by mu ascending
		.limit(QUESTION_FETCH_LIMIT)
		.exec();

	return questions;
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
