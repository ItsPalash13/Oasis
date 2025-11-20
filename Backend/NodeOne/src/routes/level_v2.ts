import express, { Request, Response, NextFunction } from "express";
import { UserChapterSessionService } from "../services/quizv2/userchapter-session/UserChapterSession";
import authMiddleware from "../middleware/authMiddleware";

const router = express.Router();

const startUserChapterSessionRouter = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const userId = (req as any).user.id;
		const { chapterId } = req.body;

		if (!userId) {
			throw { statusCode: 400, code: "MissingParameter", message: "userId is required" };
		}

		if (!chapterId) {
			throw { statusCode: 400, code: "MissingParameter", message: "chapterId is required" };
		}
		console.log("LEVEL V2 ORIGINAL ROUTE CALLED ", userId, chapterId);
		const result = await UserChapterSessionService.startUserChapterSession({ userId, chapterId });

		console.log("LEVEL V2 ORIGINAL ROUTE RESULT ", result);
		return res.json(result);
	} catch (error: any) {
		next(error);
		return;
	}
};

router.post("/start", authMiddleware, startUserChapterSessionRouter);

export default router;
