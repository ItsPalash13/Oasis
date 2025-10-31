import { IQuestionTs, QuestionTs } from "models/QuestionTs";

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