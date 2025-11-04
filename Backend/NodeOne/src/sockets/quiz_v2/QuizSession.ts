import { fetchQuestionsByChapterIdAndMu } from "./../../services/questions/FetchQuestions";
import { Socket } from "socket.io";
import { logger } from "./../../utils/logger";
import { UserChapterSessionService } from "./../../services/UserChapterSession";
import { Question } from "./../../models/Questions";
import { IOngoingSession } from "models/UserChapterTicket";

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

			// fetch UserChapterTicket by socketTicket
			const userChapterTicket =
				await UserChapterSessionService.getCurrentSessionBySocketTicket(
					{
						socketTicket: sessionId,
					}
				);

			console.log("SOCKET TICKET:", userChapterTicket);

			// fetch user trueskill data
			const userTrueskillData = {skill:{ mu: userChapterTicket?.trueSkillScore?.mu || 936, sigma: userChapterTicket?.trueSkillScore?.sigma || 200 }};

			console.log("USERS TRUESKILL DATA :", userTrueskillData);

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

			const questionTsObject = question[0];
			const currentQuestionTs = questionTsObject.quesId;

			const wholeQuestionObject = await Question.findById(
				currentQuestionTs
			);
			const parsedQuestion = {
				id: currentQuestionTs,
				ques: wholeQuestionObject?.ques,
				options: wholeQuestionObject?.options,
			};


			//TODO Test
			const updatedOngoingData: Partial<IOngoingSession> = {
				currentQuestionId: currentQuestionTs,
				questionsAttempted: userChapterTicket?.ongoing?.questionsAttempted + 1,
				questionsCorrect: userChapterTicket?.ongoing?.questionsCorrect,
				questionsIncorrect: userChapterTicket?.ongoing?.questionsIncorrect,
				currentStreak: userChapterTicket?.ongoing?.currentStreak,
				currentScore: userChapterTicket?.ongoing?.currentScore,
				heartsLeft: userChapterTicket?.ongoing?.heartsLeft,
			};

			// Havennt tested this YET 
			userChapterTicket?.ongoing?.questionsAttempted > 1 ? updatedOngoingData.lastAttemptedQuestionId = userChapterTicket.ongoing.currentQuestionId : undefined;
			// updating UserChapterSession with questionTsId
			await UserChapterSessionService.updateUserChapterOngoingByUserIdChapterId({
				userId: userChapterTicket.userId.toString(),
				chapterId: userChapterTicket.chapterId.toString(),
				updateData: updatedOngoingData
			});


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

	// On answer: checkanswer -> updatets -> emit result (with correctness and correct option)
	  socket.on('answer', async ({ answerIndex, sessionId }: { answerIndex: number; sessionId?: string }) => {
		try {

			const userChapterTicket = await UserChapterSessionService.getCurrentSessionBySocketTicket(
				{
					socketTicket: sessionId!,
				}
			);

			const questionId = userChapterTicket.ongoing.currentQuestionId.toString();
		  console.log(`[answer] sessionId: ${sessionId || (socket as any).data?.sessionId || 'not provided'}`);

		  // Fetch the question to get the correct answer
		const wholeQuestionObject = await Question.findById(questionId);
		  if (!wholeQuestionObject) {
			socket.emit('quizError', { type: 'failure', message: 'Question not found' });
			return;
		  }
		const isCorrect = wholeQuestionObject.correct.includes(answerIndex);
		console.log(`User answered question ${questionId} with option index ${answerIndex}. Correct: ${isCorrect}`);

		// only pass correctness to update service
		await UserChapterSessionService.updateUserChapterOngoingByUserIdChapterId({
				userId: userChapterTicket.userId.toString(),
				chapterId: userChapterTicket.chapterId.toString(),
				updateData: { isCorrect },
			});

		// update TrueSkill for user and question
		await UserChapterSessionService.updateUserQuestionTrueskill({
			userId: userChapterTicket.userId.toString(),
			questionId: questionId,
			isCorrect,
		});

		socket.emit('result', {
				isCorrect,
				correctIndex: wholeQuestionObject.correct[0],
				correctOption: null,
		    	});


		} catch (error: any) {
		  logger.error('Error in answer:', error);
		  socket.emit('quizError', { type: 'failure', message: error?.message || 'Failed to submit answer' });
		}
	  });

	socket.on("disconnect", () => {
		logger.info(`Dummy Quiz v2 socket disconnected: ${socket.id}`);
	});
};
