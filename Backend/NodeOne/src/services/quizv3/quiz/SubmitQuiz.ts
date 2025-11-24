import { logger } from "../../../utils/logger";
import { UserChapterSessionService } from "../userchapter-session/UserChapterSession";
import { Question } from "../../../models/Questions";
import { updateUserQuestionTrueskillBatch } from "../userchapter-session/TrueskillHandler";
import { QuestionTs } from "../../../models/QuestionTs";
import mongoose from "mongoose";
import { USER_RATING_DEFAULT } from "../../../config/constants";
import UserRatingService from "../user/rating/UserRatingService";

interface AnswerSubmission {
	questionId: string;
	answerIndex: number | null;
}

const submitQuizSession = async ({ 
	sessionId, 
	answers 
}: { 
	sessionId?: string; 
	answers: AnswerSubmission[];
}) => {
	try {
		if (!sessionId) {
			return {
				socketResponse: "quizError",
				responseData: {
					type: "failure",
					message: "Session ID missing",
				},
			};
		}

		if (!answers || !Array.isArray(answers)) {
			return {
				socketResponse: "quizError",
				responseData: {
					type: "failure",
					message: "Answers array is required",
				},
			};
		}

		console.log("SUBMIT QUIZ V3 - SessionId:", sessionId, "Answers:", answers);

		// Get user session
		const userChapterSession = await UserChapterSessionService.getCurrentSessionBySocketTicket({
			socketTicket: sessionId,
		});

		// Ensure ongoing exists
		if (!userChapterSession.ongoing) {
			return {
				socketResponse: "quizError",
				responseData: {
					type: "failure",
					message: "Ongoing session not found",
				},
			};
		}

		// Get all question IDs from session
		const questionIds = userChapterSession.ongoing.questions.map(q => q.toString());
		
		// Fetch all questions to check correctness
		const questions = await Question.find({
			_id: { $in: questionIds }
		}).exec();

		// Create a map for quick lookup
		const questionMap = new Map();
		questions.forEach(q => {
			questionMap.set((q._id as any).toString(), q);
		});

		// Process each answer and check correctness
		let questionsCorrect = 0;
		let questionsIncorrect = 0;
		let questionsAttempted = 0;
		let currentScore = 0;

		const processedAnswers: Array<{ questionId: string; answerIndex: number | null; isCorrect: boolean }> = [];

		for (const answer of answers) {
			const question = questionMap.get(answer.questionId);
			if (!question) {
				console.log(`Question not found: ${answer.questionId}`);
				continue;
			}

			// Skip unanswered questions
			if (answer.answerIndex === null) {
				processedAnswers.push({
					questionId: answer.questionId,
					answerIndex: null,
					isCorrect: false,
				});
				continue;
			}

			// Check if answer is correct
			const isCorrect = question.correct.includes(answer.answerIndex);
			questionsAttempted++;

			if (isCorrect) {
				questionsCorrect++;
			} else {
				questionsIncorrect++;
			}

			processedAnswers.push({
				questionId: answer.questionId,
				answerIndex: answer.answerIndex,
				isCorrect,
			});

			// Calculate score based on question TS
			const questionTs = await QuestionTs.findOne({ quesId: answer.questionId }).exec();
			if (questionTs) {
				if (isCorrect) {
					currentScore += questionTs.xp?.correct || 2;
				} else {
					const xpToSubtract = questionTs.xp?.incorrect ?? 1;
					currentScore = Math.max(0, currentScore - xpToSubtract);
				}
			}
		}

		// Update session with answers and stats
		userChapterSession.ongoing.answers = answers.map(a => ({
			questionId: new mongoose.Types.ObjectId(a.questionId),
			answerIndex: a.answerIndex
		}));
		userChapterSession.ongoing.questionsAttempted = questionsAttempted;
		userChapterSession.ongoing.questionsCorrect = questionsCorrect;
		userChapterSession.ongoing.questionsIncorrect = questionsIncorrect;
		userChapterSession.ongoing.currentScore = currentScore;

		// Update maxScore if current score is higher
		if (currentScore > userChapterSession.maxScore) {
			userChapterSession.maxScore = currentScore;
		}

		const updatedUserRating = UserRatingService.calculateUserRatingByCurrentRatingAndMu({
			currentRating: userChapterSession.userRating || USER_RATING_DEFAULT,
			mu: userChapterSession.trueSkillScore?.mu || 3,
		});

		userChapterSession.userRating = updatedUserRating;
		userChapterSession.lastPlayedTs = new Date();
		await userChapterSession.save();

		// Update TrueSkill in batch for all answered questions
		await updateUserQuestionTrueskillBatch({
			sessionId: userChapterSession.ongoing._id!.toString(),
			answers: processedAnswers.filter(a => a.answerIndex !== null),
		});

		// Calculate accuracy
		const accuracy = questionsAttempted > 0 
			? Math.round((questionsCorrect / questionsAttempted) * 100)
			: 0;

		// Return results
		return {
			socketResponse: "results",
			responseData: {
				questionsCorrect,
				questionsIncorrect,
				questionsAttempted,
				currentScore,
				accuracy,
				maxScore: userChapterSession.maxScore,
			},
		};
	} catch (error: any) {
		logger.error("Error in submit V3:", error);
		return {
			socketResponse: "quizError",
			responseData: {
				type: "failure",
				message: error?.message || "Failed to submit quiz",
			},
		};
	}
};

export { submitQuizSession };

