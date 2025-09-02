import React, { useEffect, useMemo, useState } from 'react';
import { 
  Container, 
  Typography, 
  Box,
  Backdrop,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  Alert,
  Snackbar,
  Chip,
  Tooltip,

} from '@mui/material';
import { ProgressBar } from 'react-progressbar-fancy';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowBack as ArrowBackIcon, Tour as TourIcon, Timeline as TimelineIcon } from '@mui/icons-material';
import Joyride, { STATUS, Step } from 'react-joyride';
// @ts-ignore
import { useGetChapterInfoQuery, useStartLevelMutation } from '../../features/api/levelAPI';
// @ts-ignore
import { setLevelSession } from '../../features/auth/levelSessionSlice';
// @ts-ignore
import { selectUserHealth, setSession } from '../../features/auth/authSlice';
// @ts-ignore
import { authClient } from '../../lib/auth-client';
// @ts-ignore
import { levelsStyles } from '../../theme/levelsTheme';
// @ts-ignore
import LevelCard from '../../components/LevelCard/LevelCard';
// @ts-ignore
//const LevelCard = LevelCard;
// @ts-ignore
import LevelDetailsDialog from '../../components/LevelDetailsDialog';
// @ts-ignore
import Topics from '../Performance/Topics';
// @ts-ignore
import { colors, themeColors } from '../../theme/colors';
// @ts-ignore
import SOUND_FILES from '../../assets/sound/soundFiles';

export interface Level {
  _id: string;
  name: string;
  levelNumber: number;
  description: string;
  topics: Array<{ _id: string; topic: string }> | string[]; // Updated to handle both populated and unpopulated topics
  status: boolean;
  type: 'time_rush' | 'precision_path';
  unitId: string; // <-- Add this line
  
  // Mode-specific nested fields from Level model (conditional based on type)
  timeRush?: {
    requiredXp: number;
    totalTime: number;
    totalQuestions: number;
  };
  precisionPath?: {
    requiredXp: number;
    totalQuestions: number;
  };
  
  // Runtime mode for display (derived from type)
  mode: 'time_rush' | 'precision_path';
  
  // Additional fields from API response
  isStarted: boolean;
  progress?: number; // Progress field from UserChapterLevel
  percentile?: number; // Percentile ranking from backend calculation
  participantCount?: number; // Number of users who participated in this level
  
  userProgress?: {
    timeRush?: {
      minTime: number | null;
      attempts: number;
      requiredXp: number;
      timeLimit?: number;
      totalQuestions: number;
    };
    precisionPath?: {
      minTime: number | null;
      attempts: number;
      requiredXp: number;
      totalQuestions: number;
    };
    _id: string;
    userId: string;
    chapterId: string;
    levelId: string;
    levelNumber: number;
    status: string;
    lastAttemptedAt: string;
    attemptType: 'time_rush' | 'precision_path';
    completedAt?: string;
    __v?: number;
  } | null;
}

export interface Chapter {
  _id: string;
  name: string;
  description: string;
  gameName: string;
  topics: Array<{ _id: string; topic: string; accuracy?: number | null }> | string[]; // Updated to handle both populated and unpopulated topics
  status: boolean;
  thumbnailUrl?: string;
}

const Levels: React.FC = () => {
  const [levels, setLevels] = useState<Level[]>([]);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null);
  const [showTopicsPerformance, setShowTopicsPerformance] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [selectedLevelForDetails, setSelectedLevelForDetails] = useState<Level | null>(null);
  const [selectedSectionForTopics, setSelectedSectionForTopics] = useState<any>(null);
  const { chapterId } = useParams<{ chapterId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { data: chapterData, isLoading, refetch } = useGetChapterInfoQuery(chapterId || '', {
    skip: !chapterId
  });
  const [startLevel] = useStartLevelMutation();
  const [units, setUnits] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [runTour, setRunTour] = useState(false);
  const [tourSteps] = useState<Step[]>([
    {
      target: '.precision-path-level',
      content: (
        <Box sx={{ textAlign: 'left', maxWidth: '300px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Chip
              label="⚡ Precision Path"
              size="small"
              sx={{
                backgroundColor: 'rgba(138, 43, 226, 0.9)',
                color: 'white',
                fontWeight: 600,
                fontSize: '0.75rem',
                textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)'
              }}
            />
          </Box>
          <Typography variant="body2" sx={{ mb: 1, lineHeight: 1.5 }}>
            You get a fixed number of questions. A stopwatch runs — your goal is to <strong>reach the XP target in the least time possible</strong>.
          </Typography>
          <Typography variant="body2" sx={{ mb: 1, lineHeight: 1.5 }}>
            Accuracy matters. Speed rewards you more.
          </Typography>
          <Typography variant="body2" sx={{ fontStyle: 'italic'}}>
            🧠 Think before you tap — every second counts.
          </Typography>
        </Box>
      ),
      placement: 'top',
      disableBeacon: true,
    },
    {
      target: '.time-rush-level',
      content: (
        <Box sx={{ textAlign: 'left', maxWidth: '300px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Chip
              label="⏱️ Time Rush"
              size="small"
              sx={{
                backgroundColor: 'rgba(255, 165, 0, 0.9)',
                color: 'white',
                fontWeight: 600,
                fontSize: '0.75rem',
                textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)'
              }}
            />
          </Box>
          <Typography variant="body2" sx={{ mb: 1, lineHeight: 1.5 }}>
            You get a fixed number of questions with a time limit. Try to solve all questions to hit the XP target before the timer ends.
          </Typography>
          <Typography variant="body2" sx={{ mb: 1, lineHeight: 1.5 }}>
            Fast answers = more XP. Streaks give bonus XP too.
          </Typography>
          <Typography variant="body2" sx={{ fontStyle: 'italic'}}>
            ⚡ Push your limits — beat the clock, beat your best.
          </Typography>
        </Box>
      ),
      placement: 'top',
    },
  ]);

  const handleTourCallback = (data: any) => {
    const { status } = data;
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setRunTour(false);
    }
  };

  const startTour = () => {
    setRunTour(true);
  };

  // Find first level of each type for tour
  const firstPrecisionPathLevel = levels.find(level => level.type === 'precision_path');
  const firstTimeRushLevel = levels.find(level => level.type === 'time_rush');
  
  // Get user health from Redux store
  const userHealth = useSelector(selectUserHealth) as number;
  
  // Get session data from auth client
  const { data: session, refetch: refetchSession } = authClient.useSession();

  // Helper function to serialize dates in an object
  const serializeDates = (obj: any) => {
    if (!obj) return obj;
    
    const result = { ...obj };
    for (const key in result) {
      if (result[key] instanceof Date) {
        result[key] = result[key].toISOString();
      } else if (typeof result[key] === 'object' && result[key] !== null) {
        result[key] = serializeDates(result[key]);
      }
    }
    return result;
  };

  useEffect(() => {
    console.log('Session data from auth client in Levels:', session); // Debug log
    if (session?.session && session?.user) {
      // Serialize dates before dispatching to Redux
      const serializedSession = serializeDates(session.session);
      const serializedUser = serializeDates(session.user);

      console.log('Dispatching to Redux from Levels:', { serializedSession, serializedUser }); // Debug log
      dispatch(setSession({
        session: serializedSession,
        user: serializedUser
      }));
    }
  }, [session, dispatch]);

  // Force session refetch on component mount
  useEffect(() => {
    console.log('Levels component mounted, refetching session...');
    refetchSession();
  }, [refetchSession]);

  useEffect(() => {
    if (chapterId) {
      refetch();
    }
  }, [chapterId, refetch]);

  useEffect(() => {
    if (chapterData?.data) {
      // API returns a single mixed array sorted by levelNumber
      const allLevels = chapterData.data as Level[];
      setLevels(allLevels);
    }
    if (chapterData?.meta?.chapter) {
      setChapter(chapterData.meta.chapter);
    }
    if (chapterData?.meta?.units) {
      setUnits(chapterData.meta.units);
    }
    if (chapterData?.meta?.sections) {
      setSections(chapterData.meta.sections);
    }
  }, [chapterData]);

  const handleLevelClick = async (levelId: string) => {
    try {
      // Clear any previous health errors
      setHealthError(null);
      
      // Check if user has sufficient health
      if (userHealth <= 0) {
        setHealthError('Insufficient health to start level. You need health greater than 0 to play.');
        return;
      }
      
      // Find the level to validate mode compatibility
      const level = levels.find(l => l._id === levelId);
      
      if (!level) {
        console.error('Level not found');
        return;
      }
      
      // Use the level's actual type for the request
      const attemptType = level.type;
      
      setIsStarting(true);
      const result = await startLevel({ levelId, attemptType }).unwrap();
      dispatch(setLevelSession(result.data.session));
      
      // Store selected level ID and start countdown
      setSelectedLevelId(levelId);
      setCountdown(3);
      setShowCountdown(true);
      setIsStarting(false);
    } catch (error: any) {
      console.error('Failed to start level:', error);
      if (error?.data?.error) {
        console.error('Server error:', error.data.error);
        
        // Handle health-related errors
        if (error.data.error.includes('Insufficient health')) {
          setHealthError(error.data.error);
        }
      }
      setIsStarting(false);
    }
  };

  // Countdown effect
  useEffect(() => {
    if (showCountdown && countdown > 0) {
      
      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else if (showCountdown && countdown === 0) {
      // Play countdown end sound
      const audio = new Audio(SOUND_FILES.COUNTDOWN_END);
      audio.play();
      
      // Navigate to quiz when countdown reaches 0
      if (selectedLevelId) {
        navigate(`/quiz/${selectedLevelId}`);
      }
    }
  }, [showCountdown, countdown, selectedLevelId, navigate]);

  const handleCancelCountdown = () => {
    setShowCountdown(false);
    setCountdown(3);
    setSelectedLevelId(null);
  };



  // Group levels by unitId
  const levelsByUnit: { [unitId: string]: Level[] } = {};
  levels.forEach(level => {
    if (!levelsByUnit[level.unitId]) levelsByUnit[level.unitId] = [];
    levelsByUnit[level.unitId].push(level);
  });


  // Build chapter topics id->name map from levels (topics are populated on levels API)
  const chapterTopicIdToName = useMemo(() => {
    const map = new Map<string, string>();
    levels.forEach((lvl) => {
      const t = lvl.topics as any[];
      if (Array.isArray(t)) {
        t.forEach((topic: any) => {
          if (topic && typeof topic === 'object' && topic._id && topic.topic) {
            map.set(topic._id.toString(), topic.topic);
          }
        });
      }
    });
    return Object.fromEntries(map);
  }, [levels]);



  if (isLoading) {
    return (
      <Box sx={levelsStyles.container}>
        <Backdrop sx={levelsStyles.backdrop} open={true}>
          <Box sx={levelsStyles.loadingContainer}>
            <CircularProgress color="primary" size={60} />
            <Typography variant="h6">
              Loading Levels...
            </Typography>
          </Box>
        </Backdrop>
      </Box>
    );
  }

  return (
    <Box sx={levelsStyles.container}>
      {/* Joyride Tour */}
      <Joyride
        steps={tourSteps}
        run={runTour}
        continuous={true}
        showProgress={true}
        showSkipButton={true}
        callback={handleTourCallback}
        styles={{
          options: {
            primaryColor: '#1976d2',
            zIndex: 10000,
            arrowColor: '#ffffff',
            backgroundColor: '#ffffff',
            textColor: '#333333',
            overlayColor: 'rgba(0, 0, 0, 0.5)',
          },
          tooltip: {
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
            border: '1px solid #e0e0e0',
            padding: '20px',
            fontSize: '14px',
            fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
          },
          tooltipTitle: {
            fontSize: '18px',
            fontWeight: 600,
            color: '#1976d2',
            marginBottom: '8px',
          },
          tooltipContent: {
            fontSize: '14px',
            lineHeight: 1.6,
            color: '#333333',
          },
          buttonNext: {
            backgroundColor: '#666666',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            padding: '8px 16px',
            border: 'none',
            color: '#ffffff',
          },
          buttonBack: {
            color: '#666666',
            fontSize: '14px',
            fontWeight: 500,
            marginRight: '10px',
          },
          buttonSkip: {
            color: '#999999',
            fontSize: '14px',
            fontWeight: 500,
          },
          buttonClose: {
            display: 'none',
          },
        }}
      />

      {/* Tour Start Button */}
      <IconButton
        onClick={startTour}
        sx={{
          position: 'absolute',
          top: 100,
          right: 20,
          zIndex: 1000,
          backgroundColor: themeColors.background.main,
          color: 'white',
          '&:hover': {
            backgroundColor: themeColors.background.main,
          },
        }}
      >
        <TourIcon sx={{color: themeColors.text.primary}}/>
      </IconButton>

      {/* Health Error Snackbar */}
      <Snackbar
        open={!!healthError}
        autoHideDuration={2000}
        onClose={() => setHealthError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setHealthError(null)} severity="error" sx={{ width: '100%' }}>
          {healthError}
        </Alert>
      </Snackbar>
      
      {/* Countdown Fullscreen Overlay */}
      {showCountdown && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            color: 'white'
          }}
        >
          {/* Back Button */}
          <IconButton
            onClick={handleCancelCountdown}
            sx={{
              position: 'absolute',
              top: 20,
              left: 20,
              color: 'white',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
              }
            }}
          >
            <ArrowBackIcon />
          </IconButton>

          {/* Countdown Display */}
          <Box sx={{ textAlign: 'center' }}>
            <Typography 
              variant="h1" 
              sx={{ 
                fontSize: '8rem', 
                fontWeight: 'bold',
                color: 'white',
                textShadow: '0 0 20px rgba(255, 255, 255, 0.5)',
                animation: countdown > 0 ? 'pulse 1s ease-in-out' : 'none',
                '@keyframes pulse': {
                  '0%': { transform: 'scale(1)' },
                  '50%': { transform: 'scale(1.1)' },
                  '100%': { transform: 'scale(1)' }
                }
              }}
            >
              {countdown}
            </Typography>
            <Typography 
              variant="h4" 
              sx={{ 
                mt: 2,
                color: 'white',
                opacity: 0.8
              }}
            >
              {countdown > 0 ? 'Get Ready!' : 'Starting...'}
            </Typography>
          </Box>
        </Box>
      )}

      <Backdrop sx={levelsStyles.backdrop} open={isStarting}>
        <Box sx={levelsStyles.loadingContainer}>
          <CircularProgress color="primary" size={60} />
          <Typography variant="h6">
            Loading Session...
          </Typography>
        </Box>
      </Backdrop>

      <Container maxWidth="lg" sx={levelsStyles.pageContainer}>
        {chapter && (
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
                  {chapter.name}
                </Typography>
              </Box>
            </Box>
            {/* Chapter Topics - removed accuracy display (moved to sections) */}
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
              {chapter.topics && chapter.topics.length > 0 ? (
                chapter.topics.map((topic, index) => {
                  // Handle both old string format and new object format
                  const topicName = typeof topic === 'string' ? topic : topic.topic;
                  
                  return (
                    <Box
                      key={index}
                      sx={{
                        px: 1,
                        py: 0.25,
                        backgroundColor: (theme: any) => theme.palette.mode === 'dark' ? "#0C0C0C" : "#FAFAFA",
                        color: (theme: any) => theme.palette.mode === 'dark' ? '#F8F9FF' : '#111111',
                        borderRadius: 0.75,
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          transform: 'translateY(-1px)',
                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
                        }
                      }}
                    >
                      {topicName}
                    </Box>
                  );
                })
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No topics available
                </Typography>
              )}
            </Box>
            {/* Chapter Progress Bar 
            <Box sx={{ mb: 3 }}>
              {levels.length > 0 && (
                (() => {
                  // Calculate chapter progress using individual level progress
                  const totalLevels = levels.length;
                  const totalProgress = levels.reduce((sum, level) => sum + (level.progress || 0), 0);
                  const chapterProgress = totalLevels > 0 ? Math.round(totalProgress / totalLevels) : 0;
                  
                  return (
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      
                      <ProgressBar score={chapterProgress} primaryColor='#A020F0' secondaryColor='#FF00FF' hideText={true}/>
                      <Typography variant="body2" sx={{ fontSize: '14px'}}>
                        {chapterProgress}%
                      </Typography>
                      </Box>
                    </Box>
                  );
                })()
              )}
            </Box>
            */}
          </Box>
        )}
        {/* Sections Display */}
        {sections.length > 0 && (
          <Box sx={{ mb: 4 }}>
            {sections.map((section) => (
              <Box key={section._id} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Section {section.sectionNumber}: {section.name}
                  </Typography>
                  <Tooltip title="Section Topics Accuracy">
                    <IconButton
                      onClick={() => {
                        setSelectedSectionForTopics(section);
                        setShowTopicsPerformance(true);
                      }}
                      size="small"
                      sx={{
                        color: theme => theme.palette.mode === 'dark'
                          ? colors.ui.dark.buttonSecondary
                          : colors.ui.light.buttonSecondary,
                        ml: 0
                      }}
                    >
                      <TimelineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>

                {/* Section Topics with Accuracy */}
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {(section.topics || []).map((topic: any, idx: number) => {
                    // Handle both old string format and new object format with accuracy
                    const topicName = typeof topic === 'string' ? topic : topic.topic;
                    const accuracy = typeof topic === 'object' && topic.accuracy !== undefined ? topic.accuracy : null;
                    
                    // Determine background color based on accuracy
                    const getBackgroundColor = (acc: number | null) => {
                      if (acc === null) {
                        return (theme: any) => theme.palette.mode === 'dark' ? "#0C0C0C" : "#FAFAFA";
                      }
                      if (acc >= 0.75) return colors.success.main;
                      if (acc >= 0.5) return colors.warning.main;
                      return colors.error.main;
                    };
                    
                    // Determine text color based on accuracy
                    const getTextColor = (acc: number | null) => {
                      if (acc === null) {
                        return (theme: any) => theme.palette.mode === 'dark' ? '#F8F9FF' : '#111111';
                      }
                      return 'white'; // White text for colored backgrounds
                    };
                    
                    const TopicBox = (
                      <Box
                        sx={{
                          px: 1,
                          py: 0.25,
                          backgroundColor: getBackgroundColor(accuracy),
                          color: getTextColor(accuracy),
                          borderRadius: 0.75,
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            transform: 'translateY(-1px)',
                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
                          }
                        }}
                      >
                        {topicName}
                      </Box>
                    );
                    
                    // Only show tooltip if accuracy data exists
                    if (accuracy !== null) {
                      const accuracyPercentage = Math.round(accuracy * 100);
                      return (
                        <Tooltip 
                          key={idx}
                          title={`Accuracy: ${accuracyPercentage}%`}
                          arrow
                          placement="top"
                        >
                          {TopicBox}
                        </Tooltip>
                      );
                    }
                    
                    return (
                      <Box key={idx}>
                        {TopicBox}
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            ))}
          </Box>
        )}

        {/* All Units Display */}
        {units.length > 0 && (
          <Box sx={{ mb: 4 }}>
            {units.map((unit) => (
              <Box key={unit._id} sx={{ mb: 4 }}>
                {/* Unit Info */}
                <Box
                sx={{
                    position: 'relative',
                    ...(unit.locked && {
                      opacity: 0.5,
                      filter: 'grayscale(0.2)',
                      pointerEvents: 'none',
                    }),
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Unit {unit.unitNumber}: {unit.name}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ mb: 1 }}>
                    {unit.description}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
                    {unit.topics.map((topic: any, idx: number) => (
                    <Box
                      key={idx}
                      sx={{
                        px: 1,
                        py: 0.25,
                        backgroundColor: theme => theme.palette.mode === 'dark' 
                          ? colors.ui.dark.topicSecondary 
                          : colors.ui.light.topicSecondary,
                        color: 'white',
                        borderRadius: 0.75,
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          transform: 'translateY(-1px)',
                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
                        }
                      }}
                    >
                      {typeof topic === 'string' ? topic : topic.topic}
                    </Box>
                  ))}
                </Box>
                </Box>
                <Box sx={{
                  ...levelsStyles.gridContainer,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 2,
                  justifyContent: 'flex-start',
                  alignItems: 'stretch',
                }}>
                  {(levelsByUnit[unit._id] || []).map(level => (
                    <Box 
                      key={`${level._id}_${level.type}`} 
                      className={
                        level._id === firstPrecisionPathLevel?._id ? 'precision-path-level' :
                        level._id === firstTimeRushLevel?._id ? 'time-rush-level' : ''
                      }
                    >
                      <LevelCard
                        level={level}
                        chapter={chapter}
                        onLevelClick={handleLevelClick}
                        onLevelDetails={level.status ? setSelectedLevelForDetails : () => {}}
                      />
                    </Box>
                  ))}
                  {(levelsByUnit[unit._id] || []).length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      No levels available for this unit.
                    </Typography>
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Container>



      {/* Topics Accuracy Dialog */}
      <Dialog
        open={showTopicsPerformance}
        onClose={() => setShowTopicsPerformance(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            height: '70vh',
            maxHeight: '70vh',
            backgroundColor: themeColors.background.paper,
            border: themeColors.card.border,
            boxShadow: themeColors.card.shadow,
          }
        }}
      >
        <DialogTitle sx={{ 
          backgroundColor: themeColors.background.paper,
          color: themeColors.text.primary,
          borderBottom: themeColors.card.border,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" sx={{ color: themeColors.text.primary }}>
              {selectedSectionForTopics ? `Section ${selectedSectionForTopics.sectionNumber}: ${selectedSectionForTopics.name} - Topics Accuracy` : 'Topics Accuracy'}
            </Typography>
            <IconButton 
              onClick={() => {
                setShowTopicsPerformance(false);
                setSelectedSectionForTopics(null);
              }}
              sx={{ color: themeColors.text.secondary }}
            >
              <ArrowBackIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ 
          backgroundColor: themeColors.background.paper,
          color: themeColors.text.primary,
        }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {selectedSectionForTopics 
                ? `Shows your accuracy of topics in Section ${selectedSectionForTopics.sectionNumber}, with recent answers weighed more than older ones.`
                : 'Shows your accuracy of topics, with recent answers weighed more than older ones.'
              }
            </Typography>
          </Box>
          <Topics 
            chapterId={chapterId as any}
            topicIdToName={chapterTopicIdToName as any}
            sectionId={selectedSectionForTopics?._id}
          />
        </DialogContent>
      </Dialog>


      {/* Level Details Dialog */}
      <LevelDetailsDialog
        open={!!selectedLevelForDetails}
        onClose={() => setSelectedLevelForDetails(null)}
        level={selectedLevelForDetails}
        chapter={chapter}
        onLevelClick={handleLevelClick}
      />
    </Box>
  );
};

export default Levels;
