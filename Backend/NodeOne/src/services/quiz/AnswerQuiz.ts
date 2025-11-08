import { logger } from "./../../utils/logger";
import { UserChapterSessionService } from "./../../services/UserChapterSession";
import { Question } from "./../../models/Questions";
import { IOngoingSession, IUserChapterTicket  } from "../../models/UserChapterTicket";
import mongoose, { mongo } from "mongoose";
import { QuestionTs } from "../../models/QuestionTs";
import { endQuizSession } from "./EndQuiz";

const answerQuizSession = async ({ answerIndex, sessionId }: { answerIndex: number; sessionId?: string }) => {
	try {
		let userChapterTicket = await UserChapterSessionService.getCurrentSessionBySocketTicket({
			socketTicket: sessionId!,
		});
		const questionId = userChapterTicket.ongoing.currentQuestionId;

		// Fetch the question to get the correct answer
		const wholeQuestionObject = await Question.findById(questionId);
		if (!wholeQuestionObject) {
			return {
				socketResponse: "quizError",
				responseData: {
					type: "failure",
					message: "Question not found",
				},
			};
		}

		const isCorrect = wholeQuestionObject.correct.includes(answerIndex);

		console.log(`User answered question ${questionId} with option index ${answerIndex}. Correct: ${isCorrect}`);
		const questionIdAsObject = new mongo.ObjectId(questionId);

		if (isCorrect) {
			userChapterTicket = await parseCorrectOption({
				currentQuestionId: questionIdAsObject,
				userChapterTicket,
			}) as any;
			// };
			await userChapterTicket.save();
		} else {
            userChapterTicket = await parseIncorrectOption({
                currentQuestionId: questionIdAsObject,
                userChapterTicket,
            }) as any;
			await userChapterTicket.save();

			console.log("The answer is incorrect ", isCorrect, answerIndex, wholeQuestionObject.correct);
			
			// Check if hearts are exhausted after processing incorrect answer
			if (userChapterTicket.ongoing.heartsLeft <= 0) {
				// Update TrueSkill before ending
				await UserChapterSessionService.updateUserQuestionTrueskill({
					userId: userChapterTicket.userId.toString(),
					questionId: questionId.toString(),
					isCorrect,
				});
				
				// Automatically end the quiz session
				return await endQuizSession({ sessionId, endReason: "hearts_exhausted" });
			}
		}

		await UserChapterSessionService.updateUserQuestionTrueskill({
			userId: userChapterTicket.userId.toString(),
			questionId: questionId.toString(),
			isCorrect,
		});

		const maxScoreReached = (userChapterTicket as any).__maxScoreReached || false;

		return {
			socketResponse: "result",
			responseData: {
				isCorrect,
				correctIndex: wholeQuestionObject!.correct[0], // sending first correct answer index
				correctOption: null,
				currentScore: userChapterTicket.ongoing.currentScore,
				heartsLeft: userChapterTicket.ongoing.heartsLeft,
				maxScoreReached: maxScoreReached,
			},
		};
	} catch (error: any) {
		logger.error("Error in answer:", error);
		return {
			socketResponse: "quizError",
			responseData: {
				type: "failure",
				message: error?.message || "Failed to submit answer",
			},
		};
	}
};

const parseCorrectOption = async ({
	currentQuestionId,
	userChapterTicket,
}: {
	currentQuestionId: mongoose.Types.ObjectId;
	userChapterTicket: IUserChapterTicket;
}): Promise<IUserChapterTicket> => {
	// Fetch the question to get the correct answer


    const questionTrueskillData = await QuestionTs.findOne({ quesId: currentQuestionId.toString() }).exec();
    
    const xpToAdd = questionTrueskillData!.xp.correct || 2;
	const newCurrentScore = userChapterTicket?.ongoing?.currentScore + xpToAdd;

	// Check if maxScore is crossed and hasn't been reached yet in this session
	let maxScoreReached = false;
	if (newCurrentScore > userChapterTicket.maxScore && !userChapterTicket.ongoing.maxScoreReached) {
		userChapterTicket.maxScore = newCurrentScore;
		maxScoreReached = true;
	}

	const updatedOngoingData: Partial<IOngoingSession> = {
		currentQuestionId: currentQuestionId,
		questionsAttempted: userChapterTicket?.ongoing?.questionsAttempted + 1,
		questionsCorrect: userChapterTicket?.ongoing?.questionsCorrect + 1,
		questionsIncorrect: userChapterTicket?.ongoing?.questionsIncorrect,
		currentStreak: 0,
		currentScore: newCurrentScore,
		heartsLeft: userChapterTicket?.ongoing?.heartsLeft,
		maxScoreReached: maxScoreReached || userChapterTicket?.ongoing?.maxScoreReached || false,
	};

	userChapterTicket.ongoing = {
		...userChapterTicket.ongoing,
		...(updatedOngoingData as IOngoingSession),
	};
	
	// Store maxScoreReached flag for return
	(userChapterTicket as any).__maxScoreReached = maxScoreReached;
	
	return userChapterTicket;
};

const parseIncorrectOption = async ({
	currentQuestionId,
	userChapterTicket,
}: {
	currentQuestionId: mongoose.Types.ObjectId;
	userChapterTicket: IUserChapterTicket;
}) => {

    const questionTrueskillData = await QuestionTs.findOne({ quesId: currentQuestionId.toString() }).exec();
    
    const xpToSubtract = questionTrueskillData?.xp?.incorrect ?? 1;
	const updatedOngoingData: Partial<IOngoingSession> = {
		currentQuestionId: currentQuestionId,
		questionsAttempted: userChapterTicket?.ongoing?.questionsAttempted + 1,
		questionsCorrect: userChapterTicket?.ongoing?.questionsCorrect,
		questionsIncorrect: userChapterTicket?.ongoing?.questionsIncorrect + 1,
		currentStreak: 0,
		currentScore: userChapterTicket?.ongoing?.currentScore - xpToSubtract,
		heartsLeft: userChapterTicket?.ongoing?.heartsLeft - 1,
	};

	// if WRONG, update questionPool and push it to last
	const questionPool = userChapterTicket.ongoing.questionPool ?? [];
	questionPool.push(currentQuestionId);

	//TODO not but will look at it tmrw
	userChapterTicket.ongoing = {
		...userChapterTicket.ongoing,
		...(updatedOngoingData as IOngoingSession),
	};
	userChapterTicket.ongoing.questionPool = questionPool;

	return userChapterTicket;
};

export { answerQuizSession };
