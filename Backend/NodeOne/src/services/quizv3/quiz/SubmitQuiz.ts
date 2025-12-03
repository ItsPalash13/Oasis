import { logger } from "../../../utils/logger";
import { UserChapterSessionService } from "../userchapter-session/UserChapterSession";
import { Question } from "../../../models/Questions";
import { updateUserQuestionTrueskillBatch } from "../userchapter-session/TrueskillHandler";
import { QuestionTs } from "../../../models/QuestionTs";
import mongoose from "mongoose";
import { USER_RATING_DEFAULT } from "../../../config/constants";
import UserRatingService from "../user/rating/UserRatingService";
import { UserProfile } from "../../../models/UserProfile";
import { getQuestionCountByChapterId } from "../questions/FetchQuestions";

interface AnswerSubmission {
	questionId: string;
	answerIndex: number | null;
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
			console.log("Question IS ", JSON.stringify(question, null, 2));
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
		const currentStrength = Math.min(
			5,
			Math.floor(
				(userChapterSession.analytics.totalQuestionsCorrect /
					Math.max(1, userChapterSession.analytics.totalQuestionsAttempted)) *
					5
			)
		);
		const updatedStrength = Math.round(
			0.6 * currentStrength + 0.4 * userChapterSession.analytics.strengthStatus
		);
		userChapterSession.analytics.strengthStatus = updatedStrength;

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
			answers: processedAnswers.filter((a) => a.answerIndex !== null),
		});

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
