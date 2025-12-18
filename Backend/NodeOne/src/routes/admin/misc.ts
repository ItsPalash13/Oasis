import express from 'express';
import { Misc, IDummyUser } from '../../models/Misc';
import { Request, Response } from 'express';

const router = express.Router();

// GET all misc entries (all chapters with their dummy users)
router.get('/', async (req: Request, res: Response) => {
  try {
    const miscEntries = await Misc.find().sort({ chapterId: 1 });
    
    // Transform to object format like the JSON file structure
    const result: { [key: string]: IDummyUser[] } = {};
    miscEntries.forEach(entry => {
      result[entry.chapterId] = entry.users;
    });
    
    return res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET dummy users for a specific chapter
router.get('/chapter/:chapterId', async (req: Request, res: Response) => {
  try {
    const { chapterId } = req.params;
    const miscEntry = await Misc.findOne({ chapterId });
    
    if (!miscEntry) {
      // Return empty array if chapter not found
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

// POST create or update a chapter's dummy users
router.post('/chapter/:chapterId', async (req: Request, res: Response) => {
  try {
    const { chapterId } = req.params;
    const { users } = req.body;
    
    if (!Array.isArray(users)) {
      return res.status(400).json({
        success: false,
        error: 'users must be an array'
      });
    }
    
    // Validate each user object
    for (const user of users) {
      if (!user.userId || !user.fullName || typeof user.userRating !== 'number' || !user.avatarBgColor) {
        return res.status(400).json({
          success: false,
          error: 'Each user must have userId, fullName, userRating (number), and avatarBgColor'
        });
      }
    }
    
    // Sort users by rating descending
    const sortedUsers = [...users].sort((a, b) => b.userRating - a.userRating);
    
    // Upsert (create or update)
    const miscEntry = await Misc.findOneAndUpdate(
      { chapterId },
      { users: sortedUsers },
      { new: true, upsert: true, runValidators: true }
    );
    
    return res.json({
      success: true,
      data: miscEntry
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// PUT update a specific user in a chapter
router.put('/chapter/:chapterId/user/:userId', async (req: Request, res: Response) => {
  try {
    const { chapterId, userId } = req.params;
    const { fullName, userRating, avatarBgColor } = req.body;
    
    const miscEntry = await Misc.findOne({ chapterId });
    if (!miscEntry) {
      return res.status(404).json({
        success: false,
        error: 'Chapter not found'
      });
    }
    
    const userIndex = miscEntry.users.findIndex(u => u.userId === userId);
    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Update user
    if (fullName !== undefined) miscEntry.users[userIndex].fullName = fullName;
    if (userRating !== undefined) miscEntry.users[userIndex].userRating = userRating;
    if (avatarBgColor !== undefined) miscEntry.users[userIndex].avatarBgColor = avatarBgColor;
    
    // Sort by rating descending
    miscEntry.users.sort((a, b) => b.userRating - a.userRating);
    
    await miscEntry.save();
    
    return res.json({
      success: true,
      data: miscEntry
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// POST add a new user to a chapter
router.post('/chapter/:chapterId/user', async (req: Request, res: Response) => {
  try {
    const { chapterId } = req.params;
    const { userId, fullName, userRating, avatarBgColor } = req.body;
    
    if (!userId || !fullName || typeof userRating !== 'number' || !avatarBgColor) {
      return res.status(400).json({
        success: false,
        error: 'userId, fullName, userRating (number), and avatarBgColor are required'
      });
    }
    
    let miscEntry = await Misc.findOne({ chapterId });
    
    if (!miscEntry) {
      // Create new entry if chapter doesn't exist
      miscEntry = new Misc({ chapterId, users: [] });
    }
    
    // Check if user already exists
    if (miscEntry.users.some(u => u.userId === userId)) {
      return res.status(400).json({
        success: false,
        error: 'User with this userId already exists in this chapter'
      });
    }
    
    // Add new user
    miscEntry.users.push({ userId, fullName, userRating, avatarBgColor });
    
    // Sort by rating descending
    miscEntry.users.sort((a, b) => b.userRating - a.userRating);
    
    await miscEntry.save();
    
    return res.json({
      success: true,
      data: miscEntry
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE a user from a chapter
router.delete('/chapter/:chapterId/user/:userId', async (req: Request, res: Response) => {
  try {
    const { chapterId, userId } = req.params;
    
    const miscEntry = await Misc.findOne({ chapterId });
    if (!miscEntry) {
      return res.status(404).json({
        success: false,
        error: 'Chapter not found'
      });
    }
    
    const initialLength = miscEntry.users.length;
    miscEntry.users = miscEntry.users.filter(u => u.userId !== userId);
    
    if (miscEntry.users.length === initialLength) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    await miscEntry.save();
    
    return res.json({
      success: true,
      data: miscEntry
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE an entire chapter
router.delete('/chapter/:chapterId', async (req: Request, res: Response) => {
  try {
    const { chapterId } = req.params;
    
    if (chapterId === 'default') {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete the default chapter'
      });
    }
    
    const miscEntry = await Misc.findOneAndDelete({ chapterId });
    if (!miscEntry) {
      return res.status(404).json({
        success: false,
        error: 'Chapter not found'
      });
    }
    
    return res.json({
      success: true,
      message: 'Chapter deleted successfully'
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

