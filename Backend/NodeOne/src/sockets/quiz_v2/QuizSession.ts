import { Socket } from "socket.io";
import { logger } from "./../../utils/logger";
import { initiateQuizSession } from "../../services/quiz/InitiateQuiz";
import { answerQuizSession } from "../../services/quiz/AnswerQuiz";
import { endQuizSession } from "../../services/quiz/EndQuiz";

export const quizV2Handler = (socket: Socket) => {
	logger.info(` Quiz v2 socket connected: ${socket.id}`);
	// On initiate: fetch question then emit question (without revealing the answer)

	socket.on("initiate", async ({ sessionId }: { sessionId?: string }) => {
		const { socketResponse, responseData } = await initiateQuizSession({ sessionId });
		return socket.emit(socketResponse, responseData);
	});

	// On answer: checkanswer -> updatets -> emit result (with correctness and correct option)
	socket.on("answer", async ({ answerIndex, sessionId }: { answerIndex: number; sessionId?: string }) => {
		const { socketResponse, responseData } = await answerQuizSession({ sessionId, answerIndex });
		return socket.emit(socketResponse, responseData);
	});

	socket.on("endSession", async ({ sessionId }: { sessionId?: string }) => {
		const { socketResponse, responseData } = await endQuizSession({ sessionId });
		return socket.emit(socketResponse, responseData);
	});


	socket.on("disconnect", () => {
		logger.info(`Dummy Quiz v2 socket disconnected: ${socket.id}`);
	});
};
