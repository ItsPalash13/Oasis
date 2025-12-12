import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Button,
  CircularProgress,
  useTheme,
  Backdrop,
  Tabs,
  Tab,
} from '@mui/material';
import { useStartGameV3Mutation } from '../../../features/api/chapterAPI';
import { setquizSession } from '../../../features/auth/quizSessionSlice';
import { colors } from '../../../theme/colors';
import Analytics from './Analytics';
import Leaderboard from './Leaderboard';

const ChapterDialog = ({ open, onClose, chapter }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const theme = useTheme();
  const [startGameV3, { isLoading: isStarting }] = useStartGameV3Mutation();
  const [tabValue, setTabValue] = useState(0);

  // Get actual color values from theme - using neutral colors
  const textPrimary = theme.palette.mode === 'dark' ? colors.ui.dark.textPrimary : colors.ui.light.textPrimary;
  const textSecondary = theme.palette.mode === 'dark' ? colors.ui.dark.textSecondary : colors.ui.light.textSecondary;
  // Use vibrant "go" green for Start Quiz button
  const startButtonBg = theme.palette.mode === 'dark' 
    ? '#22c55e'  // Bright vibrant green for dark mode (emerald-500)
    : '#16a34a'; // Bright vibrant green for light mode (emerald-600)

  const handleStartQuiz = async () => {
    if (!chapter?._id) {
      console.error('Chapter ID is missing');
      return;
    }

    try {
      console.log('Starting Quiz v3 via /level_v3/start');
      const result = await startGameV3(chapter._id).unwrap();
      console.log('Game started result:', result);

      // Normalize session payload to always include id and chapterId
      const sessionPayload = result?.data?.session
        ? result.data.session
        : {
            id: result?.data?.userChapterTicket ?? result?.userChapterTicket,
            chapterId: result?.data?.chapterId ?? result?.chapterId ?? chapter._id,
          };

      dispatch(setquizSession(sessionPayload));
      console.log('Navigating to /quiz_v3/', sessionPayload.id);
      onClose(); // Close dialog first
      navigate(`/quiz_v3/${sessionPayload.id}`);
    } catch (err) {
      console.error('Quiz v3 start failed:', err);
      // Error handling - could show an error message here
    }
  };

  if (!chapter) {
    return null;
  }

  // Glassmorphism styling
  const glassBackground = theme.palette.mode === 'dark'
    ? colors.gradients.cardDarkGlass
    : colors.gradients.cardLightGlass;

  const glassBorder = theme.palette.mode === 'dark'
    ? `1px solid ${colors.border.dark.primary}80` // 80 = ~50% opacity in hex
    : `1px solid ${colors.border.light.primary}80`;

  const glassShadow = theme.palette.mode === 'dark'
    ? `0 8px 32px ${colors.shadow.dark.medium}`
    : `0 8px 32px ${colors.shadow.light.medium}`;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullWidth={false}
      BackdropComponent={Backdrop}
      BackdropProps={{
        onClick: (e) => {
          e.stopPropagation();
          onClose();
        },
        sx: {
          backgroundColor: theme.palette.mode === 'dark' 
            ? 'rgba(0, 0, 0, 0.7)' 
            : 'rgba(0, 0, 0, 0.5)',
          // No backdrop blur - background stays sharp
        }
      }}
      PaperProps={{
        onClick: (e) => e.stopPropagation(), // Prevent clicks on paper from closing
        sx: {
          background: glassBackground,
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)', // Safari support
          border: glassBorder,
          boxShadow: glassShadow,
          borderRadius: '16px',
          width: '700px', // Fixed width (square-like: width slightly more than height)
          maxWidth: '90vw',
          height: '600px', // Fixed height 
          maxHeight: '90vh',
          overflow: 'hidden',
          m: 2,
          display: 'flex',
          flexDirection: 'column',
        }
      }}
    >
      <DialogContent
        sx={{
          p: 0,
          position: 'relative',
          overflowY: 'hidden',
          overflowX: 'hidden',
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header with Title and Start Button */}
        <Box sx={{ p: 3, pb: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="h4"
              sx={{
                mb: 1,
                fontWeight: 700,
                color: textPrimary,
              }}
            >
              {chapter.name}
            </Typography>

          </Box>
          <Button
            onClick={handleStartQuiz}
            disabled={isStarting}
            variant="contained"
            size="medium"
            sx={{
              fontSize: '1rem',
              padding: '10px 24px',
              borderRadius: '12px',
              fontWeight: 700,
              backgroundColor: startButtonBg,
              color: colors.ui.light.textInverse, // White text on green button
              '&:hover': {
                backgroundColor: startButtonBg,
                filter: 'brightness(0.9)',
                transform: 'translateY(-2px)',
                boxShadow: 4,
              },
              '&:disabled': {
                backgroundColor: theme.palette.mode === 'dark'
                  ? colors.ui.dark.buttonSecondary
                  : colors.ui.light.buttonSecondary,
                color: theme.palette.mode === 'dark'
                  ? colors.text.dark.disabled
                  : colors.text.light.disabled,
              },
              transition: 'all 0.3s ease',
              ml: 2,
            }}
          >
            {isStarting ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={16} sx={{ color: 'inherit' }} />
                <span>Starting...</span>
              </Box>
            ) : (
              'Start Quiz'
            )}
          </Button>
        </Box>

        {/* Tabs */}
        <Box sx={{ 
          borderBottom: 1, 
          borderColor: theme.palette.mode === 'dark' 
            ? colors.border.dark.secondary 
            : colors.border.light.secondary, 
          px: 3 
        }}>
          <Tabs
            value={tabValue}
            onChange={(e, newValue) => setTabValue(newValue)}
            sx={{
              '& .MuiTab-root': {
                color: textSecondary,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.95rem',
              },
              '& .Mui-selected': {
                color: textPrimary,
              },
              '& .MuiTabs-indicator': {
                backgroundColor: textPrimary, // Use primary text color for neutral indicator
              },
            }}
          >
            <Tab label="Analytics" />
            <Tab label="Leaderboard" />
          </Tabs>
        </Box>

        {/* Tab Content */}
        <Box sx={{ 
          flex: 1, 
          overflowY: 'auto', 
          p: 3, 
          minHeight: 0,
          '&::-webkit-scrollbar': {
            width: colors.scrollbar.light.width,
          },
          '&::-webkit-scrollbar-track': {
            background: theme.palette.mode === 'dark' 
              ? colors.scrollbar.dark.track 
              : colors.scrollbar.light.track,
          },
          '&::-webkit-scrollbar-thumb': {
            background: theme.palette.mode === 'dark'
              ? colors.scrollbar.dark.thumb
              : colors.scrollbar.light.thumb,
            borderRadius: '4px',
            '&:hover': {
              background: theme.palette.mode === 'dark'
                ? colors.scrollbar.dark.thumbHover
                : colors.scrollbar.light.thumbHover,
            },
          },
        }}>
          {tabValue === 0 && <Analytics chapter={chapter} />}
          {tabValue === 1 && <Leaderboard chapter={chapter} />}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default ChapterDialog;

