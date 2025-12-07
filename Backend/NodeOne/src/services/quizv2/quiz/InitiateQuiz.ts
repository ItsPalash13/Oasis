import { fetchUserChapterTicketQuestionPool } from "./../../../services/quizv2/questions/FetchQuestions";
import { logger } from "../../../utils/logger";
import { UserChapterSessionService } from "../userchapter-session/UserChapterSession";
import { Question } from "../../../models/Questions";
import { IOngoingSession } from "../../../models/UserChapterTicket";
import { QuestionTs } from "../../../models/QuestionTs";


const initiateQuizSession = async ({ sessionId }: { sessionId?: string }) => {
	try {
		// need to get chapterId by socketTicket or maybe currentSession in user table or smth

		if (!sessionId) {
			return {
				socketResponse: "quizError",
				responseData: {
					type: "failure",
					message: "Session ID missing",
				},
			};
		}
		console.log("SESSIONID IS :", sessionId);

		if (!sessionId) {
			return {
				socketResponse: "quizError",
				responseData: {
					type: "failure",
					message: "Session ID missing",
				},
			};
		}

		console.log("Session ID:", sessionId);

		// fetch UserChapterTicket by socketTicket
		const userChapterTicket = await UserChapterSessionService.getCurrentSessionBySocketTicket({
			socketTicket: sessionId,
		});

		// console.log("SOCKET TICKET:", userChapterTicket);

		// fetch user trueskill data
		const userTrueskillData = {
			skill: {
				mu: userChapterTicket?.trueSkillScore?.mu || 936,
				sigma: userChapterTicket?.trueSkillScore?.sigma || 200,
			},
		};

		// console.log("USERS TRUESKILL DATA :", userTrueskillData);

		// fetch question that matches trueskill and not in questionsAttemptedList
		let questionList = await fetchUserChapterTicketQuestionPool({
			userChapterTicket: userChapterTicket,
			userTrueSkillData: userTrueskillData.skill,
		});
		let questionAttemptedList = userChapterTicket.ongoing.questionsAttemptedList || [];
		let questionPool = userChapterTicket.ongoing.questionPool || [];

		// re attempet if question list is empty
		// if (questionList.length === 0) {
		// 	userChapterTicket.ongoing.questionPool = questionAttemptedList;
		// 	userChapterTicket.ongoing.questionsAttemptedList = [];
		// }
		questionList = await fetchUserChapterTicketQuestionPool({
			userChapterTicket: userChapterTicket,
			userTrueSkillData: userTrueskillData.skill,
		});

		questionPool = [...questionList.slice(1).map((q) => q.quesId), ...questionPool]; // remove first question as its current question

		// console.log("QUESTION POOL :", questionPool);
		const currentQuestion = questionPool[0];
		questionPool = questionPool.slice(1); // remove current question from pool

		// console.log("Question List ", questionList);
		// console.log("Current Question ", currentQuestion);


		// update question data (pool and attempted list )
		// await UserChapterSessionService.updateUserChapterQuestionData({
		// 	userId: userChapterTicket.userId,
		// 	chapterId: userChapterTicket.chapterId,
		// 	questionPool,
		// 	questionAttemptedList
		// });

		userChapterTicket.ongoing.questionPool = questionPool?.length > 0 ? questionPool : [];
		userChapterTicket.ongoing.questionsAttemptedList =
			questionAttemptedList?.length > 0 ? questionAttemptedList : [];
		// console.log("UPDATED TICKET :", userChapterTicket);
		await userChapterTicket.save();

		// const updatedUserCHapterTicket = await UserChapterSessionService.getCurrentSessionBySocketTicket(
		// 	{
		// 		socketTicket: sessionId,
		// 	}
		// );
		// console.log("Something must have happened here ", updatedUserCHapterTicket)
		const currentQuestionTs = currentQuestion;
		const wholeQuestionObject = await Question.findById(currentQuestionTs);


		// Only for testing 
		const questionTs = await QuestionTs.findOne({ quesId: currentQuestionTs });
		// console.log("QuestionTSNOW is :", questionTs);
		const parsedQuestion = {
			id: currentQuestionTs,
			ques: wholeQuestionObject?.ques,
			options: wholeQuestionObject?.options,
			correctAnswer: wholeQuestionObject?.correct,
			quesType: wholeQuestionObject?.quesType || 'current',
			optionsType: wholeQuestionObject?.optionsType || 'current',
			solutionType: wholeQuestionObject?.solutionType || 'current',
			trueskill: userChapterTicket?.trueSkillScore, 
			questionTrueskill: questionTs?.difficulty,
			currentScore: userChapterTicket?.ongoing?.currentScore ?? 0,
			heartsLeft: userChapterTicket?.ongoing?.heartsLeft ?? 3,
			questionsCorrect: questionTs?.xp?.correct ?? 0,
			questionsIncorrect: questionTs?.xp?.incorrect ?? 0
		};

		//TODO Test
		const updatedOngoingData: Partial<IOngoingSession> = {
			currentQuestionId: currentQuestionTs,
			questionsAttempted: userChapterTicket?.ongoing?.questionsAttempted,
			questionsCorrect: userChapterTicket?.ongoing?.questionsCorrect,
			questionsIncorrect: userChapterTicket?.ongoing?.questionsIncorrect,
			currentStreak: userChapterTicket?.ongoing?.currentStreak,
			currentScore: userChapterTicket?.ongoing?.currentScore,
			heartsLeft: userChapterTicket?.ongoing?.heartsLeft,
		};

		// Havennt tested this YET
		userChapterTicket?.ongoing?.questionsAttempted > 1
			? (updatedOngoingData.lastAttemptedQuestionId = userChapterTicket.ongoing.currentQuestionId)
			: undefined;
		// updating UserChapterSession with questionTsId
		await UserChapterSessionService.updateUserChapterOngoing({
			userId: userChapterTicket.userId.toString(),
			chapterId: userChapterTicket.chapterId.toString(),
			updateData: updatedOngoingData,
		});

		// emit fetched question
		return { socketResponse: "question", responseData: parsedQuestion };
	} catch (error: any) {
		logger.error("Error in initiate:", error);
		return {
			socketResponse: "quizError",
			responseData: {
				type: "failure",
				message: error?.message || "Failed to initiate",
			},
		};
	}
};



export { initiateQuizSession };
