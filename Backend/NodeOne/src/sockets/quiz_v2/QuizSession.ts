import { fetchQuestionsByChapterIdAndMu } from "./../../services/questions/FetchQuestions";
import { Socket } from "socket.io";
import { logger } from "./../../utils/logger";
import { Userts } from "./../../models/UserTs";
import { UserChapterSessionService } from "./../../services/UserChapterSession";

export const quizV2Handler = (socket: Socket) => {
	logger.info(` Quiz v2 socket connected: ${socket.id}`);
	// On initiate: fetch question then emit question (without revealing the answer)

	socket.on("initiate", async ({ sessionId }: { sessionId?: string }) => {
		try {
			// need to get chapterId by socketTicket or maybe currentSession in user table or smth
			console.log(
				"INITIATE CALLED ON SOCKET:",
				socket.id,
				socket.data
			);

			if (!sessionId) {
				socket.emit("quizError", {
					type: "failure",
					message: "Session ID missing",
				});
				return;
			}
			console.log("SESSIONID IS :", sessionId);
			if (!sessionId) {
				socket.emit("quizError", {
					type: "failure",
					message: "Session ID missing",
				});
				return;
			}

			console.log("Session ID:", sessionId);
			const userChapterTicket =
				await UserChapterSessionService.getCurrentSessionBySocketTicket(
					{
						socketTicket: sessionId,
					}
				);

			console.log("SOCKET TICKET:", userChapterTicket);
			const userTrueskillData = await Userts.findOne({
				userId: userChapterTicket.userId,
			});

			console.log("USERS TRUESKILL DATA :", userTrueskillData);
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

			if (question.length === 0) {
				socket.emit("quizError", {
					type: "no_questions",
					message: "No suitable questions found for your skill level.",
				});
				return;
			}
			console.log("QUESTIONS FETCHED :", question);

			const quesIdObj: any = question[0].quesId;
			const parsedQuestion = {
				id: question[0]._id,
				ques: quesIdObj?.ques ?? null,
				options: quesIdObj?.options ?? null,
			};
			// emit fetched question
			socket.emit("question", parsedQuestion);
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
