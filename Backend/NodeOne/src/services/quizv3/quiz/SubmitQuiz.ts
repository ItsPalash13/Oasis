import { logger } from "../../../utils/logger";
import { UserChapterSessionService } from "../userchapter-session/UserChapterSession";
import { Question } from "../../../models/Questions";
import { updateUserQuestionTrueskillBatch } from "../userchapter-session/TrueskillHandler";
import { QuestionTs } from "../../../models/QuestionTs";
import mongoose from "mongoose";
import UserRatingService from "../user/rating/UserRatingService";
import { UserProfile } from "../../../models/UserProfile";
import { getQuestionCountByChapterId } from "../questions/FetchQuestions";

interface AnswerSubmission {
	questionId: string;
	answerIndex: number | number[] | null;
}

const submitQuizSession = async ({ sessionId, answers }: { sessionId?: string; answers: AnswerSubmission[] }) => {
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
		let userChapterSession = await UserChapterSessionService.getCurrentSessionBySocketTicket({
			socketTicket: sessionId,
		});

		// Ensure ongoing exists, create if it doesn't
		if (!userChapterSession.ongoing) {
			userChapterSession.ongoing = {
				_id: new mongoose.Types.ObjectId(sessionId),
				questions: [],
				answers: [],
				questionsAttempted: 0,
				questionsCorrect: 0,
				questionsIncorrect: 0,
				currentScore: 0,
			};
		}

		// Ensure analytics exists, create if it doesn't
		if (!userChapterSession.analytics) {
			userChapterSession.analytics = {
				totalQuestionsAttempted: 0,
				totalQuestionsCorrect: 0,
				totalQuestionsIncorrect: 0,
				questionsAttemptPerDay: 0,
				estDaysToComplete: 0,
				strengthStatus: 0,
			};
		}

		const userProfile = await UserProfile.findOne({ userId: userChapterSession.userId.toString() });
		if (!userProfile) {
			throw {
				statusCode: 404,
				code: "UserProfileNotFound",
				message: "User profile not found",
			};
		}

		// Get all question IDs from session
		const questionIds = userChapterSession.ongoing.questions.map((q) => q.toString());

		// Fetch all questions to check correctness
		const questions = await Question.find({
			_id: { $in: questionIds },
		}).exec();

		// Create a map for quick lookup
		const questionMap = new Map();
		questions.forEach((q) => {
			questionMap.set((q._id as any).toString(), q);
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

		// Check if question has correct answers
		if (!question.correct || !Array.isArray(question.correct)) {
			console.log(`Question ${answer.questionId} has invalid or missing correct answers`);
			isCorrect = false;
		} else if (isMulticorrect) {
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
		userChapterSession.ongoing.answers = answers.map((a) => ({
			questionId: new mongoose.Types.ObjectId(a.questionId),
			answerIndex: a.answerIndex,
		}));
		userChapterSession.ongoing.questionsAttempted = questionsAttempted;
		userChapterSession.ongoing.questionsCorrect = questionsCorrect;
		userChapterSession.ongoing.questionsIncorrect = questionsIncorrect;
		userChapterSession.ongoing.currentScore = currentScore;

		// update analytics
		userChapterSession.analytics.totalQuestionsAttempted += questionsAttempted;
		userChapterSession.analytics.totalQuestionsCorrect += questionsCorrect;
		userChapterSession.analytics.totalQuestionsIncorrect += questionsIncorrect;
		userChapterSession.analytics.questionsAttemptPerDay = Math.round(
			userChapterSession.analytics.totalQuestionsAttempted /
				Math.max(
					1,
					(new Date().getTime() - userChapterSession.lastPlayedTs.getTime()) / (1000 * 60 * 60 * 24)
				)
		);
		const questionCount = await getQuestionCountByChapterId({chapterId: userChapterSession.chapterId.toString()});
		const progressPercentage = (questionsCorrect / questionCount) * 100;
		userChapterSession.analytics.estDaysToComplete = userChapterSession.analytics.questionsAttemptPerDay * (100 / progressPercentage);
		


		const currentAccuracy = questionsAttempted > 0 ? (questionsCorrect / questionsAttempted) * 100 : 0;

		// Update TrueSkill in batch for all answered questions FIRST
		userChapterSession = await updateUserQuestionTrueskillBatch({
			sessionId: userChapterSession.ongoing._id!.toString(),
			answers: processedAnswers.filter(a => 
				a.answerIndex !== null && 
				!(Array.isArray(a.answerIndex) && a.answerIndex.length === 0)
			),
		});

		// Now update the userAttemptWindowList after getting the updated session
		if (!Array.isArray(userChapterSession.analytics.userAttemptWindowList)) {
			userChapterSession.analytics.userAttemptWindowList = [];
		}
	

		console.log("The userAttemptWindowList is: ", userChapterSession.analytics.userAttemptWindowList);
		// Keep only last 10 entries
		// LIMIT 10
		// if (userChapterSession.analytics.userAttemptWindowList.length > 10) {
		// 	userChapterSession.analytics.userAttemptWindowList.shift();
		// }

		const userOnAverageAccuracy = userChapterSession.analytics.userAttemptWindowList.reduce((sum, entry) => sum + entry.averageAccuracy, 0) / userChapterSession.analytics.userAttemptWindowList.length;

		// get updated strength with userOnAverageAccuracy (0-100) mapped to (0-5)
		const updatedStrength = Math.min(5, Math.max(0, Math.round((userOnAverageAccuracy / 100) * 5)));
		userChapterSession.analytics.strengthStatus = updatedStrength;
		userChapterSession.markModified('analytics.strengthStatus');

		// Update maxScore if current score is higher
		if (currentScore > userChapterSession.maxScore) {
			userChapterSession.maxScore = currentScore;
		}


		const updatedUserRating = await UserRatingService.calculateUserRatingByCurrentRatingAndMu({
			// currentRating: userChapterSession.userRating || USER_RATING_DEFAULT,
			chapterId: userChapterSession.chapterId,
			mu: userChapterSession.trueSkillScore?.mu || 3,
		});

		userChapterSession.userRating = updatedUserRating;
		userChapterSession.lastPlayedTs = new Date();


		userChapterSession.analytics.userAttemptWindowList.push({
			timestamp: new Date(),
			averageAccuracy: currentAccuracy,
			capturedRating: updatedUserRating,
		});

		// Mark the nested path as modified so Mongoose tracks the change
		userChapterSession.markModified('analytics.userAttemptWindowList');
		await userChapterSession.save();
		// Calculate accuracy
		const accuracy = questionsAttempted > 0 ? Math.round((questionsCorrect / questionsAttempted) * 100) : 0;

		// Initialize analytics if not present
		if (!userProfile.analytics) {
			userProfile.analytics = {
				totalQuestionsAttempted: 0,
				totalQuestionsCorrect: 0,
				totalQuestionsIncorrect: 0,
				strengths: [],
				weaknesses: [],
			};
		}

		// Initialize analytics properties if not present
		if (userProfile.analytics.totalQuestionsAttempted === undefined || userProfile.analytics.totalQuestionsAttempted === null) {
			userProfile.analytics.totalQuestionsAttempted = 0;
		}
		if (userProfile.analytics.totalQuestionsCorrect === undefined || userProfile.analytics.totalQuestionsCorrect === null) {
			userProfile.analytics.totalQuestionsCorrect = 0;
		}
		if (userProfile.analytics.totalQuestionsIncorrect === undefined || userProfile.analytics.totalQuestionsIncorrect === null) {
			userProfile.analytics.totalQuestionsIncorrect = 0;
		}
		if (!Array.isArray(userProfile.analytics.strengths)) {
			userProfile.analytics.strengths = [];
		}
		if (!Array.isArray(userProfile.analytics.weaknesses)) {
			userProfile.analytics.weaknesses = [];
		}

		// update UserProfile
		userProfile.analytics.totalQuestionsAttempted += questionsAttempted;
		userProfile.analytics.totalQuestionsCorrect += questionsCorrect;
		userProfile.analytics.totalQuestionsIncorrect += questionsIncorrect;

		if (updatedStrength >= 4) {
			userProfile.analytics.strengths.push(userChapterSession.chapterId);
			// Remove from weaknesses if present
			userProfile.analytics.weaknesses = userProfile.analytics.weaknesses.filter(
				(tid) => tid.toString() !== userChapterSession.chapterId.toString()
			);
		} else if (updatedStrength <= 2) {
			userProfile.analytics.weaknesses.push(userChapterSession.chapterId);
			// Remove from strengths if present
			userProfile.analytics.strengths = userProfile.analytics.strengths.filter(
				(tid) => tid.toString() !== userChapterSession.chapterId.toString()
			);
		}
		
		// Remove duplicates from strengths and weaknesses
		const seenStrengths = new Set<string>();
		userProfile.analytics.strengths = userProfile.analytics.strengths.filter((tid) => {
			const str = tid.toString();
			if (seenStrengths.has(str)) return false;
			seenStrengths.add(str);
			return true;
		});
		
		const seenWeaknesses = new Set<string>();
		userProfile.analytics.weaknesses = userProfile.analytics.weaknesses.filter((tid) => {
			const str = tid.toString();
			if (seenWeaknesses.has(str)) return false;
			seenWeaknesses.add(str);
			return true;
		});
		
		await userProfile.save();

		// Map processedAnswers to questionResults with only questionId and isCorrect
		const questionResults = processedAnswers.map((answer) => ({
			questionId: answer.questionId,
			isCorrect: answer.isCorrect,
		}));

		// Return results
		return {
			socketResponse: "results",
			responseData: {
				questionsCorrect,
				questionsIncorrect,
				questionsAttempted,
				userRating: userChapterSession.userRating,
				currentScore,
				accuracy,
				maxScore: userChapterSession.maxScore,
				questionResults,
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
