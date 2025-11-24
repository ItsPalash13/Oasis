import express, { Request, Response, NextFunction } from "express";
import authMiddleware from "../middleware/authMiddleware";
import { IMetadata, Metadata} from "../models/Metadata";

const router = express.Router();

const getAllMetadataRouter = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const metadataList: IMetadata[] = await Metadata.find().exec();
        return res.json({ success: true, data: metadataList });
	} catch (error: any) {
		next(error);
		return;
	}
};

const getMetadataByTypeRouter = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { metadataType } = req.params;
        if (!metadataType) {
            throw { statusCode: 400, code: "MissingParameter", message: "metadataType is required" };
        }
        const metadataList: IMetadata[] = await Metadata.find({ metadataType }).exec();
        return res.json({ success: true, data: metadataList });
    } catch (error: any) {
        next(error);
        return;
    }
};

router.get("/", authMiddleware, getAllMetadataRouter);
router.get("/:metadataType", authMiddleware, getMetadataByTypeRouter);

export default router;