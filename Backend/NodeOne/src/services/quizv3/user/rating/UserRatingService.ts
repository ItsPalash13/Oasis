import mongoose from "mongoose";
import { USER_RATING_DEFAULT, USER_RATING_MAX, USER_RATING_MULTIPLIER } from "../../../../config/constants";
import { Chapter } from "models/Chapter";

namespace UserRatingService {
    export const calculateUserRatingByCurrentRatingAndMu = async ({currentRating, chapterId, mu}: {currentRating: number, chapterId: mongoose.Types.ObjectId, mu: number}) => {
        // const userRating = (currentRating || USER_RATING_DEFAULT) + Math.round(mu * USER_RATING_MULTIPLIER);
        const chapter = await Chapter.findById(chapterId);
        const newUserRating = (chapter?.defaultRating || USER_RATING_DEFAULT) + Math.round(mu * (chapter?.ratingMultiplier || USER_RATING_MULTIPLIER));
        return Math.min(newUserRating, USER_RATING_MAX);
    }
}

export default UserRatingService;
