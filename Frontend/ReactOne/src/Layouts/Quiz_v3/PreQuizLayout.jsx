import React, { useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Typography, Button, CircularProgress, Card, CardContent, useTheme } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useStartGameV3Mutation } from '../../features/api/chapterAPI';
import { setquizSession } from '../../features/auth/quizSessionSlice';
import { themeColors, colors } from '../../theme/colors';

const PreQuizLayout = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const theme = useTheme();
  const { chapterId } = useParams();
  const [startGameV3, { isLoading: isStarting }] = useStartGameV3Mutation();
  
  // Get chapter data from navigation state, or fallback to null
  const chapter = location.state?.chapter || null;

  // Get actual color values from theme
  const textSecondary = theme.palette.mode === 'dark' ? colors.ui.dark.textSecondary : colors.ui.light.textSecondary;
  const textPrimary = theme.palette.mode === 'dark' ? colors.ui.dark.textPrimary : colors.ui.light.textPrimary;
  const cardBackground = theme.palette.mode === 'dark' ? colors.ui.dark.cardBackground : colors.ui.light.cardBackground;
  const cardBorder = theme.palette.mode === 'dark' ? colors.ui.dark.cardBorder : colors.ui.light.cardBorder;
  const buttonPrimary = theme.palette.mode === 'dark' ? colors.ui.dark.buttonPrimary : colors.ui.light.buttonPrimary;

  // Get chapter sessions from Redux (already fetched in Dashboard)
  const chapterSessionsFull = useSelector((state) => state?.metadata?.chapterSessionsFull || []);

  // Find the chapter session for this chapter
  const currentChapterSession = useMemo(() => {
    if (!chapterId || !chapterSessionsFull.length) return null;
    const session = chapterSessionsFull.find((session) => 
      session.chapterId && session.chapterId.toString() === chapterId
    );
    console.log('UserChapterSession in PreQuizLayout:', session);
    console.log('All chapter sessions from Redux:', chapterSessionsFull);
    console.log('Looking for chapterId:', chapterId);
    return session;
  }, [chapterId, chapterSessionsFull]);

  // Format data for chart from Redux data
  const chartData = useMemo(() => {
    const userAttemptWindowList = currentChapterSession?.analytics?.userAttemptWindowList;
    
    if (!userAttemptWindowList || userAttemptWindowList.length === 0) {
      return [];
    }

    return userAttemptWindowList
      .filter(entry => entry && entry.timestamp && typeof entry.capturedRating === 'number')
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
  }, [currentChapterSession]);

  const handleStartQuiz = async () => {
    if (!chapterId) {
      console.error('Chapter ID is missing');
      return;
    }

    try {
      console.log('Starting Quiz v3 via /level_v3/start');
      const result = await startGameV3(chapterId).unwrap();
      console.log('Game started result:', result);
      
      // Normalize session payload to always include id and chapterId
      const sessionPayload = result?.data?.session
        ? result.data.session
        : {
            id: result?.data?.userChapterTicket ?? result?.userChapterTicket,
            chapterId: result?.data?.chapterId ?? result?.chapterId ?? chapterId,
          };
      
      dispatch(setquizSession(sessionPayload));
      console.log('Navigating to /quiz_v3/', sessionPayload.id);
      navigate(`/quiz_v3/${sessionPayload.id}`);
    } catch (err) {
      console.error('Quiz v3 start failed:', err);
      // Fallback: if start fails, go to chapter page
      navigate(`/chapter/${chapterId}`);
    }
  };

  const handleGoBack = () => {
    navigate('/dashboard');
  };

  if (!chapter) {
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
          Chapter not found
        </Typography>
        <Button onClick={handleGoBack} variant="outlined">
          Go back to Dashboard
        </Button>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 64px)',
        backgroundColor: themeColors.background.main,
        p: 3,
      }}
    >
      <Card
        sx={{
          maxWidth: 600,
          width: '100%',
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
              mb: 2,
              fontWeight: 700,
              textAlign: 'center',
              color: themeColors.text.primary,
            }}
          >
            {chapter.name}
          </Typography>

          {chapter.description && (
            <Typography
              variant="body1"
              sx={{
                mb: 4,
                textAlign: 'center',
                color: themeColors.text.secondary,
              }}
            >
              {chapter.description}
            </Typography>
          )}

          {/* Rating Graph */}
          {chartData.length > 0 && (
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
                  <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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

          {chartData.length === 0 && (
            <Typography
              variant="body2"
              sx={{
                mb: 4,
                textAlign: 'center',
                color: themeColors.text.secondary,
                fontStyle: 'italic',
              }}
            >
              No rating data available yet. Start taking quizzes to see your progress!
            </Typography>
          )}

          {/* Start Quiz Button at the bottom */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Button
              onClick={handleStartQuiz}
              disabled={isStarting}
              variant="contained"
              size="large"
              sx={{
                fontSize: '1.2rem',
                padding: '14px 48px',
                borderRadius: '12px',
                fontWeight: 700,
                backgroundColor: themeColors.ui.buttonPrimary,
                color: (theme) =>
                  theme.palette.mode === 'dark'
                    ? colors.ui.dark.textInverse
                    : colors.ui.light.textInverse,
                '&:hover': {
                  backgroundColor: themeColors.ui.buttonPrimary,
                  filter: 'brightness(0.9)',
                  transform: 'translateY(-2px)',
                  boxShadow: 4,
                },
                '&:disabled': {
                  backgroundColor: themeColors.ui.buttonSecondary,
                  color: themeColors.text.disabled,
                },
                transition: 'all 0.3s ease',
                minWidth: 200,
              }}
            >
              {isStarting ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={20} sx={{ color: 'inherit' }} />
                  <span>Starting...</span>
                </Box>
              ) : (
                'Start Quiz'
              )}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default PreQuizLayout;

