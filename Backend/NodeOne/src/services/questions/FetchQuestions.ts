import { IQuestionTs, QuestionTs } from "models/QuestionTs";

export const fetchQuestionsByChapterIdAndMu = async ({
	chapterId,
	mu,
	muFilter
}: {
	chapterId: string;
	mu: number;
	muFilter: 'greater' | 'lesser';
}): Promise<IQuestionTs[]> => {

	const muFilterObject = muFilter === 'greater' ? { $gt: mu } : { $lte: mu };

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
