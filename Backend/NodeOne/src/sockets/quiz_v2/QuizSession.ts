import { UserChapterSessionService } from "services/UserChapterSession";
import { fetchQuestionsByChapterIdAndMu } from "./../../services/questions/FetchQuestions";
import { Socket } from "socket.io";
import { logger } from "utils/logger";
import { Userts } from "models/UserTs";

export const quizV2Handler = (socket: Socket) => {
	logger.info(` Quiz v2 socket connected: ${socket.id}`);
	// On initiate: fetch question then emit question (without revealing the answer)

	socket.on("initiate", async () => {
		try {
			// need to get chapterId by socketTicket or maybe currentSession in user table or smth

			const sessionId = socket.data.sessionId;

			if (!sessionId) {
				socket.emit("quizError", {
					type: "failure",
					message: "Session ID missing",
				});
				return;
			}

			const userChapterTicket =
				await UserChapterSessionService.getCurrentSessionBySocketTicket(
					{
						socketTicket: sessionId,
					}
				);

			const userTrueskillData = await Userts.findOne({
				_id: userChapterTicket.userId,
			});

			if (!userTrueskillData || !userTrueskillData.skill) {
				socket.emit("quizError", {
					type: "failure",
					message: "User not found or missing skill data",
				});
				return;
			}

			const question = await fetchQuestionsByChapterIdAndMu({
				chapterId: userChapterTicket.chapterId.toString(),
				mu: userTrueskillData.skill.mu,
				muFilter: "lesser",
			});


			// emit fetched question
			socket.emit("question", question);
		} catch (error: any) {
			logger.error("Error in initiate:", error);
			socket.emit("quizError", {
				type: "failure",
				message: error?.message || "Failed to initiate",
			});
		}
	});

	socket.on("disconnect", () => {
		logger.info(`Dummy Quiz v2 socket disconnected: ${socket.id}`);
	});
};
