import { IQuestionTs, QuestionTs } from "./../../models/QuestionTs";
import { IUserChapterTicket } from "./../../models/UserChapterTicket";
import { ISkill } from "../../models/UserTs";

export const fetchUserChapterTicketQuestionPool = async ({
	userChapterTicket,
	userTrueSkillData
}: {
	userChapterTicket: IUserChapterTicket,
	userTrueSkillData: ISkill
}) => {

	// if questionPool < 5, fetch 10 questions not in questionPool
	const questionPool = userChapterTicket.ongoing.questionPoolUsed || [];
	const muFilterObject =   { $lte: userTrueSkillData.mu };

	if (questionPool.length < 5) {
		const questions = await QuestionTs.find({
			chapterId: userChapterTicket.chapterId,
			"difficulty.mu": muFilterObject,
			quesId: { $nin: questionPool },
		})
			.populate("quesId")
			.sort({ "difficulty.mu": 1 }) // Sort by mu ascending (easiest first)
			.limit(10)
			.exec();
		return questions;
	}
	return [];
};
export const fetchQuestionsByChapterIdAndMu = async ({
	chapterId,
	mu,
	muFilter,
}: {
	chapterId: string;
	mu: number;
	muFilter: "greater" | "lesser";
}): Promise<IQuestionTs[]> => {
	const muFilterObject = muFilter === "greater" ? { $gt: mu } : { $lte: mu };

	const questions = await QuestionTs.find({
		chapterId,
		"difficulty.mu": muFilterObject,
	})
		.populate("quesId")
		.sort({ "difficulty.mu": 1 }) // Sort by mu ascending (easiest first)
		.exec();

	return questions;
};

export const fetchQuestionByMu = async ({
	mu,
}: {
	mu: number;
}): Promise<IQuestionTs | null> => {
	const question = await QuestionTs.findOne({
		"difficulty.mu": { $gt: mu },
	})
		.populate("quesId")
		.sort({ "difficulty.mu": 1 }) // Sort by mu ascending (easiest first)
		.exec();

	if (!question) {
		return null;
	}
	return question;
};
