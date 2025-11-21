import { Socket } from "socket.io";
import { logger } from "./../../utils/logger";
import { initiateQuizSession } from "../../services/quizv3/quiz/InitiateQuiz";
import { submitQuizSession } from "../../services/quizv3/quiz/SubmitQuiz";
import { UserChapterSessionService } from "../../services/quizv3/userchapter-session/UserChapterSession";

export const quizV3Handler = (socket: Socket) => {
	logger.info(`Quiz v3 socket connected: ${socket.id}`);
	
	// Store sessionId for this socket connection
	let currentSessionId: string | undefined;

	// On initiate: fetch 3 questions and emit all at once
	socket.on("initiate", async ({ sessionId }: { sessionId?: string }) => {
		if (sessionId) {
			currentSessionId = sessionId;
		}
		const { socketResponse, responseData } = await initiateQuizSession({ sessionId });
		return socket.emit(socketResponse, responseData);
	});

	// On submit: receive all answers, process batch TrueSkill update, emit results
	socket.on("submit", async ({ answers, sessionId }: { answers: Array<{ questionId: string; answerIndex: number | null }>; sessionId?: string }) => {
		if (sessionId) {
			currentSessionId = sessionId;
		}
		const { socketResponse, responseData } = await submitQuizSession({ sessionId, answers });
		socket.emit(socketResponse, responseData);
	});

	socket.on("disconnect", async () => {
		logger.info(`Quiz v3 socket disconnected: ${socket.id}`);
		
		// Clear ongoing session on disconnect
		if (currentSessionId) {
			await UserChapterSessionService.clearOngoingSession({
				socketTicket: currentSessionId,
			});
		}
	});
};

