import { logger } from "../../../utils/logger";
import { UserChapterSessionService } from "../userchapter-session/UserChapterSession";
import { Question } from "../../../models/Questions";
import { updateUserQuestionTrueskillBatch } from "../userchapter-session/TrueskillHandler";
import { QuestionTs } from "../../../models/QuestionTs";
import mongoose from "mongoose";

interface AnswerSubmission {
	questionId: string;
	answerIndex: number | number[] | null;
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
			questionMap.set((q._id as mongoose.Types.ObjectId).toString(), q);
		});

		// Process each answer and check correctness
		let questionsCorrect = 0;
		let questionsIncorrect = 0;
		let questionsAttempted = 0;
		let currentScore = 0;

		const processedAnswers: Array<{ questionId: string; answerIndex: number | number[] | null; isCorrect: boolean }> = [];

		for (const answer of answers) {
			const question = questionMap.get(answer.questionId);
			if (!question) {
				console.log(`Question not found: ${answer.questionId}`);
				continue;
			}

			// Skip unanswered questions
			if (answer.answerIndex === null || (Array.isArray(answer.answerIndex) && answer.answerIndex.length === 0)) {
				processedAnswers.push({
					questionId: answer.questionId,
					answerIndex: null,
					isCorrect: false,
				});
				continue;
			}

			// Determine if question is multicorrect
			const isMulticorrect = question.type === 'multicorrect';
			let isCorrect: boolean;

			if (isMulticorrect) {
				// For multicorrect: user must select ALL correct answers and NO incorrect answers
				const userAnswers = Array.isArray(answer.answerIndex) ? answer.answerIndex : [answer.answerIndex];
				const correctAnswers = question.correct;
				
				// Check if arrays have same length and contain same elements (order doesn't matter)
				const userAnswersSorted = [...userAnswers].sort((a, b) => a - b);
				const correctAnswersSorted = [...correctAnswers].sort((a, b) => a - b);
				
				isCorrect = userAnswersSorted.length === correctAnswersSorted.length &&
					userAnswersSorted.every((val, idx) => val === correctAnswersSorted[idx]);
			} else {
				// For single: check if answer is in correct array
				const userAnswer = Array.isArray(answer.answerIndex) ? answer.answerIndex[0] : answer.answerIndex;
				isCorrect = question.correct.includes(userAnswer);
			}

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

		userChapterSession.lastPlayedTs = new Date();
		await userChapterSession.save();

		// Update TrueSkill in batch for all answered questions
		await updateUserQuestionTrueskillBatch({
			sessionId: userChapterSession.ongoing._id!.toString(),
			answers: processedAnswers.filter(a => 
				a.answerIndex !== null && 
				!(Array.isArray(a.answerIndex) && a.answerIndex.length === 0)
			),
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

