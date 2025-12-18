import express from 'express';
import { Misc } from '../models/Misc';
import { Request, Response } from 'express';

const router = express.Router();

// PUBLIC ROUTE: GET dummy users for a specific chapter (for leaderboard)
// This route doesn't require authentication
router.get('/chapter/:chapterId', async (req: Request, res: Response) => {
  try {
    const { chapterId } = req.params;
    const miscEntry = await Misc.findOne({ chapterId });
    
    if (!miscEntry) {
      // Try to get default chapter
      const defaultEntry = await Misc.findOne({ chapterId: 'default' });
      if (defaultEntry) {
        return res.json({
          success: true,
          data: defaultEntry.users
        });
      }
      // Return empty array if neither chapter nor default found
      return res.json({
        success: true,
        data: []
      });
    }
    
    return res.json({
      success: true,
      data: miscEntry.users
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

