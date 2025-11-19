import { SIGMA_DECAY_CONST } from "../../config/constants";
import { IUserChapterTicket } from "../../models/UserChapterTicket";

const getUpdatedUserSigmaByLastPlayed = async ({ userChapterTicket }: { userChapterTicket: IUserChapterTicket }) => {
	try {
		const currentTime = new Date();
		const lastPlayedTime = userChapterTicket.lastPlayedTs;
		const timeDiff = currentTime.getTime() - lastPlayedTime.getTime();
		const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));

		if (daysDiff <= 0) {
			return;
		}
		let newUserSigma = userChapterTicket.trueSkillScore?.sigma || 3;
		newUserSigma += newUserSigma * (1 - Math.exp(-SIGMA_DECAY_CONST * daysDiff));

		// INSERT_YOUR_CODE
		// Fetch the UserTs document for this user
        console.log("The new user sigma is before and afteR ", userChapterTicket.trueSkillScore?.sigma, newUserSigma);
		return newUserSigma;
	} catch (error) {
		console.error("Error updating user sigma:", error);
		return userChapterTicket.trueSkillScore?.sigma;
	}
};

export { getUpdatedUserSigmaByLastPlayed };
