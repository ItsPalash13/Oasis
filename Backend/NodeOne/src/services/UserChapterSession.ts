import UserChapterTicket, { IOngoingSession } from "../models/UserChapterTicket";
import { UserProfile } from "../models/UserProfile";
import mongoose from "mongoose";

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

	export const updateUserChapterOngoingByUserIdChapterId = async ({
		userId,
		chapterId,
		updateData,
	}: {
		userId: string;
		chapterId: string;
		updateData: Partial<IOngoingSession>;
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

		// Update the ongoing session data
		userChapterTicket.ongoing = {
			...userChapterTicket.ongoing,
			...updateData,
		};

		await userChapterTicket.save();
	};
};

export { UserChapterSessionService };
