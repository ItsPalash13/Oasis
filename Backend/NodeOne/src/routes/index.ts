import express from 'express';
import chapterRoutes from './chapter';
import levelRoutes from './level';
import levelV2Routes from './level_v2';
import levelV3Routes from './level_v3';
import performanceRoutes from './performance';
import adminRoutes from './admin';
import userRoutes from './user';
import metadataRoutes from './metadata';
import miscRoutes from './misc';
const router = express.Router();

console.log("Routes loaded");
router.use('/chapters', chapterRoutes);
router.use('/levels', levelRoutes);
router.use('/level_v2', levelV2Routes);
router.use('/level_v3', levelV3Routes);
router.use('/performance', performanceRoutes);
router.use('/admin', adminRoutes);
router.use('/user', userRoutes);
router.use("/metadata", metadataRoutes);
router.use("/misc", miscRoutes);

export default router;

