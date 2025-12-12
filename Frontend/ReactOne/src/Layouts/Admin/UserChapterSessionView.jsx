import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Typography, Button, CircularProgress, Card, CardContent, useTheme, TextField, Grid } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useGetUserChapterSessionByIdQuery } from '../../features/api/adminAPI';
import { themeColors, colors } from '../../theme/colors';

const UserChapterSessionView = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { sessionId } = useParams();
  
  // Fetch the specific session
  const { data: sessionData, isLoading } = useGetUserChapterSessionByIdQuery(sessionId, {
    skip: !sessionId
  });
  const session = sessionData?.data;

  // Get actual color values from theme
  const textSecondary = theme.palette.mode === 'dark' ? colors.ui.dark.textSecondary : colors.ui.light.textSecondary;
  const textPrimary = theme.palette.mode === 'dark' ? colors.ui.dark.textPrimary : colors.ui.light.textPrimary;
  const cardBackground = theme.palette.mode === 'dark' ? colors.ui.dark.cardBackground : colors.ui.light.cardBackground;
  const cardBorder = theme.palette.mode === 'dark' ? colors.ui.dark.cardBorder : colors.ui.light.cardBorder;
  const buttonPrimary = theme.palette.mode === 'dark' ? colors.ui.dark.buttonPrimary : colors.ui.light.buttonPrimary;

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Format data for rating chart from session data
  const ratingChartData = useMemo(() => {
    const userAttemptWindowList = session?.analytics?.userAttemptWindowList;
    
    if (!userAttemptWindowList || userAttemptWindowList.length === 0) {
      return [];
    }

    // Helper function to filter by date range
    const filterByDateRange = (timestamp) => {
      if (!startDate && !endDate) return true;
      const entryDate = new Date(timestamp);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate + 'T23:59:59') : null;
      
      if (start && entryDate < start) return false;
      if (end && entryDate > end) return false;
      return true;
    };

    return userAttemptWindowList
      .filter(entry => entry && entry.timestamp && typeof entry.capturedRating === 'number' && filterByDateRange(entry.timestamp))
      .map((entry, index) => ({
        index: index + 1,
        rating: Number(entry.capturedRating.toFixed(2)),
        timestamp: new Date(entry.timestamp).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        fullTimestamp: new Date(entry.timestamp)
      }))
      .sort((a, b) => a.fullTimestamp - b.fullTimestamp);
  }, [session, startDate, endDate]);

  // Format data for accuracy chart from session data
  const accuracyChartData = useMemo(() => {
    const userAttemptWindowList = session?.analytics?.userAttemptWindowList;
    
    if (!userAttemptWindowList || userAttemptWindowList.length === 0) {
      return [];
    }

    // Helper function to filter by date range
    const filterByDateRange = (timestamp) => {
      if (!startDate && !endDate) return true;
      const entryDate = new Date(timestamp);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate + 'T23:59:59') : null;
      
      if (start && entryDate < start) return false;
      if (end && entryDate > end) return false;
      return true;
    };

    return userAttemptWindowList
      .filter(entry => entry && entry.timestamp && typeof entry.averageAccuracy === 'number' && filterByDateRange(entry.timestamp))
      .map((entry, index) => ({
        index: index + 1,
        accuracy: Number(entry.averageAccuracy.toFixed(2)),
        timestamp: new Date(entry.timestamp).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        fullTimestamp: new Date(entry.timestamp)
      }))
      .sort((a, b) => a.fullTimestamp - b.fullTimestamp);
  }, [session, startDate, endDate]);

  // Format data for afterUts.mu chart from tsChangeLogs
  const muChartData = useMemo(() => {
    const tsChangeLogs = session?.tsChangeLogs;
    
    if (!tsChangeLogs || tsChangeLogs.length === 0) {
      return [];
    }

    // Helper function to filter by date range
    const filterByDateRange = (timestamp) => {
      if (!startDate && !endDate) return true;
      const entryDate = new Date(timestamp);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate + 'T23:59:59') : null;
      
      if (start && entryDate < start) return false;
      if (end && entryDate > end) return false;
      return true;
    };

    return tsChangeLogs
      .filter(entry => entry && entry.timestamp && typeof entry.afterUts?.mu === 'number' && filterByDateRange(entry.timestamp))
      .map((entry, index) => ({
        index: index + 1,
        mu: Number(entry.afterUts.mu.toFixed(2)),
        timestamp: new Date(entry.timestamp).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        fullTimestamp: new Date(entry.timestamp)
      }))
      .sort((a, b) => a.fullTimestamp - b.fullTimestamp);
  }, [session, startDate, endDate]);

  const handleGoBack = () => {
    navigate(-1); // Go back to previous page (user sessions list)
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 'calc(100vh - 64px)',
          backgroundColor: themeColors.background.main,
        }}
      >
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading session data...</Typography>
      </Box>
    );
  }

  if (!session) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 'calc(100vh - 64px)',
          backgroundColor: themeColors.background.main,
          textAlign: 'center',
          p: 3,
        }}
      >
        <Typography variant="h5" sx={{ mb: 2, color: 'error.main' }}>
          Session not found
        </Typography>
        <Button onClick={handleGoBack} variant="outlined">
          Go back to Admin
        </Button>
      </Box>
    );
  }

  const userName = session.userProfile 
    ? `${session.userProfile.username} (${session.userProfile.email})`
    : session.userId || 'Unknown User';
  const chapterName = session.chapterId?.name || session.chapterId || 'Unknown Chapter';

  return (
    <Box
      sx={{
        width: '100%',
        minHeight: 'calc(100vh - 64px)',
        backgroundColor: themeColors.background.main,
        p: 3,
      }}
    >
      <Card
        sx={{
          maxWidth: 1200,
          width: '100%',
          margin: '0 auto',
          boxShadow: 3,
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Button
              onClick={handleGoBack}
              startIcon={<ArrowBackIcon />}
              sx={{
                color: themeColors.text.secondary,
                '&:hover': {
                  backgroundColor: themeColors.ui.hover,
                },
              }}
            >
              Back
            </Button>
          </Box>

          <Typography
            variant="h4"
            sx={{
              mb: 1,
              fontWeight: 700,
              textAlign: 'center',
              color: themeColors.text.primary,
            }}
          >
            {userName}
          </Typography>

          <Typography
            variant="h6"
            sx={{
              mb: 3,
              textAlign: 'center',
              color: themeColors.text.secondary,
            }}
          >
            {chapterName}
          </Typography>

          {/* Date Filters */}
          <Box sx={{ mb: 4, display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <TextField
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 200 }}
            />
            <TextField
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 200 }}
            />
            {(startDate || endDate) && (
              <Button
                variant="outlined"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
              >
                Clear Filters
              </Button>
            )}
          </Box>

          {/* Rating Graph */}
          {ratingChartData.length > 0 && (
            <Box sx={{ mb: 4, mt: 2 }}>
              <Typography
                variant="h6"
                sx={{
                  mb: 2,
                  fontWeight: 600,
                  textAlign: 'center',
                  color: themeColors.text.primary,
                }}
              >
                Rating Over Time
              </Typography>
              <Box sx={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <LineChart data={ratingChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={textSecondary} opacity={0.3} />
                    <XAxis 
                      dataKey="timestamp" 
                      stroke={textSecondary}
                      style={{ fontSize: '0.75rem' }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      stroke={textSecondary}
                      label={{ 
                        value: 'Rating', 
                        angle: -90, 
                        position: 'insideLeft',
                        style: { fill: textSecondary }
                      }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: cardBackground,
                        border: `1px solid ${cardBorder}`,
                        borderRadius: '8px',
                        color: textPrimary,
                      }}
                      formatter={(value) => [`${value}`, 'Rating']}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="rating" 
                      stroke={buttonPrimary}
                      strokeWidth={2}
                      dot={{ fill: buttonPrimary, r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Rating"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </Box>
          )}

          {/* Average Accuracy Graph */}
          {accuracyChartData.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography
                variant="h6"
                sx={{
                  mb: 2,
                  fontWeight: 600,
                  textAlign: 'center',
                  color: themeColors.text.primary,
                }}
              >
                Average Accuracy Over Time
              </Typography>
              <Box sx={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <LineChart data={accuracyChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={textSecondary} opacity={0.3} />
                    <XAxis 
                      dataKey="timestamp" 
                      stroke={textSecondary}
                      style={{ fontSize: '0.75rem' }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      domain={[0, 100]}
                      stroke={textSecondary}
                      label={{ 
                        value: 'Accuracy (%)', 
                        angle: -90, 
                        position: 'insideLeft',
                        style: { fill: textSecondary }
                      }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: cardBackground,
                        border: `1px solid ${cardBorder}`,
                        borderRadius: '8px',
                        color: textPrimary,
                      }}
                      formatter={(value) => [`${value}%`, 'Accuracy']}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="accuracy" 
                      stroke={buttonPrimary}
                      strokeWidth={2}
                      dot={{ fill: buttonPrimary, r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Accuracy (%)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </Box>
          )}

          {/* AfterUts Mu Graph */}
          {muChartData.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography
                variant="h6"
                sx={{
                  mb: 2,
                  fontWeight: 600,
                  textAlign: 'center',
                  color: themeColors.text.primary,
                }}
              >
                TrueSkill Mu (μ) Over Time
              </Typography>
              <Box sx={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <LineChart data={muChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={textSecondary} opacity={0.3} />
                    <XAxis 
                      dataKey="timestamp" 
                      stroke={textSecondary}
                      style={{ fontSize: '0.75rem' }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      stroke={textSecondary}
                      label={{ 
                        value: 'Mu (μ)', 
                        angle: -90, 
                        position: 'insideLeft',
                        style: { fill: textSecondary }
                      }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: cardBackground,
                        border: `1px solid ${cardBorder}`,
                        borderRadius: '8px',
                        color: textPrimary,
                      }}
                      formatter={(value) => [`${value}`, 'Mu (μ)']}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="mu" 
                      stroke={buttonPrimary}
                      strokeWidth={2}
                      dot={{ fill: buttonPrimary, r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Mu (μ)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </Box>
          )}

          {ratingChartData.length === 0 && accuracyChartData.length === 0 && muChartData.length === 0 && (
            <Typography
              variant="body2"
              sx={{
                mb: 4,
                textAlign: 'center',
                color: themeColors.text.secondary,
                fontStyle: 'italic',
              }}
            >
              No data available yet. Start taking quizzes to see your progress!
            </Typography>
          )}

          {/* Session Stats */}
          <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">User Rating</Typography>
                <Typography variant="h6" fontWeight={600}>
                  {session.userRating?.toFixed(2) || '0.00'}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">Max Score</Typography>
                <Typography variant="h6" fontWeight={600}>
                  {session.maxScore || 0}
                </Typography>
              </Box>
              {session.analytics && (
                <>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Total Attempted</Typography>
                    <Typography variant="h6" fontWeight={600}>
                      {session.analytics.totalQuestionsAttempted || 0}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Total Correct</Typography>
                    <Typography variant="h6" fontWeight={600}>
                      {session.analytics.totalQuestionsCorrect || 0}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Strength Status</Typography>
                    <Typography variant="h6" fontWeight={600}>
                      {session.analytics.strengthStatus !== undefined ? `${session.analytics.strengthStatus}/5` : 'N/A'}
                    </Typography>
                  </Box>
                </>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default UserChapterSessionView;

