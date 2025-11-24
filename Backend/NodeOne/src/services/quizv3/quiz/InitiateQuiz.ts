import { fetchUserChapterSessionQuestionPool } from "./../../../services/quizv3/questions/FetchQuestions";
import { logger } from "../../../utils/logger";
import { UserChapterSessionService } from "../userchapter-session/UserChapterSession";
import { Question } from "../../../models/Questions";
import { QuestionTs } from "../../../models/QuestionTs";
import mongoose from "mongoose";

const initiateQuizSession = async ({ sessionId }: { sessionId?: string }) => {
	try {
		if (!sessionId) {
			return {
				socketResponse: "quizError",
				responseData: {
					type: "failure",
					message: "Session ID missing",
				},
			};
		}

		console.log("SESSIONID V3 IS :", sessionId);

		// Fetch UserChapterSession by socketTicket
		const userChapterSession = await UserChapterSessionService.getCurrentSessionBySocketTicket({
			socketTicket: sessionId,
		});

		// Ensure ongoing exists (it should since we create it in startUserChapterSession)
		if (!userChapterSession.ongoing) {
			return {
				socketResponse: "quizError",
				responseData: {
					type: "failure",
					message: "Ongoing session not found",
				},
			};
		}

		// Fetch user trueskill data
		const userTrueskillData = {
			mu: userChapterSession?.trueSkillScore?.mu || 15,
			sigma: userChapterSession?.trueSkillScore?.sigma || 10,
		};

		// Fetch 3 questions that match trueskill range (mu ± 1)
		let questionList = await fetchUserChapterSessionQuestionPool({
			userChapterSession: userChapterSession,
			userTrueSkillData: userTrueskillData,
		});

		console.log("QUESTION LIST V3:", questionList);

		// If we don't have 3 questions, try to get more (relax the range or get any available)
		if (questionList.length < 3) {
			// Try to get more questions with a wider range or from attempted list
			const allQuestions = await QuestionTs.find({
				chapterId: userChapterSession.chapterId.toString(),
				type: 'single',
			})
				.populate("quesId")
				.limit(3)
				.exec();
			
			// Filter out already attempted questions
			const attemptedIds = userChapterSession.ongoing?.questions?.map(q => q.toString()) || [];
			questionList = allQuestions.filter(q => !attemptedIds.includes(q.quesId.toString()));
			
			// Take first 3
			questionList = questionList.slice(0, 3);
		}

		// Store all 3 questions in ongoing.questions
		const questionIds = questionList.map(q => q.quesId);
		userChapterSession.ongoing.questions = questionIds.map(id => new mongoose.Types.ObjectId(id));
		userChapterSession.ongoing.answers = questionIds.map(id => ({
			questionId: new mongoose.Types.ObjectId(id),
			answerIndex: null
		}));
		await userChapterSession.save();

		// Fetch full question objects
		const questions = await Question.find({
			_id: { $in: questionIds }
		}).exec();

		// Get question TS data for each question
		const questionTsData = await QuestionTs.find({
			quesId: { $in: questionIds }
		}).exec();

		// Create a map for quick lookup
		const questionTsMap = new Map();
		questionTsData.forEach(qts => {
			questionTsMap.set(qts.quesId.toString(), qts);
		});

		// Parse questions for frontend
		const parsedQuestions = questions.map((q, index) => {
			const questionTs = questionTsMap.get((q._id as any).toString());
			return {
				id: (q._id as any).toString(),
				ques: q.ques,
				options: q.options,
				correctAnswer: q.correct,
				quesType: q.quesType || 'current',
				optionsType: q.optionsType || 'current',
				solutionType: q.solutionType || 'current',
				trueskill: userChapterSession?.trueSkillScore,
				questionTrueskill: questionTs?.difficulty,
			};
		});

		// Emit all 3 questions at once
		return { 
			socketResponse: "questions", 
			responseData: {
				questions: parsedQuestions,
				currentScore: userChapterSession?.ongoing?.currentScore ?? 0,
			}
		};
	} catch (error: any) {
		logger.error("Error in initiate V3:", error);
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

