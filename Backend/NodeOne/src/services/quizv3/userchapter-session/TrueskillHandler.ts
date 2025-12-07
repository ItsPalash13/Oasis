import UserChapterSession, { IUserChapterSession, IUserAttemptWindow } from "../../../models/UserChapterSession";
import { TrueSkill, Rating } from "ts-trueskill";
import { QuestionTs } from "../../../models/QuestionTs";
import mongoose from "mongoose";
import { DEFAULT_SIGMA_BOOST_CONFIG, SigmaBoostConfig, USER_DEFAULT_SIGMA } from "../../../config/constants";

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
 * User rating is updated by accumulating deltas from individual 1v1 matches with each question.
 * Question ratings are updated individually using 1v1 matches with initial user rating.
 */


// {user: {mu: number, sigma: number}, question: {mu: number, sigma: number}}

export const updateUserQuestionTrueskillBatch = async ({
	sessionId,
	answers,
}: {
	sessionId: string;
	answers: Array<{ questionId: string; answerIndex: number | number[] | null; isCorrect: boolean }>;
}): Promise<any> => {
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

	// Initialize delta accumulators for user rating
	let userMuDelta = 0;
	let userSigmaDelta = 0;
	let processedQuestionCount = 0;

	// Store before values for user
	const beforeUts = { mu: initialUserMu, sigma: initialUserSigma };

	// Calculate individual 1v1 updates for each question using initial user rating
	const questionUpdates: Map<string, { mu: number; sigma: number }> = new Map();
	
	for (const answer of answeredQuestions) {
		const questionTs = questionTsMap.get(answer.questionId);
		if (!questionTs) {
			console.log(`Question TS not found for questionId: ${answer.questionId}`);
			continue;
		}

		processedQuestionCount++;

		const currentQMu = questionTs.difficulty?.mu ?? 15;
		const currentQSigma = questionTs.difficulty?.sigma ?? 10;
		const questionRating = new Rating(currentQMu, currentQSigma);
		const beforeQts = { mu: currentQMu, sigma: currentQSigma };
		
		// Perform 1v1 match using initial user rating (user stays frozen)
		// Rank: [1, 2] if user is correct (user wins), [2, 1] if user is incorrect (question wins)
		const oneVoneRanks = answer.isCorrect ? [1, 2] : [2, 1];
		const [[updatedUserRating], [newQuestionRating]] = env.rate([[initialUserRating], [questionRating]], oneVoneRanks);

		// Calculate deltas for user rating from this match
		const muDelta = updatedUserRating.mu - initialUserMu;
		const sigmaDelta = updatedUserRating.sigma - initialUserSigma;
		
		// Accumulate deltas
		userMuDelta += muDelta;
		userSigmaDelta += sigmaDelta;

		const finalQuestionMu = newQuestionRating.mu;
		const finalQuestionSigma = newQuestionRating.sigma;

		// Store question update
		questionUpdates.set(answer.questionId, {
			mu: finalQuestionMu,
			sigma: finalQuestionSigma,
		});

		// Store update for changelog (will update afterUts after calculating final rating)
		updates.push({
			questionId: new mongoose.Types.ObjectId(answer.questionId),
			isCorrect: answer.isCorrect,
			beforeUts,
			beforeQts,
			afterUts: { mu: 0, sigma: 0 }, // Placeholder, will be updated below
			afterQts: { mu: finalQuestionMu, sigma: finalQuestionSigma },
		});
	}

	// Calculate final user rating by applying average of accumulated deltas
	const averageMuDelta = processedQuestionCount > 0 ? userMuDelta / processedQuestionCount : 0;
	const averageSigmaDelta = processedQuestionCount > 0 ? userSigmaDelta / processedQuestionCount : 0;
	const finalUserMu = initialUserMu + averageMuDelta;
	const finalUserSigma = initialUserSigma + averageSigmaDelta;

	// Update changelog entries with final user rating
	updates.forEach(update => {
		update.afterUts = { mu: finalUserMu, sigma: finalUserSigma };
	});

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
	return userSession;
};

/**
 * Extract recent accuracy values from userAttemptWindowList
 */
const getRecentAccuracies = (userAttemptWindowList: IUserAttemptWindow[] | undefined): number[] => {
	if (!userAttemptWindowList || userAttemptWindowList.length === 0) {
		console.log("[SigmaBoost] No accuracy history found in userAttemptWindowList");
		return [];
	}
	// Extract averageAccuracy values and normalize if needed (convert percentages to [0,1])
	const accuracies = userAttemptWindowList.map(window => {
		const accuracy = window.averageAccuracy;
		// If value > 1, assume it's a percentage and normalize to [0,1]
		return accuracy > 1 ? accuracy / 100 : accuracy;
	});
	console.log(`[SigmaBoost] Extracted ${accuracies.length} accuracy values (normalized):`, accuracies);
	return accuracies;
};

/**
 * Calculate accuracy statistics: mean, standard deviation, and normalized standard deviation
 */
const calculateAccuracyStats = (accuracies: number[]): { mean: number; stdDev: number; stdNorm: number } => {
	if (accuracies.length === 0) {
		console.log("[SigmaBoost] No accuracies provided for stats calculation");
		return { mean: 0, stdDev: 0, stdNorm: 0 };
	}

	// Calculate mean
	const mean = accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length;

	// Calculate standard deviation
	const variance = accuracies.reduce((sum, acc) => sum + Math.pow(acc - mean, 2), 0) / accuracies.length;
	const stdDev = Math.sqrt(variance);

	// Normalize standard deviation (max possible std dev for values in [0,1] is 0.5)
	const stdNorm = Math.min(1, stdDev / 0.5);

	console.log(`[SigmaBoost] Accuracy Stats - Mean: ${mean.toFixed(3)}, StdDev: ${stdDev.toFixed(3)}, StdNorm: ${stdNorm.toFixed(3)}`);

	return { mean, stdDev, stdNorm };
};

/**
 * Calculate stability weight W = 1 - std_norm
 * Stable accuracy (low std dev) → W ≈ 1
 * Unstable accuracy (high std dev) → W ≈ 0
 */
const calculateStabilityWeight = (accuracies: number[]): number => {
	const { stdNorm } = calculateAccuracyStats(accuracies);
	const W = 1 - stdNorm;
	console.log(`[SigmaBoost] Stability Weight (W): ${W.toFixed(3)} (1 - ${stdNorm.toFixed(3)})`);
	return W;
};

/**
 * Apply sigma boost based on accuracy stability
 * Only boosts if sigma < sigma_base
 */
const applySigmaBoost = (sigma: number, accuracies: number[], config: SigmaBoostConfig): number => {
	console.log(`[SigmaBoost] Checking boost eligibility - Current Sigma: ${sigma.toFixed(3)}, SigmaBase: ${config.sigmaBase}`);
	
	// If sigma >= sigma_base, do nothing
	if (sigma >= config.sigmaBase) {
		console.log(`[SigmaBoost] No boost needed - sigma (${sigma.toFixed(3)}) >= sigmaBase (${config.sigmaBase})`);
		return sigma;
	}

	// Check if we have any accuracies
	if (accuracies.length === 0) {
		console.log(`[SigmaBoost] No accuracy history available`);
		return sigma;
	}

	// Get last minHistorySize values from accuracies (or all if we have fewer)
	const recentAccuracies = accuracies.slice(-config.minHistorySize);
	console.log(`[SigmaBoost] Using last ${recentAccuracies.length} accuracy values from ${accuracies.length} total:`, recentAccuracies);

	// Calculate stability weight using recent accuracies
	const W = calculateStabilityWeight(recentAccuracies);

	// Calculate boost: Δσ = base_boost + W * max_boost
	const baseBoostComponent = config.baseBoost;
	const stabilityBoostComponent = W * config.maxBoost;
	const deltaSigma = baseBoostComponent + stabilityBoostComponent;

	console.log(`[SigmaBoost] Boost Calculation:`);
	console.log(`  - Base Boost: ${baseBoostComponent.toFixed(3)}`);
	console.log(`  - Stability Boost (W * maxBoost): ${stabilityBoostComponent.toFixed(3)} (${W.toFixed(3)} * ${config.maxBoost})`);
	console.log(`  - Total Delta Sigma (Δσ): ${deltaSigma.toFixed(3)}`);

	// Calculate new sigma: σ_new = σ + Δσ
	const newSigma = sigma + deltaSigma;
	
	console.log(`[SigmaBoost] Sigma Boost Result: ${sigma.toFixed(3)} + ${deltaSigma.toFixed(3)} = ${newSigma.toFixed(3)}`);

	return newSigma;
};

/**
 * Apply sigma boost to user session based on accuracy stability
 * Only applies boost if current sigma < sigma_base
 */
export const applySigmaBoostToUserSession = async (
	userChapterSession: IUserChapterSession
): Promise<void> => {
	const currentSigma = userChapterSession.trueSkillScore?.sigma ?? USER_DEFAULT_SIGMA;

	// Only apply boost if sigma < sigma_base
	if (currentSigma >= DEFAULT_SIGMA_BOOST_CONFIG.sigmaBase) {
		return;
	}

	// Get recent accuracies from userAttemptWindowList
	const recentAccuracies = getRecentAccuracies(userChapterSession.analytics?.userAttemptWindowList);

	// Apply sigma boost
	const boostedSigma = applySigmaBoost(currentSigma, recentAccuracies, DEFAULT_SIGMA_BOOST_CONFIG);

	// Only update if sigma actually changed
	if (boostedSigma !== currentSigma && userChapterSession.trueSkillScore) {
		userChapterSession.trueSkillScore.sigma = boostedSigma;
		await userChapterSession.save();
		console.log(`Applied sigma boost: ${currentSigma} → ${boostedSigma}`);
	}
};
