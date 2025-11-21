import { SIGMA_DECAY_CONST, MU_MIN, SIGMA_MIN, SIGMA_LT_SCALING_FACTOR, SIGMA_GT_SCALING_FACTOR } from "../../../config/constants";
import UserChapterSession, { IUserChapterSession } from "../../../models/UserChapterSession";
import { TrueSkill, Rating } from "ts-trueskill";
import { QuestionTs } from "../../../models/QuestionTs";
import mongoose from "mongoose";

const DEFAULT_SIGMA = 10;

const difficultyAccuracyMapping = {
	"easy": 0.9,
	"medium": 0.8,
	"hard": 0.5,
};

export const getUpdatedUserSigmaByLastPlayed = async ({ userChapterSession }: { userChapterSession: IUserChapterSession }) => {
	try {
		if (!userChapterSession) {
			return DEFAULT_SIGMA;
		}

		const lastPlayedTime = userChapterSession.lastPlayedTs;
		const currentSigma = userChapterSession.trueSkillScore?.sigma ?? DEFAULT_SIGMA;

		if (!lastPlayedTime) {
			return currentSigma;
		}

		const currentTime = new Date();
		const timeDiff = currentTime.getTime() - lastPlayedTime.getTime();
		const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));

		if (daysDiff <= 0) {
			return currentSigma;
		}

		const delta = 1 - Math.exp(-SIGMA_DECAY_CONST * daysDiff);
		const newUserSigma = currentSigma + currentSigma * delta;

		console.log("The new user sigma is before and after ", currentSigma, newUserSigma);
		return newUserSigma;
	} catch (error) {
		console.error("Error updating user sigma:", error);
		return userChapterSession?.trueSkillScore?.sigma ?? DEFAULT_SIGMA;
	}
};

interface TrueSkillUpdate {
	questionId: mongoose.Types.ObjectId;
	isCorrect: boolean;
	beforeUts: { mu: number; sigma: number };
	beforeQts: { mu: number; sigma: number };
	afterUts: { mu: number; sigma: number };
	afterQts: { mu: number; sigma: number };
}

/**
 * Update TrueSkill ratings for user and questions in batch.
 * Calculates all updates first, then applies them together.
 */
export const updateUserQuestionTrueskillBatch = async ({
	sessionId,
	answers,
}: {
	sessionId: string;
	answers: Array<{ questionId: string; answerIndex: number | null; isCorrect: boolean }>;
}): Promise<void> => {
	const sessionObjectId = new mongoose.Types.ObjectId(sessionId);
	
	// Load user session
	const userSession = await UserChapterSession.findOne({
		"ongoing._id": sessionObjectId,
	});
	
	if (!userSession) {
		console.log("No user session found");
		return;
	}

	// Filter out unanswered questions (answerIndex is null)
	const answeredQuestions = answers.filter(a => a.answerIndex !== null);
	
	if (answeredQuestions.length === 0) {
		console.log("No answered questions to process");
		return;
	}

	// Get all question TS entries
	const questionIds = answeredQuestions.map(a => new mongoose.Types.ObjectId(a.questionId));
	const questionTsList = await QuestionTs.find({
		quesId: { $in: questionIds }
	}).exec();

	// Create a map for quick lookup
	const questionTsMap = new Map();
	questionTsList.forEach(qts => {
		questionTsMap.set(qts.quesId.toString(), qts);
	});

	// Current user ratings (will be updated as we process each question)
	let currentUserMu = userSession.trueSkillScore?.mu ?? 15;
	let currentUserSigma = userSession.trueSkillScore?.sigma ?? 10;

	// Store all updates to apply later
	const updates: TrueSkillUpdate[] = [];
	const questionUpdates: Map<string, { mu: number; sigma: number }> = new Map();

	const env = new TrueSkill();
	const numberOfAttempts = userSession.ongoing?.questionsAttempted || 0;
	const questionsCorrect = userSession.ongoing?.questionsCorrect || 0;
	const accuracy = numberOfAttempts > 0 ? questionsCorrect / numberOfAttempts : 0;

	// Calculate all TrueSkill updates first
	for (const answer of answeredQuestions) {
		const questionTs = questionTsMap.get(answer.questionId);
		if (!questionTs) {
			console.log(`Question TS not found for questionId: ${answer.questionId}`);
			continue;
		}

		const currentQMu = questionTs.difficulty?.mu ?? 15;
		const currentQSigma = questionTs.difficulty?.sigma ?? 10;

		// Store before values
		const beforeUts = { mu: currentUserMu, sigma: currentUserSigma };
		const beforeQts = { mu: currentQMu, sigma: currentQSigma };

		// Calculate TrueSkill update
		const userRating = new Rating(currentUserMu, currentUserSigma);
		const questionRating = new Rating(currentQMu, currentQSigma);

		// Rank 1 is winner (lower is better). If user is correct, user wins
		const ranks = answer.isCorrect ? [1, 2] : [2, 1];
		const [[newUserRating], [newQuestionRating]] = env.rate([[userRating], [questionRating]], ranks);

		// Adjust user sigma based on accuracy (similar to v2 logic)
		let userSigmaUpdated = newUserRating.sigma;
		if (numberOfAttempts + answeredQuestions.length >= 3) {
			const targetAccuracy = difficultyAccuracyMapping[
				currentQMu <= 10 ? "easy" : currentQMu <= 20 ? "medium" : "hard"
			] || 0.7;

			const accuracyDelta = accuracy - targetAccuracy;
			let scalingFactor = SIGMA_LT_SCALING_FACTOR;
			if (accuracyDelta >= 0) {
				scalingFactor = SIGMA_GT_SCALING_FACTOR;
			}

			userSigmaUpdated += -(accuracyDelta) * Math.sqrt(accuracy * (1 - accuracy)) * scalingFactor;
		}

		// Apply lower limits
		const clampedUserMu = Math.max(newUserRating.mu, MU_MIN);
		const clampedUserSigma = Math.max(userSigmaUpdated, SIGMA_MIN);
		const clampedQuestionMu = Math.max(newQuestionRating.mu, MU_MIN);
		const clampedQuestionSigma = Math.max(newQuestionRating.sigma, SIGMA_MIN);

		// Update current user ratings for next iteration (sequential updates)
		currentUserMu = clampedUserMu;
		currentUserSigma = clampedUserSigma;

		// Store update
		updates.push({
			questionId: new mongoose.Types.ObjectId(answer.questionId),
			isCorrect: answer.isCorrect,
			beforeUts,
			beforeQts,
			afterUts: { mu: clampedUserMu, sigma: clampedUserSigma },
			afterQts: { mu: clampedQuestionMu, sigma: clampedQuestionSigma },
		});

		// Store question update
		questionUpdates.set(answer.questionId, {
			mu: clampedQuestionMu,
			sigma: clampedQuestionSigma,
		});
	}

	// Now apply all updates in batch
	userSession.trueSkillScore = {
		mu: currentUserMu,
		sigma: currentUserSigma,
	};

	// Append changelog entries
	if (!userSession.tsChangeLogs) {
		userSession.tsChangeLogs = [];
	}
	updates.forEach(update => {
		userSession.tsChangeLogs!.push({
			timestamp: new Date(),
			questionId: update.questionId,
			userId: userSession.userId,
			isCorrect: update.isCorrect,
			beforeUts: update.beforeUts,
			beforeQts: update.beforeQts,
			afterUts: update.afterUts,
			afterQts: update.afterQts,
		});
	});

	await userSession.save();
	console.log("Updated user session TrueSkill in batch");

	// Update all question TS entries
	for (const [questionId, update] of questionUpdates.entries()) {
		const questionTs = questionTsMap.get(questionId);
		if (questionTs) {
			const updateEntry = updates.find(u => u.questionId.toString() === questionId);
			questionTs.difficulty = {
				mu: update.mu,
				sigma: update.sigma,
			};

			// Append changelog entry to question ts
			(questionTs as any).tsChangeLogs = (questionTs as any).tsChangeLogs || [];
			if (updateEntry) {
				(questionTs as any).tsChangeLogs.push({
					timestamp: new Date(),
					questionId: new mongoose.Types.ObjectId(questionId),
					userId: userSession.userId,
					isCorrect: updateEntry.isCorrect,
					beforeUts: updateEntry.beforeUts,
					beforeQts: updateEntry.beforeQts,
					afterUts: updateEntry.afterUts,
					afterQts: updateEntry.afterQts,
				});
			}

			await questionTs.save();
		}
	}

	console.log("Updated all question TrueSkill scores in batch");
};
