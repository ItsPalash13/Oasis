import { fetchUserChapterTicketQuestionPool } from "./../../services/questions/FetchQuestions";
import { Socket } from "socket.io";
import { logger } from "./../../utils/logger";
import { UserChapterSessionService } from "./../../services/UserChapterSession";
import { Question } from "./../../models/Questions";
import { IOngoingSession } from "models/UserChapterTicket";
import { mongo } from "mongoose";

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
			const userTrueskillData = {
				skill: {
					mu: userChapterTicket?.trueSkillScore?.mu || 936,
					sigma: userChapterTicket?.trueSkillScore?.sigma || 200,
				},
			};

			console.log("USERS TRUESKILL DATA :", userTrueskillData);

			// fetch question that matches trueskill and not in questionsAttemptedList
			let questionList = await fetchUserChapterTicketQuestionPool({
				userChapterTicket: userChapterTicket,
				userTrueSkillData: userTrueskillData.skill,
			});

			const currentQuestion = questionList[0];

			let questionAttemptedList = userChapterTicket.ongoing.questionsAttemptedList || [];

			console.log("Current Question ", currentQuestion)
			questionAttemptedList.push(currentQuestion.quesId);

			let questionPool = userChapterTicket.ongoing.questionPool || [];
			questionPool.concat(
				questionList.map((q) => q.quesId)
			);

			// NEED to place this somewhere else 
			if (questionList.length === 0) { 
				questionPool = questionAttemptedList;
				questionAttemptedList = [];
			}
			// update question data (pool and attempted list )
			// await UserChapterSessionService.updateUserChapterQuestionData({
			// 	userId: userChapterTicket.userId,
			// 	chapterId: userChapterTicket.chapterId,
			// 	questionPool,
			// 	questionAttemptedList
			// });

			userChapterTicket.ongoing.questionPool = questionPool?.length > 0 ? questionPool : [];
			userChapterTicket.ongoing.questionsAttemptedList = questionAttemptedList?.length > 0 ? questionAttemptedList : [];
			console.log("UPDATED TICKET :", userChapterTicket)
			await userChapterTicket.save();


			const updatedUserCHapterTicket = await UserChapterSessionService.getCurrentSessionBySocketTicket(
				{
					socketTicket: sessionId,
				}
			);
			console.log("Something must have happened here ", updatedUserCHapterTicket)
			const currentQuestionTs = currentQuestion.quesId;
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
				questionsAttempted:
					userChapterTicket?.ongoing?.questionsAttempted + 1,
				questionsCorrect:
					userChapterTicket?.ongoing?.questionsCorrect,
				questionsIncorrect:
					userChapterTicket?.ongoing?.questionsIncorrect,
				currentStreak: userChapterTicket?.ongoing?.currentStreak,
				currentScore: userChapterTicket?.ongoing?.currentScore,
				heartsLeft: userChapterTicket?.ongoing?.heartsLeft,
			};

			// Havennt tested this YET
			userChapterTicket?.ongoing?.questionsAttempted > 1
				? (updatedOngoingData.lastAttemptedQuestionId =
						userChapterTicket.ongoing.currentQuestionId)
				: undefined;
			// updating UserChapterSession with questionTsId
			await UserChapterSessionService.updateUserChapterOngoing({
				userId: userChapterTicket.userId.toString(),
				chapterId: userChapterTicket.chapterId.toString(),
				updateData: updatedOngoingData,
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
			const userChapterTicket =
					await UserChapterSessionService.getCurrentSessionBySocketTicket(
						{
							socketTicket: sessionId!,
						}
					);
				const questionId =
					userChapterTicket.ongoing.currentQuestionId
				console.log(
					`[answer] sessionId: ${
						sessionId ||
						(socket as any).data?.sessionId ||
						"not provided"
					}`
				);

				// Fetch the question to get the correct answer
				const wholeQuestionObject = await Question.findById(
					questionId
				);
				if (!wholeQuestionObject) {
					socket.emit("quizError", {
						type: "failure",
						message: "Question not found",
					});
					return;
				}


				const isCorrect =
					wholeQuestionObject.correct.includes(answerIndex);


				console.log(
					`User answered question ${questionId} with option index ${answerIndex}. Correct: ${isCorrect}`
				);
				const questionIdAsObject = new mongo.ObjectId(questionId);

				if (isCorrect) {
					// Update UserChapterSession for correct answer
					const updatedOngoingData: Partial<IOngoingSession> = {
						currentQuestionId: questionIdAsObject,
						questionsAttempted:
							userChapterTicket?.ongoing
								?.questionsAttempted + 1,
						questionsCorrect:
							userChapterTicket?.ongoing
								?.questionsCorrect + 1,
						questionsIncorrect:
							userChapterTicket?.ongoing
								?.questionsIncorrect,
						currentStreak:
							userChapterTicket?.ongoing?.currentStreak +
							1,
						currentScore:
							userChapterTicket?.ongoing?.currentScore + 1,
						heartsLeft:
							userChapterTicket?.ongoing?.heartsLeft,
					};

					userChapterTicket.ongoing = {...userChapterTicket.ongoing, ...updatedOngoingData as IOngoingSession};
					await userChapterTicket.save()
					// updating UserChapterSession with questionTsId
					// await UserChapterSessionService.updateUserChapterOngoing(
					// 	{
					// 		userId: userChapterTicket.userId.toString(),
					// 		chapterId:
					// 			userChapterTicket.chapterId.toString(),
					// 		updateData: updatedOngoingData,
					// 	}
					// );
					console.log("EMITTING CORRECT ANSWER");
					socket.emit("result", {
						isCorrect,
						correctIndex: answerIndex,
						correctOption: null,
					});
				} else {
					const updatedOngoingData: Partial<IOngoingSession> = {
						currentQuestionId: questionIdAsObject,
						questionsAttempted:
							userChapterTicket?.ongoing
								?.questionsAttempted + 1,
						questionsCorrect:
							userChapterTicket?.ongoing?.questionsCorrect,
						questionsIncorrect:
							userChapterTicket?.ongoing
								?.questionsIncorrect + 1,
						currentStreak: 0,
						currentScore:
							userChapterTicket?.ongoing?.currentScore + 1,
						heartsLeft:
							userChapterTicket?.ongoing?.heartsLeft - 1,
					};


					// if WRONG, update questionPool and push it to last
					const questionPool = userChapterTicket.ongoing.questionPool ?? [];
					questionPool.push(questionId);
					
					//TODO not but will look at it tmrw
					userChapterTicket.ongoing = {...userChapterTicket.ongoing, ...updatedOngoingData as IOngoingSession};
					userChapterTicket.ongoing.questionPool  = questionPool;
					await userChapterTicket.save();

					// updating UserChapterSession with questionTsId
					// await UserChapterSessionService.updateUserChapterOngoing(
					// 	{
					// 		userId: userChapterTicket.userId.toString(),
					// 		chapterId:
					// 			userChapterTicket.chapterId.toString(),
					// 		updateData: updatedOngoingData,
					// 	}
					// );

					console.log(
						"The answer is incorrect ",
						isCorrect,
						answerIndex,
						wholeQuestionObject.correct
					);
					socket.emit("result", {
						isCorrect,
						correctIndex: wholeQuestionObject.correct[0], // sending first correct answer index
						correctOption: null,
					});
				}
			} catch (error: any) {
				logger.error("Error in answer:", error);
				socket.emit("quizError", {
					type: "failure",
					message: error?.message || "Failed to submit answer",
				});
			}
		}
	);

	socket.on("disconnect", () => {
		logger.info(`Dummy Quiz v2 socket disconnected: ${socket.id}`);
	});
};
