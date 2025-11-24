import { USER_RATING_DEFAULT, USER_RATING_MAX, USER_RATING_MULTIPLIER } from "../../../../config/constants";

namespace UserRatingService {
    export const calculateUserRatingByCurrentRatingAndMu = ({currentRating, mu}: {currentRating: number, mu: number}): number => {
        const userRating = (currentRating || USER_RATING_DEFAULT) + Math.round(mu * USER_RATING_MULTIPLIER);
        return Math.min(userRating, USER_RATING_MAX);
    }
}

export default UserRatingService;
