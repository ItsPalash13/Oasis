import { randomUUID } from "crypto";
import UserChapterTicket from "../models/UserChapterTicket";
import { UserProfile } from "../models/UserProfile";
import mongoose from "mongoose";

interface IStartChapterSessionResponse {
	user: {
		userId: string;
	};
	chapterId: string;
	socketTicket: string;
}

namespace UserChapterSessionService {

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

		const socketTicket = randomUUID();

		return {
			user: {
				userId: user.userId,
			},
			chapterId: chapterId,
			socketTicket: socketTicket,
		} as IStartChapterSessionResponse;
	};
}

export { UserChapterSessionService };
