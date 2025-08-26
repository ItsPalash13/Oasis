import { Socket } from 'socket.io';
import { logger } from '../../utils/logger';
import { UserLevelSession } from '../../models/UserLevelSession';
import { Question } from '../../models/Questions';

import { UserProfile } from '../../models/UserProfile';
import Badge from '../../models/Badge';
import axios from 'axios';

// Extend Socket interface to include session tracking
interface ExtendedSocket extends Socket {
  userLevelSessionId?: string;
}

// Socket event handlers for quiz session management
export const quizSessionHandlers = (socket: ExtendedSocket) => {
  logger.info(`Quiz session socket connected: ${socket.id}`);

  // Handle initial level session retrieval
  // This is called when a user starts or reconnects to a quiz
  socket.on('getLevelSession', async ({ userLevelSessionId }) => {
    try {
      if (!userLevelSessionId) {
        throw new Error('Session ID is required');
      }

      // Store session ID for disconnect handling
      socket.userLevelSessionId = userLevelSessionId;

      // Find the existing session
      const session = await UserLevelSession.findById(userLevelSessionId);
      if (!session) {
        logger.warn(`Session not found for ID: ${userLevelSessionId}`);
        socket.emit('quizError', { 
          type: 'failure',
          message: 'Session not found. Please start a new quiz.' 
        });
        return;
      }

      // If there's a current question, fetch its details
      let currentQuestion = null;
      if (session.currentQuestion) {
        const question = await Question.findById(session.currentQuestion);
        if (question) {
          currentQuestion = {
            ques: question.ques,
            options: question.options,
            correct: question.correct,
            topics: question.topics?.map((t: any) => t.name) || []
          };
        }
      }

      // Calculate health data for both modes
      const correctQuestions = session.questionsAnswered?.correct?.length || 0;
      const incorrectQuestions = session.questionsAnswered?.incorrect?.length || 0;
      const requiredCorrectQuestions = session.attemptType === 'time_rush' ? 
        session.timeRush.requiredCorrectQuestions : 
        session.precisionPath.requiredCorrectQuestions;
      const totalQuestions = session.attemptType === 'time_rush' ?
        session.timeRush.totalQuestions :
        session.precisionPath.totalQuestions;
      const maxAllowedIncorrect = totalQuestions - requiredCorrectQuestions;
      const remainingHealth = Math.max(0, maxAllowedIncorrect - incorrectQuestions);

      // Send session data back to client
      // Include mode-specific data (timeRush or precisionPath)
      socket.emit('levelSession', {
        currentQuestion,
        attemptType: session.attemptType,
        currentStreak: session.streak || 0,
        remainingHealth: remainingHealth,
        currentCorrectQuestions: correctQuestions,
        requiredCorrectQuestions: requiredCorrectQuestions,
        ...(session.attemptType === 'time_rush' ? {
          timeRush: {
            currentTime: session.timeRush.currentTime,
            currentXp: session.timeRush.currentXp,
            requiredCorrectQuestions: session.timeRush.requiredCorrectQuestions,
            currentCorrectQuestions: correctQuestions,
            timeLimit: session.timeRush.timeLimit,
            currentQuestionIndex: session.currentQuestionIndex,
            totalQuestions: session.timeRush.totalQuestions
          }
        } : {
          precisionPath: {
            currentTime: session.precisionPath.currentTime,
            currentXp: session.precisionPath.currentXp,
            requiredCorrectQuestions: session.precisionPath.requiredCorrectQuestions,
            currentCorrectQuestions: correctQuestions,
            totalQuestions: session.precisionPath.totalQuestions,
            currentQuestionIndex: session.currentQuestionIndex,
            expectedTime: session.precisionPath.expectedTime
          }
        })
      });

    } catch (error) {
      logger.error('Error getting level session:', error);
      socket.emit('quizError', {
        type: 'failure',
        message: error.message || 'Failed to get level session'
      });
    }
  });

  // Handle manual quiz end
  // Called when user clicks "End Quiz" button
  socket.on('sendQuizEnd', async ({ userLevelSessionId }) => {
    try {
      const session = await UserLevelSession.findById(userLevelSessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Call the end API to process final results
      const response = await axios.post(`${process.env.BACKEND_URL}/api/levels/end`, {
        userLevelSessionId,
        userId: session.userId
      });

      // Process badges and fetch earned badges
      const userProfile = await UserProfile.findOne({ userId: session.userId });
      let earnedBadges: Array<{ badgeId: string, level: number, badgeName: string, badgeImage: string, badgeDescription: string }> = [];
      if (userProfile && userProfile.badges) {
        const sessionBadges = userProfile.badges.filter(b => b.userLevelSessionId === userLevelSessionId);
        for (const badge of sessionBadges) {
          const badgeDoc = await Badge.findById(badge.badgeId);
          if (badgeDoc) {
            earnedBadges.push({ 
              badgeId: badge.badgeId.toString(), 
              level: badge.level, 
              badgeName: badgeDoc.badgeName,
              badgeImage: badgeDoc.badgelevel?.[badge.level]?.badgeImage || '',
              badgeDescription: badgeDoc.badgeDescription || ''
            });
          }
        }
      }

      // Send final results to client
      socket.emit('quizFinished', { 
        message: (response.data as any).message,
        attemptType: session.attemptType,
        questionsHistory: session.questionsHistory || [],
        ...(session.attemptType === 'time_rush' ? {
          timeRush: {
            currentXp: session.timeRush.currentXp,
            currentCorrectQuestions: (response.data as any).data.currentCorrectQuestions,
            requiredCorrectQuestions: (response.data as any).data.requiredCorrectQuestions,
            minTime: (response.data as any).data.minTime,
            timeTaken: (response.data as any).data.timeTaken,
            percentile: (response.data as any).data.percentile,
            rank: (response.data as any).data.rank,
            leaderboard: (response.data as any).data.leaderboard
          }
        } : {
          precisionPath: {
            currentXp: session.precisionPath.currentXp,
            currentCorrectQuestions: (response.data as any).data.currentCorrectQuestions,
            requiredCorrectQuestions: (response.data as any).data.requiredCorrectQuestions,
            timeTaken: (response.data as any).data.timeTaken,
            bestTime: (response.data as any).data.bestTime,
            percentile: (response.data as any).data.percentile,
            rank: (response.data as any).data.rank,
            leaderboard: (response.data as any).data.leaderboard
          }
        }),
        hasNextLevel: (response.data as any).data.hasNextLevel,
        nextLevelNumber: (response.data as any).data.nextLevelNumber,
        nextLevelId: (response.data as any).data.nextLevelId,
        nextLevelAttemptType: (response.data as any).data.nextLevelAttemptType,
        questionsNeeded: (response.data as any).data.questionsNeeded,
        earnedBadges,
        aiFeedback: (response.data as any).data.aiFeedback,
        topics: (response.data as any).data.topics || []
      });
      socket.disconnect();

    } catch (error) {
      logger.error('Error ending quiz:', error);
      socket.emit('quizError', { 
        type: 'failure',
        message: error.message || 'Failed to end quiz' 
      });
    }
  });

  // Handle session deletion when back button is confirmed
  // Called when user confirms they want to leave the quiz
  socket.on('sendDeleteSession', async ({ userLevelSessionId }) => {
    try {
      const session = await UserLevelSession.findById(userLevelSessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Delete the session
      await UserLevelSession.findByIdAndDelete(userLevelSessionId);
      logger.info(`Session deleted by user: ${userLevelSessionId}`);

      // Confirm deletion to client
      socket.emit('sessionDeleted', { 
        message: 'Quiz session has been deleted successfully.' 
      });
      socket.disconnect();

    } catch (error) {
      logger.error('Error deleting session:', error);
      socket.emit('quizError', { 
        type: 'failure',
        message: error.message || 'Failed to delete session' 
      });
    }
  });

  // Handle time up event
  // Called when time runs out in Time Rush mode
  socket.on('sendTimesUp', async ({ userLevelSessionId }) => {
    try {
      const session = await UserLevelSession.findById(userLevelSessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Call the end API to process final results
      const response = await axios.post(`${process.env.BACKEND_URL}/api/levels/end`, {
        userLevelSessionId,
        userId: session.userId
      });

      // Process badges and fetch earned badges
      const userProfile = await UserProfile.findOne({ userId: session.userId });
      let earnedBadges: Array<{ badgeId: string, level: number, badgeName: string, badgeImage: string, badgeDescription: string }> = [];
      if (userProfile && userProfile.badges) {
        const sessionBadges = userProfile.badges.filter(b => b.userLevelSessionId === userLevelSessionId);
        for (const badge of sessionBadges) {
          const badgeDoc = await Badge.findById(badge.badgeId);
          if (badgeDoc) {
            earnedBadges.push({ 
              badgeId: badge.badgeId.toString(), 
              level: badge.level, 
              badgeName: badgeDoc.badgeName,
              badgeImage: badgeDoc.badgelevel?.[badge.level]?.badgeImage || '',
              badgeDescription: badgeDoc.badgeDescription || ''
            });
          }
        }
      }

      // Send final results to client
      socket.emit('quizFinished', { 
        message: (response.data as any).message,
        attemptType: session.attemptType,
        questionsHistory: session.questionsHistory || [],
        ...(session.attemptType === 'time_rush' ? {
          timeRush: {
            currentXp: session.timeRush.currentXp,
            currentCorrectQuestions: (response.data as any).data.currentCorrectQuestions,
            requiredCorrectQuestions: (response.data as any).data.requiredCorrectQuestions,
            minTime: (response.data as any).data.minTime,
            timeTaken: (response.data as any).data.timeTaken,
            percentile: (response.data as any).data.percentile,
            rank: (response.data as any).data.rank,
            leaderboard: (response.data as any).data.leaderboard
          }
        } : {
          precisionPath: {
            currentXp: session.precisionPath.currentXp,
            currentCorrectQuestions: (response.data as any).data.currentCorrectQuestions,
            requiredCorrectQuestions: (response.data as any).data.requiredCorrectQuestions,
            timeTaken: (response.data as any).data.timeTaken,
            bestTime: (response.data as any).data.bestTime,
            percentile: (response.data as any).data.percentile,
            rank: (response.data as any).data.rank,
            leaderboard: (response.data as any).data.leaderboard
          }
        }),
        hasNextLevel: false,
        nextLevelNumber: null,
        nextLevelId: null,
        nextLevelAttemptType: null,
        questionsNeeded: (response.data as any).data.questionsNeeded,
        earnedBadges,
        aiFeedback: (response.data as any).data.aiFeedback,
        isNewHighScore: (response.data as any).data.isNewHighScore,
        topics: (response.data as any).data.topics || []
      });

    } catch (error) {
      logger.error('Error in time up:', error);
      socket.emit('quizError', { 
        type: 'failure',
        message: error.message || 'Failed to end quiz' 
      });
    }
  });

  // Handle socket disconnection
  // Basic cleanup on disconnect (no reconnect logic)
  socket.on('disconnect', async () => {
    try {
      logger.info(`Quiz session socket disconnected: ${socket.id}`);
      
      if (socket.userLevelSessionId) {
        logger.info(`Session ${socket.userLevelSessionId} disconnected - no reconnect logic`);
      }
      
    } catch (error) {
      logger.error('Error handling socket disconnect:', error);
    }
  });
}; 