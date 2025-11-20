import { SIGMA_DECAY_CONST } from "../../config/constants";
import { IUserChapterTicket } from "../../models/UserChapterTicket";

const DEFAULT_SIGMA = 10;

const getUpdatedUserSigmaByLastPlayed = async ({ userChapterTicket }: { userChapterTicket: IUserChapterTicket }) => {
	try {
		if (!userChapterTicket) {
			return DEFAULT_SIGMA;
		}

		const lastPlayedTime = userChapterTicket.lastPlayedTs;
		const currentSigma = userChapterTicket.trueSkillScore?.sigma ?? DEFAULT_SIGMA;

		if (!lastPlayedTime) {
			return currentSigma;
		}

		const currentTime = new Date();
		const timeDiff = currentTime.getTime() - lastPlayedTime.getTime();
		const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));

		if (daysDiff <= 0) {
			return currentSigma;
		}

		const delta = 1 - Math.exp(-SIGMA_DECAY_CONST * daysDiff);
		const newUserSigma = currentSigma + currentSigma * delta;

		console.log("The new user sigma is before and after ", currentSigma, newUserSigma);
		return newUserSigma;
	} catch (error) {
		console.error("Error updating user sigma:", error);
		return userChapterTicket?.trueSkillScore?.sigma ?? DEFAULT_SIGMA;
	}
};

export { getUpdatedUserSigmaByLastPlayed };
