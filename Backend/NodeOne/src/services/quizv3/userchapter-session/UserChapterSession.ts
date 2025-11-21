import UserChapterSession, { IOngoingSessionV3 } from "../../../models/UserChapterSession";
import { UserProfile } from "../../../models/UserProfile";
import mongoose from "mongoose";
import { getUpdatedUserSigmaByLastPlayed } from "./TrueskillHandler";

interface IStartChapterSessionResponse {
	user: {
		userId: string;
	};
	chapterId: string;
	userChapterTicket: string;
}

namespace UserChapterSessionService {
	export const getCurrentSessionBySocketTicket = async ({ socketTicket }: { socketTicket: string }) => {
		console.log("TESTING SOCKET TICKET V3: ", socketTicket);
		const userChapterSession = await UserChapterSession.findOne({
			"ongoing._id": socketTicket,
		});
		
		if (!userChapterSession?._id) {
			throw {
				statusCode: 404,
				code: "SessionNotFound",
				message: "Session not found",
			};
		}

		return userChapterSession;
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

		// Check if UserChapterSession already exists
		let userChapterSession = await UserChapterSession.findOne({
			userId: userObjectId,
			chapterId: chapterObjectId,
		});

		let updatedUserSigma: number | undefined;
		if (userChapterSession) {
			updatedUserSigma = await getUpdatedUserSigmaByLastPlayed({ userChapterSession });
		}
		
		if (userChapterSession) {
			// If session exists, update TrueSkill and lastPlayedTs, but create new ongoing with new _id
			userChapterSession.trueSkillScore = {
				mu: userChapterSession.trueSkillScore?.mu ?? 15,
				sigma: updatedUserSigma ?? userChapterSession.trueSkillScore?.sigma ?? 10,
			};
			userChapterSession.lastPlayedTs = new Date();
		} else {
			// If session doesn't exist, create it with default values (without ongoing)
			userChapterSession = new UserChapterSession({
				userId: userObjectId,
				chapterId: chapterObjectId,
				trueSkillScore: {
					mu: 15,
					sigma: 10,
				},
				lastPlayedTs: new Date(),
				maxScore: 0,
			});
		}

		// Always create a new ongoing field with a new _id
		userChapterSession.ongoing = {
			_id: new mongoose.Types.ObjectId(), // New _id for each quiz session
			questions: [],
			answers: [],
			questionsAttempted: 0,
			questionsCorrect: 0,
			questionsIncorrect: 0,
			currentScore: 0,
		};
		await userChapterSession.save();

		const userChapterSessionInitialized = await UserChapterSession.findOne({
			userId: userObjectId,
			chapterId: chapterObjectId,
		});

		if (!userChapterSessionInitialized) {
			throw {
				statusCode: 500,
				code: "SessionInitializationFailed",
				message: "Failed to initialize user chapter session",
			};
		}

		if (!userChapterSessionInitialized?.ongoing || !userChapterSessionInitialized?.ongoing?._id) {
			throw {
				statusCode: 500,
				code: "SessionOngoingMissing",
				message: "User chapter session ongoing is missing",
			};
		}

		return {
			user: {
				userId: user.userId,
			},
			chapterId: chapterId,
			userChapterTicket: userChapterSessionInitialized.ongoing._id.toString(),
		} as IStartChapterSessionResponse;
	};

	export const updateUserChapterOngoing = async ({
		userId,
		chapterId,
		updateData,
	}: {
		userId: string;
		chapterId: string;
		updateData: Partial<IOngoingSessionV3>;
	}) => {
		const userObjectId = new mongoose.Types.ObjectId(userId);
		const chapterObjectId = new mongoose.Types.ObjectId(chapterId);

		const userChapterSession = await UserChapterSession.findOne({
			userId: userObjectId,
			chapterId: chapterObjectId,
		});

		if (!userChapterSession) {
			throw {
				statusCode: 404,
				code: "SessionNotFound",
				message: "Session not found",
			};
		}

		if (!userChapterSession.ongoing) {
			throw {
				statusCode: 404,
				code: "OngoingSessionNotFound",
				message: "Ongoing session not found",
			};
		}

		// Update the ongoing session data
		userChapterSession.ongoing = {
			...userChapterSession.ongoing,
			...updateData,
		} as IOngoingSessionV3;

		await userChapterSession.save();
	};

	export const clearOngoingSession = async ({
		socketTicket,
	}: {
		socketTicket: string;
	}) => {
		try {
			const userChapterSession = await UserChapterSession.findOne({
				"ongoing._id": socketTicket,
			});

			if (!userChapterSession) {
				console.log(`Session not found for socket ticket: ${socketTicket}`);
				return;
			}

			// Remove the ongoing field entirely from the document
			await UserChapterSession.updateOne(
				{ _id: userChapterSession._id },
				{ $unset: { ongoing: "" } }
			);

			console.log(`Removed ongoing field for socket ticket: ${socketTicket}`);
		} catch (error) {
			console.error("Error removing ongoing session:", error);
		}
	};
}

export { UserChapterSessionService };

