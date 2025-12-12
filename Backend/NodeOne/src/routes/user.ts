import express, { NextFunction } from 'express';
import { UserProfile } from '../models/UserProfile';
import UserChapterSession from '../models/UserChapterSession';
import authMiddleware from '../middleware/authMiddleware';
import { Request, Response } from 'express';
import mongoose from 'mongoose';

const router = express.Router();


const getAllUsersRouter = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await UserProfile.find().populate({
      path: 'badges.badgeId',
      select: 'badgeName badgeType badgeslug badgeDescription badgelevel',
    });
    return res.json({ users });
  } catch (error) {
    return next(error);
  }
};

router.get('/', getAllUsersRouter);


// GET user info
router.get('/info/:userId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const authUser = (req as any).user;
    if (!authUser || authUser.id !== userId) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    
    // First fetch without populate to see raw data
    const userRaw = await UserProfile.findOne({ userId }).lean();
    if (userRaw) {
      console.log('BACKEND - Raw analytics data:', {
        userId,
        strengths: userRaw.analytics?.strengths,
        weaknesses: userRaw.analytics?.weaknesses,
        strengthsType: userRaw.analytics?.strengths?.map((s: any) => typeof s),
        weaknessesType: userRaw.analytics?.weaknesses?.map((w: any) => typeof w),
      });
    }
    
    const user = await UserProfile.findOne({ userId })
      .populate({
        path: 'badges.badgeId',
        select: 'badgeName badgeType badgeslug badgeDescription badgelevel',
      })
      .populate({
        path: 'analytics.strengths',
        select: '_id name',
        model: 'Chapter',
      })
      .populate({
        path: 'analytics.weaknesses',
        select: '_id name',
        model: 'Chapter',
      });
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    console.log('BACKEND - After populate analytics data:', {
      userId,
      strengths: user.analytics?.strengths,
      weaknesses: user.analytics?.weaknesses,
    });
    
    return res.json({ success: true, data: user });
  } catch (error) {
    console.error('BACKEND - Error fetching user info:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH user info
router.patch('/info/:userId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const authUser = (req as any).user;
    if (!authUser || authUser.id !== userId) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    const allowedFields = ['username', 'fullName', 'bio', 'dob', 'avatar', 'avatarBgColor', 'onboardingCompleted', 'strongestSubject', 'weakestSubject'];
    const update: any = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) update[field] = req.body[field];
    }
    const user = await UserProfile.findOneAndUpdate({ userId }, update, { new: true });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    return res.json({ success: true, data: user });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET user settings (dummy)
router.get('/settings/:userId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const authUser = (req as any).user;
    if (!authUser || authUser.id !== userId) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    // Dummy settings
    return res.json({ success: true, data: { darkMode: false, notifications: true } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH user settings (dummy)
router.patch('/settings/:userId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const authUser = (req as any).user;
    if (!authUser || authUser.id !== userId) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    // Accept and echo back settings for now
    return res.json({ success: true, data: req.body });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET user chapter sessions
router.get('/chapter-sessions', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }

    // Find all UserChapterSessions for this user, including analytics
    const sessions = await UserChapterSession.find({ 
      userId: new mongoose.Types.ObjectId(userId) 
    })
    .select('chapterId userRating analytics.userAttemptWindowList')
    .lean();

    return res.json({ 
      success: true, 
      data: sessions 
    });
  } catch (error) {
    console.error('Error fetching user chapter sessions:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET user chapter session data by chapterId (full session data)
router.get('/chapter-session/:chapterId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { chapterId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }

    if (!chapterId) {
      return res.status(400).json({ success: false, error: 'Chapter ID is required' });
    }

    // Find UserChapterSession for this user and chapter
    const session = await UserChapterSession.findOne({ 
      userId: new mongoose.Types.ObjectId(userId),
      chapterId: new mongoose.Types.ObjectId(chapterId)
    })
    .select('chapterId userRating analytics maxScore lastPlayedTs')
    .lean();

    if (!session) {
      return res.json({ 
        success: true, 
        data: null 
      });
    }

    return res.json({ 
      success: true, 
      data: session
    });
  } catch (error) {
    console.error('Error fetching user chapter session:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET user chapter session analytics by chapterId
router.get('/chapter-session/:chapterId/analytics', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { chapterId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }

    if (!chapterId) {
      return res.status(400).json({ success: false, error: 'Chapter ID is required' });
    }

    // Find UserChapterSession for this user and chapter
    const session = await UserChapterSession.findOne({ 
      userId: new mongoose.Types.ObjectId(userId),
      chapterId: new mongoose.Types.ObjectId(chapterId)
    })
    .select('analytics.userAttemptWindowList')


    console.log("The analytics data is: ", session);
    if (!session) {
      return res.json({ 
        success: true, 
        data: { userAttemptWindowList: [] } 
      });
    }

    return res.json({ 
      success: true, 
      data: {
        userAttemptWindowList: session.analytics?.userAttemptWindowList || []
      }
    });
  } catch (error) {
    console.error('Error fetching user chapter session analytics:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET chapter leaderboard (top 10 by userRating)
router.get('/chapter-session/:chapterId/leaderboard', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { chapterId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }

    if (!chapterId) {
      return res.status(400).json({ success: false, error: 'Chapter ID is required' });
    }

    const chapterIdObj = new mongoose.Types.ObjectId(chapterId);
    const userIdObj = new mongoose.Types.ObjectId(userId);

    // Get top 10 sessions sorted by userRating (descending), then by lastPlayedTs for consistency
    const top10Sessions = await UserChapterSession.find({
      chapterId: chapterIdObj,
      userRating: { $exists: true, $gt: 0 }
    })
    .sort({ userRating: -1, lastPlayedTs: -1 })
    .limit(10)
    .lean();

    // Populate user profiles for top 10 sessions
    const top10SessionsWithProfiles = await Promise.all(
      top10Sessions.map(async (session) => {
        const userProfile = await UserProfile.findOne({ userId: session.userId.toString() }).select('userId fullName avatar avatarBgColor username').lean();
        return {
          ...session,
          userProfile
        };
      })
    );

    // Check if current user is in top 10
    const currentUserInTop10 = top10SessionsWithProfiles.some(
      session => session.userProfile && session.userProfile.userId === userId
    );

    // Format top 10 leaderboard
    const leaderboard = top10SessionsWithProfiles
      .filter(session => session.userProfile) // Filter out any sessions where user profile wasn't found
      .map((session, index) => ({
        rank: index + 1,
        userId: session.userProfile!.userId,
        fullName: session.userProfile!.fullName || session.userProfile!.username || `User ${session.userProfile!.userId?.slice(-4)}`,
        avatar: session.userProfile!.avatar,
        avatarBgColor: session.userProfile!.avatarBgColor,
        userRating: session.userRating
      }));

    // If user is not in top 10, get their session and calculate overall rank
    if (!currentUserInTop10) {
      const currentUserSession = await UserChapterSession.findOne({
        userId: userIdObj,
        chapterId: chapterIdObj
      }).lean();

      if (currentUserSession && currentUserSession.userRating > 0) {
        // Count users with higher or equal rating to get overall rank
        const usersWithHigherRating = await UserChapterSession.countDocuments({
          chapterId: chapterIdObj,
          userRating: { $gte: currentUserSession.userRating },
          userId: { $ne: userIdObj } // Exclude current user from count
        });
        
        const overallRank = usersWithHigherRating + 1;

        // Get current user's profile
        const currentUserProfile = await UserProfile.findOne({ userId }).select('fullName avatar avatarBgColor username').lean();

        if (currentUserProfile) {
          // Add current user to leaderboard
          leaderboard.push({
            rank: overallRank,
            userId: userId,
            fullName: currentUserProfile.fullName || currentUserProfile.username || `User ${userId.slice(-4)}`,
            avatar: currentUserProfile.avatar,
            avatarBgColor: currentUserProfile.avatarBgColor,
            userRating: currentUserSession.userRating
          });
        }
      }
    }

    return res.json({
      success: true,
      data: leaderboard,
      currentUserRank: currentUserInTop10 
        ? leaderboard.findIndex(u => u.userId === userId) + 1
        : leaderboard.length > 10 ? leaderboard[leaderboard.length - 1].rank : null
    });
  } catch (error) {
    console.error('Error fetching chapter leaderboard:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET monthly leaderboard
router.get('/monthly-leaderboard', async (req: Request, res: Response ) => {
  try {
    const { month } = req.query;
    const currentMonth = month || new Date().toISOString().slice(0, 7).replace('-', '/');
    
    // Get top 10 users for the specified month
    const leaderboard = await UserProfile.aggregate([
      {
        $match: {
          [`monthlyXp.${currentMonth}`]: { $exists: true, $gt: 0 }
        }
      },
      {
        $project: {
          userId: 1,
          username: 1,
          fullName: 1,
          avatar: 1,
          avatarBgColor: 1,
          monthlyXp: 1,
          totalCoins: 1
        }
      },
      {
        $addFields: {
          currentMonthXp: { $ifNull: [`$monthlyXp.${currentMonth}`, 0] }
        }
      },
      {
        $sort: { currentMonthXp: -1 }
      },
      {
        $limit: 10
      },
      {
        $project: {
          _id: 1,
          userId: 1,
          username: 1,
          fullName: 1,
          avatar: 1,
          avatarBgColor: 1,
          currentMonthXp: 1,
          totalCoins: 1,
          displayName: {
            $cond: {
              if: { $and: [{ $ne: ['$fullName', null] }, { $ne: ['$fullName', ''] }] },
              then: '$fullName',
              else: '$username'
            }
          }
        }
      }
    ]);

    return res.json({ 
      success: true, 
      data: leaderboard,
      month: currentMonth
    });
  } catch (error) {
    console.error('Error fetching monthly leaderboard:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
