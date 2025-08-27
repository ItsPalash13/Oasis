import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  Chip,
  Grid,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import { Star as StarIcon, EmojiEvents as TrophyIcon, TrendingUp as TrendingIcon, Timer as TimerIcon } from '@mui/icons-material';
import { quizStyles } from '../../../theme/quizTheme';
// Leaderboard removed in favor of percentiles

const Results = ({ quizResults, earnedBadges, formatTime, onNextLevel }) => {
  if (!quizResults) return null;

  const isTimeRush = quizResults.attemptType === 'time_rush';
  const data = isTimeRush ? quizResults.timeRush : quizResults.precisionPath;
  const progressPercent = data.requiredCorrectQuestions
    ? Math.min((data.currentCorrectQuestions / data.requiredCorrectQuestions) * 100, 100)
    : 0;
  const isLevelCompleted = data.currentXp >= data.requiredXp;
  const hasNextLevel = quizResults.hasNextLevel && quizResults.nextLevelId;

  const showBestMsg = Boolean(data?.isnewmintime || data?.isnewmaxxp);
  const bestMsg = showBestMsg
    ? `${data?.isnewmintime ? (isTimeRush ? 'New best remaining time!' : 'New best time!') : ''}${data?.isnewmintime && data?.isnewmaxxp ? ' • ' : ''}${data?.isnewmaxxp ? 'New max XP!' : ''}`
    : '';

  // Build headline and supporting line
  const headline = showBestMsg
    ? (isLevelCompleted ? 'Awesome! New personal best!' : 'Great progress! New personal best!')
    : (isLevelCompleted ? 'Well done! Level complete!' : 'Nice effort! Keep going!');

  const timePctText = typeof data.timePercentile === 'number' ? `Top ${data.timePercentile}% in time` : '';
  const xpPctText = typeof data.xpPercentile === 'number' ? `Top ${data.xpPercentile}% in XP` : '';
  const percentileLine = [timePctText, xpPctText].filter(Boolean).join(' • ');

  // Choose banner styles and icon
  const bothBest = Boolean(data?.isnewmintime && data?.isnewmaxxp);
  let bannerGradient = 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)';
  if (bothBest) {
    bannerGradient = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
  } else if (data?.isnewmintime) {
    bannerGradient = 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)';
  } else if (data?.isnewmaxxp) {
    bannerGradient = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
  } else if (!isLevelCompleted) {
    bannerGradient = 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)';
  }

  return (
    <Box sx={{ 
      maxHeight: '100vh', 
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      gap: 1,
      p: 0,
      '& .blink': {
        animation: 'blink 1s infinite',
      },
      '@keyframes blink': {
        '0%, 50%': { opacity: 1 },
        '51%, 100%': { opacity: 0 },
      }
    }}>
      {/* Header Section - XP and Percentile */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        mb: 1
      }}>
        {/* XP Display */}
        <Box sx={{
          display: 'flex',
          gap: 1,
          p: 1.5,
          borderRadius: 2,
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          color: 'white',
          boxShadow: '0 4px 16px rgba(245, 158, 11, 0.25)',
          flex: 1,
          maxWidth: '45%'
        }}>
          <StarIcon sx={{ fontSize: '1.2rem' }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 'bold', lineHeight: 1 }}>
              {data.currentXp}
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
              XP EARNED
            </Typography>
          </Box>
        </Box>

        {/* Time Taken Display */}
        {data.timeTaken !== undefined && (
          <Box sx={{
            display: 'flex',
            gap: 1,
            p: 1.5,
            borderRadius: 2,
            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            color: 'white',
            boxShadow: '0 4px 16px rgba(139, 92, 246, 0.25)',
            flex: 1,
            maxWidth: '45%'
          }}>
            <TimerIcon sx={{ fontSize: '1.2rem' }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 'bold', lineHeight: 1 }}>
                {formatTime ? formatTime(data.timeTaken) : `${Math.floor(data.timeTaken / 60)}:${(data.timeTaken % 60).toString().padStart(2, '0')}`}
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                TIME TAKEN
              </Typography>
            </Box>
          </Box>
        )}

      </Box>

      {/* Percentiles Section */}
      {(typeof data.timePercentile === 'number' || typeof data.xpPercentile === 'number') && (
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          mb: 1
        }}>
                    {/* XP Percentile Card */}
                    {typeof data.xpPercentile === 'number' && (
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 1.5,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: 'white',
              boxShadow: '0 4px 16px rgba(245, 158, 11, 0.25)',
              flex: 1,
              maxWidth: '45%'
            }}>
              <TrendingIcon sx={{ fontSize: '1.2rem' }} />
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 'bold', lineHeight: 1 }}>
                  {`${data.xpPercentile === 100 ? '99.99' : data.xpPercentile === 0 ? '0.01' : data.xpPercentile}%`}
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                  XP PERCENTILE
                </Typography>
              </Box>
            </Box>
          )}

          {/* Time Percentile Card */}
          {typeof data.timePercentile === 'number' && (
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 1.5,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              color: 'white',
              boxShadow: '0 4px 16px rgba(139, 92, 246, 0.25)',
              flex: 1,
              maxWidth: '45%'
            }}>
              <TimerIcon sx={{ fontSize: '1.2rem' }} />
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 'bold', lineHeight: 1 }}>
                  {`${data.timePercentile === 100 ? '99.99' : data.timePercentile === 0 ? '0.01' : data.timePercentile}%`}
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                  TIME PERCENTILE
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
      )}

      {/* Personal Best Banners (separate, solid colors) */}
      <Box sx={{ mt: 1.5, mb: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {data?.isnewmintime && (
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            p: 2,
            borderRadius: 2,
            background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
            color: 'white',
            boxShadow: '0 0 8px rgba(6, 182, 212, 0.4)',
            border: '1px solid rgba(6, 182, 212, 0.6)',
            position: 'relative'
          }}>
            <Box sx={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.15)',
              boxShadow: '0 0 6px rgba(255,255,255,0.3)',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              <TimerIcon sx={{ color: 'white' }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" sx={{ 
                fontWeight: 'bold', 
                lineHeight: 1.1,
                textShadow: '0 0 4px rgba(255,255,255,0.5)'
              }}>
               Congratulations! {isTimeRush ? 'New Best Time!' : 'New Min Time!'}
              </Typography>
            </Box>
          </Box>
        )}
        {data?.isnewmaxxp && (
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            p: 2,
            borderRadius: 2,
            background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
            color: 'white',
            boxShadow: '0 0 8px rgba(236, 72, 153, 0.4)',
            border: '1px solid rgba(236, 72, 153, 0.6)',
            position: 'relative'
          }}>
            <Box sx={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.15)',
              boxShadow: '0 0 6px rgba(255,255,255,0.3)',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              <TrendingIcon sx={{ color: 'white' }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" sx={{ 
                fontWeight: 'bold', 
                lineHeight: 1.1,
                textShadow: '0 0 4px rgba(255,255,255,0.5)'
              }}>
                Congratulations! New Max XP!
              </Typography>
            </Box>
          </Box>
        )}
      </Box>

      <style>
        {`
          @keyframes neonPulse {
            0% { text-shadow: 0 0 10px rgba(255,255,255,0.8); }
            100% { text-shadow: 0 0 20px rgba(255,255,255,1), 0 0 30px rgba(255,255,255,0.8); }
          }
        `}
      </style>

      {/* Progress Section - Full Width 
      <Card sx={{ 
        mb: 1,
        backgroundColor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
      }}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
            <LinearProgress 
              variant="determinate" 
              value={progressPercent}
              sx={{ 
                flex: 1,
                height: 8, 
                borderRadius: 4,
                backgroundColor: theme => theme.palette.mode === 'dark' ? '#3a3a5c' : '#e5e7eb',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                  background: isLevelCompleted ? '#4caf50' : '#f59e0b',
                }
              }}
            />
            <Typography variant="body2" fontWeight="bold" sx={{ minWidth: 'fit-content' }}>
              {progressPercent.toFixed(1)}%
            </Typography>
          </Box>
        </CardContent>
      </Card>
      */}

      {/* Badges Section - Full Width */}
      {earnedBadges && earnedBadges.length > 0 && (
        <Card sx={{
          backgroundColor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
        }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: 1,
              mb: 1
            }}>
              <TrophyIcon sx={{ color: '#f59e0b', fontSize: '1rem' }} />
              <Typography variant="body2" sx={{ 
                fontWeight: 'bold', 
                color: '#f59e0b'
              }}>
                New Badges Earned!
              </Typography>
            </Box>
            
            <Box sx={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: 1, 
              justifyContent: 'center'
            }}>
              {earnedBadges.map((badge, index) => (
                <Box key={index} sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 0.25,
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  borderRadius: 1,
                  padding: '8px 12px',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  minWidth: 80,
                  maxWidth: 100
                }}>
                  {badge.badgeImage && (
                    <img 
                      src={badge.badgeImage} 
                      alt={badge.badgeName} 
                      style={{ 
                        width: 32, 
                        height: 32, 
                        objectFit: 'contain'
                      }} 
                    />
                  )}
                  <Typography variant="caption" sx={{ 
                    fontWeight: 'bold', 
                    color: '#f59e0b',
                    textAlign: 'center',
                    lineHeight: 1.1,
                    fontSize: '0.7rem'
                  }}>
                    {badge.badgeName}
                  </Typography>
                  <Box sx={{ 
                    backgroundColor: '#f59e0b', 
                    color: 'white', 
                    borderRadius: '50%', 
                    width: 16, 
                    height: 16, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: '0.6rem',
                    fontWeight: 'bold'
                  }}>
                    {badge.level + 1}
                  </Box>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

    </Box>
  );
};

export default Results; 