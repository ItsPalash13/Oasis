import UserChapterTicket, { IOngoingSession } from "../models/UserChapterTicket";
import { UserProfile } from "../models/UserProfile";
import mongoose from "mongoose";
import { TrueSkill, Rating } from "ts-trueskill";
import { QuestionTs } from "../models/QuestionTs";

interface IStartChapterSessionResponse {
	user: {
		userId: string;
	};
	chapterId: string;
	userChapterTicket: string;
}

namespace UserChapterSessionService {


	export const getCurrentSessionBySocketTicket = async ({
		socketTicket,
	}: {
		socketTicket: string;
	}) => {

console.log("TESTING SOCKET TICKET : ", socketTicket);
		const userChapterTicket = await UserChapterTicket.findOne({
			"ongoing._id": socketTicket,
		});
		console.log("TESTING1234: ", userChapterTicket);	
		if (!userChapterTicket?._id) {
			throw {
				statusCode: 404,
				code: "SessionNotFound",
				message: "Session not found",
			};
		}
		
		return userChapterTicket;
	};

	export const startUserChapterSession = async ({
		userId,
		chapterId,
	}: {
		userId: string;
		chapterId: string;
	}): Promise<any> => {
		const user = await UserProfile.findOne({ userId });

		if (!user?.userId) {
			throw {
				statusCode: 404,
				code: "UserNotFound",
				message: "User not found",
			};
		}

		// Convert string IDs to ObjectId
		const userObjectId = new mongoose.Types.ObjectId(userId);
		const chapterObjectId = new mongoose.Types.ObjectId(chapterId);

		// Check if UserChapterTicket already exists
		let userChapterTicket = await UserChapterTicket.findOne({
			userId: userObjectId,
			chapterId: chapterObjectId,
		});

		if (userChapterTicket) {
			// If ticket exists, fill/update the ongoing object
			userChapterTicket.ongoing = {
				_id: userChapterTicket.ongoing?._id,
				questionsAttemptedList: [],
				questionPool: [],
				currentQuestionId:
					userChapterTicket.ongoing?.currentQuestionId,
				lastAttemptedQuestionId:
					userChapterTicket.ongoing?.lastAttemptedQuestionId,
				questionsAttempted:
					userChapterTicket.ongoing?.questionsAttempted ?? 0,
				questionsCorrect:
					userChapterTicket.ongoing?.questionsCorrect ?? 0,
				questionsIncorrect:
					userChapterTicket.ongoing?.questionsIncorrect ?? 0,
				currentStreak:
					userChapterTicket.ongoing?.currentStreak ?? 0,
				currentScore: userChapterTicket.ongoing?.currentScore ?? 0,
				heartsLeft: userChapterTicket.ongoing?.heartsLeft ?? 3,
			};
			await userChapterTicket.save();
		} else {
			// If ticket doesn't exist, create it with default ongoing values
			userChapterTicket = new UserChapterTicket({
				userId: userObjectId,
				chapterId: chapterObjectId,
				ongoing: {
					questionsAttempted: 0,
					questionPoolUsed: [],
					questionsAttemptedList: [],
					questionsCorrect: 0,
					questionsIncorrect: 0,
					currentStreak: 0,
					currentScore: 0,
					heartsLeft: 6,
				},
				maxStreak: 0,
				maxScore: 0,
			});
			await userChapterTicket.save();
		}


		const userChapterTicketInitialized = await UserChapterTicket.findOne({
			userId: userObjectId,
			chapterId: chapterObjectId,
		});

		console.log("USERCHAPTER", userChapterTicketInitialized)
		if (!userChapterTicketInitialized) {
			throw {
				statusCode: 500,
				code: "TicketInitializationFailed",
				message: "Failed to initialize user chapter ticket",
			};
		}

		if (!userChapterTicketInitialized?.ongoing || !userChapterTicketInitialized?.ongoing?._id) {
			throw {
				statusCode: 500,
				code: "TicketOngoingMissing",
				message: "User chapter ticket ongoing session is missing",
			};
		}

		return {
			user: {
				userId: user.userId,
			},
			chapterId: chapterId,
			userChapterTicket: userChapterTicketInitialized.ongoing._id.toString(),
		} as IStartChapterSessionResponse;
	};

	export const updateUserChapterQuestionData = async ({
		userId,
		chapterId,
		questionAttemptedList,
		questionPool 
	}: {
		userId: mongoose.Types.ObjectId;
		chapterId: mongoose.Types.ObjectId;
		questionAttemptedList: mongoose.Types.ObjectId[];
		questionPool: mongoose.Types.ObjectId[];
	}) => {
		const userChapterTicket = await UserChapterTicket.findOne({
			userId: userId,
			chapterId: chapterId,
		});

		if (!userChapterTicket) {
			throw {
				statusCode: 404,
				code: "SessionNotFound",
				message: "Session not found",
			};
		}

		// Update the questionAttemptedList and questionPoolUsed
		userChapterTicket.ongoing.questionPool = questionPool ?? [];
		userChapterTicket.ongoing.questionsAttemptedList = questionAttemptedList ?? [];

		await userChapterTicket.save();
	};
	
	export const updateUserChapterOngoing = async ({
		userId,
		chapterId,
		updateData,
	}: {
		userId: string;
		chapterId: string;
		updateData: Partial<IOngoingSession> | { isCorrect: boolean };
	}) => {
		const userObjectId = new mongoose.Types.ObjectId(userId);
		const chapterObjectId = new mongoose.Types.ObjectId(chapterId);

		const userChapterTicket = await UserChapterTicket.findOne({
			userId: userObjectId,
			chapterId: chapterObjectId,
		});

		if (!userChapterTicket) {
			throw {
				statusCode: 404,
				code: "SessionNotFound",
				message: "Session not found",
			};
		}

		// If only correctness is provided, skip merging into ongoing for now.
		if (Object.prototype.hasOwnProperty.call(updateData as any, "isCorrect")) {
			// Placeholder: actual aggregation logic to be handled separately
			return;
		}

		// Update the ongoing session data for partial ongoing updates
		userChapterTicket.ongoing = {
			...userChapterTicket.ongoing,
			...(updateData as Partial<IOngoingSession>),
		};

		await userChapterTicket.save();
	};

	/**
	 * Update TrueSkill ratings for user and question after an answer.
	 * Uses default TrueSkill environment parameters.
	 */
	export const updateUserQuestionTrueskill = async ({
		userId,
		questionId,
		isCorrect,
	}: {
		userId: string;
		questionId: string;
		isCorrect: boolean;
	}): Promise<void> => {
		const userObjectId = new mongoose.Types.ObjectId(userId);
		const questionObjectId = new mongoose.Types.ObjectId(questionId);

		// Load user ticket (any chapter; TrueSkill kept at ticket-level)
		const userTicket = await UserChapterTicket.findOne({ userId: userObjectId });
		if (!userTicket) {
			return; // No ticket; skip
		}

		// Load question TS entry by quesId
		const questionTs = await QuestionTs.findOne({ quesId: questionObjectId });
		if (!questionTs) {
			return; // No question ts; skip
		}

		// Current ratings (fallback to defaults if missing)
		const currentUserMu = userTicket.trueSkillScore?.mu ?? 936;
		const currentUserSigma = userTicket.trueSkillScore?.sigma ?? 200;
		const currentQMu = questionTs.difficulty?.mu ?? 936;
		const currentQSigma = questionTs.difficulty?.sigma ?? 200;

		const env = new TrueSkill();
		const userRating = new Rating(currentUserMu, currentUserSigma);
		const questionRating = new Rating(currentQMu, currentQSigma);

		// Rank 1 is winner (lower is better). If user is correct, user wins
		const ranks = isCorrect ? [1, 2] : [2, 1];
		const [[newUserRating], [newQuestionRating]] = env.rate(
			[[userRating], [questionRating]],
			ranks
		);

		// Persist updates
		userTicket.trueSkillScore = {
			mu: newUserRating.mu,
			sigma: newUserRating.sigma,
		};

		// Append changelog entry to user ticket
		(userTicket as any).tsChangeLogs = (userTicket as any).tsChangeLogs || [];
		(userTicket as any).tsChangeLogs.push({
			timestamp: new Date(),
			questionId: questionObjectId,
			userId: userObjectId,
			isCorrect,
			beforeUts: { mu: currentUserMu, sigma: currentUserSigma },
			beforeQts: { mu: currentQMu, sigma: currentQSigma },
			afterUts: { mu: newUserRating.mu, sigma: newUserRating.sigma },
			afterQts: { mu: newQuestionRating.mu, sigma: newQuestionRating.sigma },
		});

		await userTicket.save();

		questionTs.difficulty = {
			mu: newQuestionRating.mu,
			sigma: newQuestionRating.sigma,
		};

		// Append changelog entry to question ts
		(questionTs as any).tsChangeLogs = (questionTs as any).tsChangeLogs || [];
		(questionTs as any).tsChangeLogs.push({
			timestamp: new Date(),
			questionId: questionObjectId,
			userId: userObjectId,
			isCorrect,
			beforeUts: { mu: currentUserMu, sigma: currentUserSigma },
			beforeQts: { mu: currentQMu, sigma: currentQSigma },
			afterUts: { mu: newUserRating.mu, sigma: newUserRating.sigma },
			afterQts: { mu: newQuestionRating.mu, sigma: newQuestionRating.sigma },
		});
		await questionTs.save();
	};
};

export { UserChapterSessionService };
