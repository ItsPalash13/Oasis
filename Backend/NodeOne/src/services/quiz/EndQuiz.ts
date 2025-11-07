import { logger } from "./../../utils/logger";
import { UserChapterSessionService } from "./../../services/UserChapterSession";
import { IOngoingSession,  } from "models/UserChapterTicket";

const endQuizSession = async ({ sessionId }: { sessionId?: string }) => {
	try {
		// need to get chapterId by socketTicket or maybe currentSession in user table or smth

        const userChapterTicket = await UserChapterSessionService.getCurrentSessionBySocketTicket({
            socketTicket: sessionId!,
        });


        const responseForUser = userChapterTicket.ongoing;
        userChapterTicket.maxScore = userChapterTicket.maxScore || 0;
        if (userChapterTicket.ongoing.currentScore > userChapterTicket.maxScore) {
            userChapterTicket.maxScore = userChapterTicket.ongoing.currentScore;
        }

        userChapterTicket.maxStreak = userChapterTicket.maxStreak || 0;
        if (userChapterTicket.ongoing.currentStreak > userChapterTicket.maxStreak) {
            userChapterTicket.maxStreak = userChapterTicket.ongoing.currentStreak;
        }
        userChapterTicket.ongoing = {} as IOngoingSession; // reset ongoing session
        await userChapterTicket.save();

        return {
            socketResponse: "quizEnded",
            responseData: {
                type: "success",
                message: "Quiz session ended",
                data: responseForUser
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