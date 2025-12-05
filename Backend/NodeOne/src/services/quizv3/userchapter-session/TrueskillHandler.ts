import { SIGMA_DECAY_CONST } from "../../../config/constants";
import UserChapterSession, { IUserChapterSession } from "../../../models/UserChapterSession";
import { TrueSkill, Rating } from "ts-trueskill";
import { QuestionTs } from "../../../models/QuestionTs";
import mongoose from "mongoose";

const DEFAULT_SIGMA = 10;

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
 * User rating is updated using a single multi-player match with all questions.
 * Question ratings are updated individually using 1v1 matches with initial user rating.
 */
export const updateUserQuestionTrueskillBatch = async ({
	sessionId,
	answers,
}: {
	sessionId: string;
	answers: Array<{ questionId: string; answerIndex: number | number[] | null; isCorrect: boolean }>;
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

	// Filter out unanswered questions (answerIndex is null or empty array)
	const answeredQuestions = answers.filter(a => 
		a.answerIndex !== null && 
		!(Array.isArray(a.answerIndex) && a.answerIndex.length === 0)
	);
	
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

	// Store initial user rating (same for all calculations)
	const initialUserMu = userSession.trueSkillScore?.mu ?? 15;
	const initialUserSigma = userSession.trueSkillScore?.sigma ?? 10;
	const initialUserRating = new Rating(initialUserMu, initialUserSigma);

	const env = new TrueSkill();
	const updates: TrueSkillUpdate[] = [];

	// Build arrays for multi-player match (user + all questions)
	const questionRatings: Rating[] = [];
	const ranks: number[] = [0]; // User rank is always 0 (user is the player)
	const questionData: Array<{ questionId: string; beforeQts: { mu: number; sigma: number } }> = [];

	// Prepare question ratings and ranks for multi-player match
	for (const answer of answeredQuestions) {
		const questionTs = questionTsMap.get(answer.questionId);
		if (!questionTs) {
			console.log(`Question TS not found for questionId: ${answer.questionId}`);
			continue;
		}

		const currentQMu = questionTs.difficulty?.mu ?? 15;
		const currentQSigma = questionTs.difficulty?.sigma ?? 10;
		const questionRating = new Rating(currentQMu, currentQSigma);

		questionRatings.push(questionRating);
		// Question rank: 0 if user was correct (user wins), 1 if user was incorrect (question wins)
		ranks.push(answer.isCorrect ? 0 : 1);
		
		questionData.push({
			questionId: answer.questionId,
			beforeQts: { mu: currentQMu, sigma: currentQSigma },
		});
	}

	// Calculate user rating using multi-player match
	// Format: [[userRating], [q1Rating], [q2Rating], ...]
	const allRatings = [[initialUserRating], ...questionRatings.map(r => [r])];
	const updatedRatings = env.rate(allRatings, ranks);
	
	// Extract updated user rating (first element)
	const newUserRating = updatedRatings[0][0];
	const finalUserMu = newUserRating.mu;
	const finalUserSigma = newUserRating.sigma;

	// Store before values for user
	const beforeUts = { mu: initialUserMu, sigma: initialUserSigma };

	// Now calculate individual 1v1 updates for each question using initial user rating
	const questionUpdates: Map<string, { mu: number; sigma: number }> = new Map();
	
	for (let i = 0; i < questionData.length; i++) {
		const { questionId, beforeQts } = questionData[i];
		const answer = answeredQuestions.find(a => a.questionId === questionId);
		if (!answer) continue;

		const questionRating = questionRatings[i];
		
		// Perform 1v1 match using initial user rating
		// Rank: [1, 2] if user is correct (user wins), [2, 1] if user is incorrect (question wins)
		const oneVoneRanks = answer.isCorrect ? [1, 2] : [2, 1];
		const [[], [newQuestionRating]] = env.rate([[initialUserRating], [questionRating]], oneVoneRanks);

		const finalQuestionMu = newQuestionRating.mu;
		const finalQuestionSigma = newQuestionRating.sigma;

		// Store question update
		questionUpdates.set(questionId, {
			mu: finalQuestionMu,
			sigma: finalQuestionSigma,
		});

		// Store update for changelog
		updates.push({
			questionId: new mongoose.Types.ObjectId(questionId),
			isCorrect: answer.isCorrect,
			beforeUts,
			beforeQts,
			afterUts: { mu: finalUserMu, sigma: finalUserSigma },
			afterQts: { mu: finalQuestionMu, sigma: finalQuestionSigma },
		});
	}

	// Update user session with final rating
	userSession.trueSkillScore = {
		mu: finalUserMu,
		sigma: finalUserSigma,
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
