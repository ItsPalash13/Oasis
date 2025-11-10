import { logger } from "./../../utils/logger";
import { UserChapterSessionService } from "./../../services/UserChapterSession";
import { IOngoingSession,  } from "models/UserChapterTicket";

const endQuizSession = async ({ sessionId, endReason = "manual_end" }: { sessionId?: string; endReason?: string }) => {
	try {
		// need to get chapterId by socketTicket or maybe currentSession in user table or smth

        const userChapterTicket = await UserChapterSessionService.getCurrentSessionBySocketTicket({
            socketTicket: sessionId!,
        });

        // Save session stats before resetting
        const sessionData = {
            currentScore: userChapterTicket.ongoing.currentScore ?? 0,
            heartsLeft: userChapterTicket.ongoing.heartsLeft ?? 0,
            questionsAttempted: userChapterTicket.ongoing.questionsAttempted ?? 0,
            questionsCorrect: userChapterTicket.ongoing.questionsCorrect ?? 0,
            questionsIncorrect: userChapterTicket.ongoing.questionsIncorrect ?? 0,
            currentStreak: userChapterTicket.ongoing.currentStreak ?? 0,
        };

        // Update max score and max streak
        userChapterTicket.maxScore = userChapterTicket.maxScore || 0;
        if (sessionData.currentScore > userChapterTicket.maxScore) {
            userChapterTicket.maxScore = sessionData.currentScore;
        }

        userChapterTicket.maxStreak = userChapterTicket.maxStreak || 0;
        if (sessionData.currentStreak > userChapterTicket.maxStreak) {
            userChapterTicket.maxStreak = sessionData.currentStreak;
        }

        // Reset ongoing session
        userChapterTicket.ongoing = {} as IOngoingSession;
        await userChapterTicket.save();

        console.log("The users new userChapterTicket is ", userChapterTicket)
        // Calculate accuracy percentage
        const accuracy = sessionData.questionsAttempted > 0 
            ? Math.round((sessionData.questionsCorrect / sessionData.questionsAttempted) * 100)
            : 0;

        return {
            socketResponse: "quizEnded",
            responseData: {
                type: "success",
                message: endReason === "hearts_exhausted" 
                    ? "Game Over - Out of Hearts!" 
                    : "Quiz session ended",
                endReason: endReason,
                data: {
                    ...sessionData,
                    accuracy: accuracy,
                    maxScore: userChapterTicket.maxScore,
                    maxStreak: userChapterTicket.maxStreak,
                }
            },
        };
    } catch(error) {
        logger.error(`Error in endQuizSession: ${error}`);
        return {
				socketResponse: "quizError",
				responseData: {
					type: "failure",
					message: "Cannot end quiz",
				},
			};
    }
}

export { endQuizSession };  