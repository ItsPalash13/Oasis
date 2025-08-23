import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Button,
  CircularProgress,
  Grid,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Chip,
  Drawer,
  Tooltip
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon, 
  Star as StarIcon, 
  Close as CloseIcon,
  Timer as TimerIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Help as HelpIcon,
  Favorite as HealthIcon
} from '@mui/icons-material';
import { 
  QuizContainer,
  QuestionCard,
  OptionCard,
  QuizHeader,
  StyledButton,
  TimeDisplay,
  XpDisplay,
  CongratsDialog,
  EmojiDisplay,
  FloatingButton,
  quizStyles
} from '../../theme/quizTheme';
import { authClient } from '../../lib/auth-client';
import { setSession } from '../../features/auth/authSlice';
import { setLevelSession } from '../../features/auth/levelSessionSlice';
import { useStartLevelMutation } from '../../features/api/levelAPI';
import SOUND_FILES from '../../assets/sound/soundFiles';
import { StreakNotification } from './Achievements';
import ConfettiFireworks from '../../components/magicui/ConfettiFireworks';
import Results from './Results/Results';
import AIFeedback from '../../components/AI Feedback/AIFeedback';
import AccuracySnackbars from './Topics/Accuracy';
import Solution from './Solution/Solution';
import AssignmentIcon from '@mui/icons-material/Assignment';







const DialogMigrate = ({
  children,
  disableBackdropClick,
  disableEscapeKeyDown,
  onClose,
  ...rest
}) => {
  const handleClose = (event, reason) => {
    if (disableBackdropClick && reason === "backdropClick") {
      return false;
    }

    if (disableEscapeKeyDown && reason === "escapeKeyDown") {
      return false;
    }

    if (typeof onClose === "function") {
      onClose();
    }
  };

  return (
    <Dialog onClose={handleClose} {...rest}>
      {children}
    </Dialog>
  );
};

const Quiz = ({ socket }) => {
  const { levelId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [currentTime, setCurrentTime] = useState(0);
  const [quizMessage, setQuizMessage] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [answerResult, setAnswerResult] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const levelSession = useSelector((state) => state.levelSession.session);
  const [currentXp, setCurrentXp] = useState(0);
  const [requiredXp, setRequiredXp] = useState(0);
  const [showCongrats, setShowCongrats] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);
  const [quizResults, setQuizResults] = useState(null);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
  const [isSocketInitialized, setIsSocketInitialized] = useState(false);
  const [showAnswerDrawer, setShowAnswerDrawer] = useState(false);
  const timerIntervalRef = React.useRef(null);
  const [attemptType, setAttemptType] = useState(null);
  const [questionStartTime, setQuestionStartTime] = useState(null);
  const [showBackConfirmDialog, setShowBackConfirmDialog] = useState(false);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [showStreakNotification, setShowStreakNotification] = useState(false);
  const [streakData, setStreakData] = useState(null);
  const [showHighScoreFireworks, setShowHighScoreFireworks] = useState(false);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [showAIFeedback, setShowAIFeedback] = useState(false);
  const [aiFeedback, setAIFeedback] = useState('');
  const [topicAccVisible, setTopicAccVisible] = useState(false);
  const [topicAccItems, setTopicAccItems] = useState([]);
  const [showSolutions, setShowSolutions] = useState(false);
  
  // Next Level countdown states
  const [showNextLevelCountdown, setShowNextLevelCountdown] = useState(false);
  const [nextLevelCountdown, setNextLevelCountdown] = useState(3);
  const [nextLevelId, setNextLevelId] = useState(null);
  const [isTryAgain, setIsTryAgain] = useState(false);
  
  // Flag to prevent duplicate question loading during level transition
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Get user health and totalCoins from Redux store
  const userHealth = useSelector((state) => state?.auth?.user?.health || 0);
  const userTotalCoins = useSelector((state) => state?.auth?.user?.totalCoins || 0);
  
  // Get session data from auth client
  const { data: session, refetch: refetchSession } = authClient.useSession();
  
  // Level API mutation
  const [startLevel] = useStartLevelMutation();

  const initializedRef = React.useRef(false);
  const socketInitializedRef = React.useRef(false);

  // Add state for earned badges
  const [earnedBadges, setEarnedBadges] = useState([]);

  // Helper function to serialize dates in an object
  const serializeDates = (obj) => {
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

  // Update session data on load
  useEffect(() => {
    console.log('Session data from auth client in Quiz:', session); // Debug log
    if (session?.session && session?.user) {
      // Serialize dates before dispatching to Redux
      const serializedSession = serializeDates(session.session);
      const serializedUser = serializeDates(session.user);

      console.log('Dispatching to Redux from Quiz:', { serializedSession, serializedUser }); // Debug log
      dispatch(setSession({
        session: serializedSession,
        user: serializedUser
      }));
    }
  }, [session, dispatch]);

  // Force session refetch on component mount
  useEffect(() => {
    console.log('Quiz component mounted, refetching session...');
    refetchSession();
    
    // Reset countdown state when component mounts
    setShowNextLevelCountdown(false);
    setNextLevelCountdown(3);
    setNextLevelId(null);
    setIsTryAgain(false);
    
    // Reset transition flag when component mounts
    setIsTransitioning(false);
    
  }, [refetchSession]);

  const formatTime = (seconds, ongame = false) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    const hundredths = Math.floor((seconds % 1) * 100);
    if (ongame) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}.${hundredths.toString().padStart(2, '0')}`;
  };

  const handleEndQuiz = () => {
    setOpenDialog(true);
  };

  const confirmEndQuiz = () => {
    socket.emit('sendQuizEnd', { userLevelSessionId: levelSession?._id });
    setOpenDialog(false);
  };

  const requestQuestion = () => {
    setIsLoading(true);
    socket.emit('question', { userLevelSessionId: levelSession?._id, userLevelId: levelId });
  };

  const handleAnswerSubmit = () => {
    if (selectedAnswer === '') {
      setQuizMessage('Please select an answer');
      return;
    }
    
    // Set answer submitted state
    setAnswerSubmitted(true);
    
    // Calculate time spent on this question
    const timeSpent = questionStartTime ? Date.now() - questionStartTime : 0;
    
    socket.emit('answer', {
      userLevelSessionId: levelSession?._id,
      answer: parseInt(selectedAnswer),
      currentTime: currentTime,
      timeSpent: timeSpent
    });
    console.log("currentTime", currentTime);
    console.log("timeSpent on question (ms):", timeSpent);
  };

  const handleNextQuestion = () => {
    // Play next question sound
    const audio = new Audio(SOUND_FILES.NEXT_QUESTION);
    audio.play();
    
    setShowAnswerDrawer(false);
    // Reset answerResult after drawer closes with a small delay
    setTimeout(() => {
      setAnswerResult(null);
    }, 300);
    requestQuestion();
  };

  const getOptionClass = (index) => {
    if (!answerResult) return selectedAnswer === index.toString() ? 'selected' : '';
    
    if (index === answerResult.correctAnswer) {
      return 'correct-answer';
    }
    
    if (index.toString() === selectedAnswer) {
      return answerResult.isCorrect ? 'correct' : 'wrong';
    }
    
    return '';
  };

  const handleBack = () => {
    // Stop the timer and show confirmation dialog
    setIsTimerPaused(true);
    setShowBackConfirmDialog(true);
  };

  const confirmBack = () => {
    // Delete the session and navigate back
    socket.emit('sendDeleteSession', { userLevelSessionId: levelSession?._id });
    setShowBackConfirmDialog(false);
  };

  const cancelBack = () => {
    // Resume timer and close dialog
    setIsTimerPaused(false);
    setShowBackConfirmDialog(false);
  };

  const getLevelSession = () => {
    if (!levelSession?._id || quizFinished) {
      console.log("No level session ID available or quiz finished");
      return;
    }
    if (initializedRef.current) {
      console.log("Already initialized, skipping getLevelSession");
      return;
    }
    console.log("Getting level session for ID:", levelSession._id);
    socket.emit('getLevelSession', { userLevelSessionId: levelSession._id });
    initializedRef.current = true;
  };

  useEffect(() => {
    if (!levelSession?._id || quizFinished) {
      return;
    }

    if (!socket.connected && !quizFinished) {
      console.log("Connecting socket for session:", levelSession._id);
      socket.connect();
    }

    return () => {
      if (!showResults && !quizFinished && !showNextLevelCountdown) {
        socket.disconnect();
      }
    };
  }, [levelSession?._id, quizFinished, socket, showResults, showNextLevelCountdown]);

  useEffect(() => {
    if (quizFinished || isLoading || isTimerPaused || showNextLevelCountdown) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      return;
    }

    // Store the start time for more accurate timing
    const startTime = Date.now();
    let lastUpdateTime = startTime;
    timerIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - lastUpdateTime) / 1000; // Convert to seconds
      lastUpdateTime = now;

      setCurrentTime(prev => {
        let newTime;
        
        if (attemptType === 'time_rush') {
          // Make timer count down 1.5x faster
          newTime = prev - (elapsed * 1.5);
          if (newTime <= 0) {
            socket.emit('sendTimesUp', { userLevelSessionId: levelSession._id });
            clearInterval(timerIntervalRef.current);
            setAnswerSubmitted(true);
            return 0;
          }
        } else {
          // Precision Path: increment time 1.5x faster
          newTime = prev + (elapsed);
        }
        
        // Round to 2 decimal places for display
        return Math.round(newTime * 100) / 100;
      });
    }, 50); // Update every 50ms for faster display

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [quizFinished, isLoading, isTimerPaused, showNextLevelCountdown, levelSession?._id, socket, attemptType]);

  useEffect(() => {
    if (!levelSession?._id || quizFinished || socketInitializedRef.current) {
      return;
    }

    socket.on('connect', () => {
      console.log("Socket connected, getting level session");
      getLevelSession();
    });

    socket.on('levelSession', (data) => {
      console.log("Received level session data:", data);
      
      // Skip processing if we're transitioning to next level
      if (isTransitioning) {
        console.log("Skipping levelSession processing during transition");
        return;
      }
      
      setAttemptType(data.attemptType);
      setCurrentStreak(data.currentStreak || 0);
      
      if (data.currentQuestion) {
        console.log("Received current question from level session:", data.currentQuestion);
        setCurrentQuestion({
          question: data.currentQuestion.ques,
          options: data.currentQuestion.options,
          correctAnswer: data.currentQuestion.correct,
          topics: data.currentQuestion.topics
        });
        setIsLoading(false);
        // Note the time when question is initialized
        setQuestionStartTime(Date.now());
      } else {
        requestQuestion();
      }

      if (data.attemptType === 'time_rush' && data.timeRush) {
        setCurrentTime(data.timeRush.currentTime);
        setCurrentXp(data.timeRush.currentXp);
        setRequiredXp(data.timeRush.requiredXp);
        setCurrentQuestionIndex(data.timeRush.currentQuestionIndex);
        setTotalQuestions(data.timeRush.totalQuestions);
      } else if (data.attemptType === 'precision_path' && data.precisionPath) {
        setCurrentTime(data.precisionPath.currentTime);
        setCurrentXp(data.precisionPath.currentXp);
        setRequiredXp(data.precisionPath.requiredXp);
        setCurrentQuestionIndex(data.precisionPath.currentQuestionIndex);
        setTotalQuestions(data.precisionPath.totalQuestions);
      }
    });

    socket.on('question', (data) => {
      console.log("Received question:", data);
      setAnswerResult(null);
      setCurrentQuestion(data);
      setSelectedAnswer('');
      setIsLoading(false);
      // Note the time when question is initialized
      setQuestionStartTime(Date.now());
      if (data.currentQuestionIndex !== undefined) setCurrentQuestionIndex(data.currentQuestionIndex);
      if (data.totalQuestions !== undefined) setTotalQuestions(data.totalQuestions);
      if (data.currentStreak !== undefined) setCurrentStreak(data.currentStreak);
      setIsTimerPaused(false);
    });

    socket.on('answerResult', ({ isCorrect, correctAnswer, currentXp, currentStreak, message }) => {
      console.log("Received answer result:", { isCorrect, correctAnswer, currentXp, currentStreak, message });
      setAnswerResult({ isCorrect, correctAnswer, message });
      setCurrentXp(currentXp);
      if (currentStreak !== undefined) setCurrentStreak(currentStreak);
      setShowAnswerDrawer(true);
      setIsTimerPaused(true);
      setAnswerSubmitted(false); // Reset answer submitted state
    });

    socket.on('levelCompleted', ({ message, attemptType: eventAttemptType }) => {
      console.log("Level completed:", message, eventAttemptType);
      if (eventAttemptType === 'time_rush') {
        // For Time Rush, show congrats
        // Play level won sound
        const audio = new Audio(SOUND_FILES.LEVEL_WON);
        audio.play();
        
        setShowCongrats(true);
      }
    });

    socket.on('streak', (data) => {
      console.log("Streak milestone reached:", data);
      setStreakData(data);
      setShowStreakNotification(true);
      
      // Update current XP with bonus
      if (data.bonusXp) {
        setCurrentXp(prev => prev + data.bonusXp);
      }
      
      // Play achievement sound
      const audio = new Audio(SOUND_FILES.ACHIEVEMENT);
      audio.play();
      
      // Auto-hide streak notification after 3 seconds
      setTimeout(() => {
        setShowStreakNotification(false);
        setStreakData(null);
      }, 3000);
    });

    socket.on('quizFinished', (data) => {
      console.log("Quiz finished:", data);
      setQuizFinished(true);
      setQuizResults(data);
      setEarnedBadges(data.earnedBadges || []);
      
      // Handle AI feedback
      if (data.aiFeedback) {
        console.log("AI feedback:", data.aiFeedback);
        setAIFeedback(data.aiFeedback);
        setShowAIFeedback(true);
      }

      // Handle topic accuracy snackbars
      if (Array.isArray(data.topics) && data.topics.length > 0) {
        setTopicAccItems(data.topics);
        setTopicAccVisible(true);
      }
      
      // Trigger fireworks for new high scores
      if (data.isNewHighScore) {
        // Delay fireworks to appear after dialog is shown
        setTimeout(() => {
          setShowHighScoreFireworks(true);
          // Reset fireworks trigger after animation
          setTimeout(() => setShowHighScoreFireworks(false), 100);
        }, 500);
      }
      
      // Play level won sound only when level is completed
      const isTimeRush = data.attemptType === 'time_rush';
      const dataObj = isTimeRush ? data.timeRush : data.precisionPath;
      const isLevelCompleted = dataObj.currentXp >= dataObj.requiredXp;
      
      if (isLevelCompleted) {
        const audio = new Audio(SOUND_FILES.LEVEL_WON);
        audio.play();
      }else{
        const audio = new Audio(SOUND_FILES.LEVEL_LOST);
        audio.play();
      }
      
      setShowResults(true);
    });

    socket.on('quizError', ({ type, message }) => {
      console.error('Quiz error:', { type, message });
      if (type === 'failure') {
        setErrorMessage(message);
        setShowError(true);
        setQuizFinished(true);
      } else {
        // For non-critical errors, show as temporary message
        setQuizMessage(message);
        // Clear the message after 5 seconds for better UX
        setTimeout(() => {
          setQuizMessage('');
        }, 5000);
      }
    });

    socket.on('sessionDeleted', () => {
      console.log("Session deleted by server. Navigating back to levels.");
      navigate(`/chapter/${levelSession?.chapterId}`, { replace: true });
    });

    socketInitializedRef.current = true;

    return () => {
      console.log("Cleaning up socket connection");
      socket.off('connect');
      socket.off('question');
      socket.off('quizFinished');
      socket.off('quizError');
      socket.off('answerResult');
      socket.off('levelCompleted');
      socket.off('levelSession');
      socket.off('sessionDeleted');
      socket.off('streak');
      socketInitializedRef.current = false;
      initializedRef.current = false;
    };
  }, [levelSession?._id, quizFinished, socket, showResults]);

  // Play sound on answer result
  useEffect(() => {
    if (answerResult === null || typeof answerResult.isCorrect !== 'boolean') return;
    const audio = new Audio(answerResult.isCorrect ? SOUND_FILES.CORRECT : SOUND_FILES.INCORRECT);
    audio.play();
  }, [answerResult]);

  // Next Level countdown effect
  useEffect(() => {
    if (showNextLevelCountdown && nextLevelCountdown > 0) {
      const timer = setTimeout(() => {
        setNextLevelCountdown(prev => prev - 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else if (showNextLevelCountdown && nextLevelCountdown === 0) {
      
      if (nextLevelId) {
        // Play countdown end sound
        const audio = new Audio(SOUND_FILES.COUNTDOWN_END);
        audio.play();
        
        // Hide countdown overlay before navigation
        setShowNextLevelCountdown(false);
        
        if (isTryAgain) {
          // For try again, don't navigate, just reset states
          setIsTryAgain(false);
          setIsTransitioning(false);
          setNextLevelId(null);
        } else {
          // For next level, navigate to the new level
          setIsTransitioning(false);
          console.log("Forcing");
          navigate(`/quiz/${nextLevelId}`, { replace: true });
        }
      }
    }
  }, [showNextLevelCountdown, nextLevelCountdown, nextLevelId, navigate]);

  const handleNextLevel = async () => {
    if (quizResults?.nextLevelId) {
      try {
        // Set transition flag to prevent duplicate question loading
        setIsTransitioning(true);
        
        // Disconnect current socket and clean up
        if (socket.connected) {
          socket.disconnect();
        }
        
        // Start the next level using the API
        const result = await startLevel({ 
          levelId: quizResults.nextLevelId, 
          attemptType: quizResults.nextLevelAttemptType 
        }).unwrap();
        
        setNextLevelCountdown(3);
        setShowNextLevelCountdown(true);
        
        // Set the new level session
        dispatch(setLevelSession(result.data.session));
        setShowResults(false);
        setNextLevelId(quizResults.nextLevelId);
        
        // Set the attempt type for the next level
        setAttemptType(quizResults.nextLevelAttemptType);
        
        // Reset all quiz state for next level
        setCurrentQuestion(null);
        setSelectedAnswer('');
        setShowAnswerDrawer(false);
        // Reset answerResult after drawer closes with a small delay
        setTimeout(() => {
         setAnswerResult(null);
        }, 300);
        setIsLoading(true);
        setCurrentTime(0);
        setCurrentXp(0);
        setRequiredXp(0);
        setQuizFinished(false);
        setEarnedBadges([]);
        setCurrentQuestionIndex(0);
        setTotalQuestions(0);
        setCurrentStreak(0);
        setQuestionStartTime(null);
        setAnswerSubmitted(false);
        setShowCorrectAnswer(false);
        setShowCongrats(false);
        setShowError(false);
        setErrorMessage('');
        setQuizMessage('');
        
        // Hide AI feedback
        setShowAIFeedback(false);
        setAIFeedback('');

        // Hide topic accuracy snackbars
        setTopicAccVisible(false);
        setTopicAccItems([]);
        
        // Reset socket initialization flags
        initializedRef.current = false;
        socketInitializedRef.current = false;
        
      } catch (error) {
        console.error('Failed to start next level:', error);
        // If starting next level fails, just navigate back to levels
        setShowResults(false);
        navigate(`/chapter/${levelSession?.chapterId}`, { replace: true });
      }
    }
  };

  const handleTryAgain = async () => {
    try {
      // Set transition flag to prevent duplicate question loading
      setIsTransitioning(true);
      
      // Disconnect current socket and clean up
      if (socket.connected) {
        socket.disconnect();
      }
      
      // Start the current level again using the API
      const result = await startLevel({ 
        levelId: levelId, 
        attemptType: attemptType 
      }).unwrap();
      
      // Reset transition flag immediately after API success for try again
      setIsTransitioning(false);
      
      setNextLevelCountdown(3);
      setShowNextLevelCountdown(true);
      
      // Set the new level session
      dispatch(setLevelSession(result.data.session));
      setShowResults(false);
      setNextLevelId(levelId);
      setIsTryAgain(true);
      
      // Set the attempt type for the current level retry
      setAttemptType(attemptType);
      
      // Reset all quiz state for retry
      setCurrentQuestion(null);
      setSelectedAnswer('');
      setShowAnswerDrawer(false);
      // Reset answerResult after drawer closes with a small delay
      setTimeout(() => {
       setAnswerResult(null);
      }, 300);
      setIsLoading(true);
      setCurrentTime(0);
      setCurrentXp(0);
      setRequiredXp(0);
      setQuizFinished(false);
      setEarnedBadges([]);
      setCurrentQuestionIndex(0);
      setTotalQuestions(0);
      setCurrentStreak(0);
      setQuestionStartTime(null);
      setAnswerSubmitted(false);
      setShowCorrectAnswer(false);
      setShowCongrats(false);
      setShowError(false);
      setErrorMessage('');
      setQuizMessage('');
      setIsTimerPaused(false);
      
      // Hide AI feedback
      setShowAIFeedback(false);
      setAIFeedback('');

      // Hide topic accuracy snackbars
      setTopicAccVisible(false);
      setTopicAccItems([]);
      
      // Reset socket initialization flags
      initializedRef.current = false;
      socketInitializedRef.current = false;
      
    } catch (error) {
      console.error('Failed to retry level:', error);
      // If retrying fails, just navigate back to levels
      setShowResults(false);
      navigate(`/chapter/${levelSession?.chapterId}`, { replace: true });
    }
  };

  const cancelNextLevelCountdown = () => {
    setShowNextLevelCountdown(false);
    setNextLevelCountdown(3);
    setNextLevelId(null);
    setIsTryAgain(false);
    setShowResults(true);
  };

  const renderResults = () => {
    return (
      <Results 
        quizResults={quizResults}
        earnedBadges={earnedBadges}
        formatTime={formatTime}
        onNextLevel={handleNextLevel}
      />
    );
  };

  const sendQuizEnd = (userLevelSessionId) => {
    socket.emit('sendQuizEnd', { userLevelSessionId: userLevelSessionId });
    setShowError(false);
  };

  return (
      <QuizContainer>
        <QuizHeader>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton 
              onClick={handleBack} 
              size="medium"
              sx={quizStyles.backButton}
            >
              <ArrowBackIcon />
            </IconButton>
            {/*
            <IconButton 
              onClick={handleEndQuiz}
              size="medium"
              color="error"
              disabled={!!quizMessage}
              sx={quizStyles.backButton}
            >
              <CloseIcon />
            </IconButton>
            */}
          </Box>
          <XpDisplay>
            <StarIcon />
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              {currentXp} / {requiredXp} XP
            </Typography>
          </XpDisplay>
        </QuizHeader>

        <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          <TimeDisplay>

            {answerSubmitted ? (
              <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={16} sx={{ color: 'inherit' }} />
              </Box>
              </>
            ) : (
              <>
              <TimerIcon />
              {'Time: '} 
              {formatTime(currentTime, true)}
              </>
            )}
          </TimeDisplay>
        </Box>

        {quizMessage && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {quizMessage}
          </Alert>
        )}

        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {isLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <CircularProgress />
            </Box>
          ) : currentQuestion && !showNextLevelCountdown ? (
          <>
            <QuestionCard>
              <CardContent sx={quizStyles.questionCardContent}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Chip 
                    label="Question" 
                    size="small" 
                    sx={quizStyles.questionChip}
                  />
                  {/* Show question number for both modes */}
                  {totalQuestions > 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                      Question {currentQuestionIndex + 1} of {totalQuestions}
                    </Typography>
                  )}
                </Box>
                {/* Show question topics as chips */}
                {Array.isArray(currentQuestion?.topics) && currentQuestion.topics.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                    {currentQuestion.topics.map((topic, idx) => (
                      <Chip 
                        key={idx} 
                        label={topic} 
                        size="small" 
                        sx={{
                          backgroundColor: theme => theme.palette.mode === 'dark' ? '#444' : '#1F1F1F',
                          color: theme => theme.palette.mode === 'dark' ? 'white' : 'white',
                          '&:hover': {
                            backgroundColor: theme => theme.palette.mode === 'dark' ? '#555' : '#2A2A2A',
                          }
                        }}
                      />
                    ))}
                  </Box>
                )}
                <Typography 
                  variant="h5" 
                  component="h2" 
                  gutterBottom
                  sx={quizStyles.questionTitle}
                >
                  {currentQuestion.question}
                </Typography>
                {/* Optional question image */}
                {currentQuestion?.questionImage && (
                  <Box sx={{ mt: 1 }}>
                    <img
                      src={currentQuestion.questionImage}
                      alt="question"
                      style={{ width: '100%', maxHeight: 260, objectFit: 'contain', borderRadius: 8 }}
                    />
                  </Box>
                )}
              </CardContent>
            </QuestionCard>

            <Grid container spacing={3} sx={{ mt: 2 }}>
              {currentQuestion?.options?.map((option, index) => (
                <Grid size={{xs:12,sm:6,md:3}} key={index}>
                  <OptionCard
                    selected={selectedAnswer === index.toString()}
                    className={getOptionClass(index)}
                    onClick={() => !answerResult && setSelectedAnswer(index.toString())}
                  >
                    <CardContent>
                      <Typography variant="body1" align="center">
                        {option}
                      </Typography>
                    </CardContent>
                  </OptionCard>
                </Grid>
              ))}
            </Grid>

            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', gap: 2 }}>
              {!answerResult ? (
                <StyledButton
                  variant="contained"
                  size="large"
                  onClick={handleAnswerSubmit}
                  disabled={selectedAnswer === '' || answerSubmitted}
                  sx={{
                    backgroundColor: theme => theme.palette.mode === 'dark' ? '#444' : '#1F1F1F',
                    color: theme => theme.palette.mode === 'dark' ? 'white' : 'white',
                    '&:hover': {
                      backgroundColor: theme => theme.palette.mode === 'dark' ? '#555' : '#2A2A2A',
                    }
                  }}
                >
                  {answerSubmitted ? (
                    <>
                      <CircularProgress size={20} sx={{ mr: 1, color: 'inherit' }} />
                      Submitting...
                    </>
                  ) : (
                    'Submit Answer'
                  )}
                </StyledButton>
              ) : (
                <StyledButton
                  variant="contained"
                  size="large"
                  onClick={handleNextQuestion}
                  disabled={isLoading}
                  sx={{
                    backgroundColor: theme => theme.palette.mode === 'dark' ? '#1F1F1F' : '#FFFFFF',
                    color: theme => theme.palette.mode === 'dark' ? '#FFFFFF' : '#1F1F1F',
                    border: theme => `1px solid ${theme.palette.mode === 'dark' ? '#FFFFFF' : '#1F1F1F'}`,
                    '&:hover': {
                      backgroundColor: theme => theme.palette.mode === 'dark' ? '#2A2A2A' : '#F5F5F5',
                      borderColor: theme => theme.palette.mode === 'dark' ? '#FFFFFF' : '#1F1F1F',
                    },
                    '&:disabled': {
                      backgroundColor: theme => theme.palette.mode === 'dark' ? '#333333' : '#E0E0E0',
                      color: theme => theme.palette.mode === 'dark' ? '#666666' : '#999999',
                      borderColor: theme => theme.palette.mode === 'dark' ? '#666666' : '#999999',
                    }
                  }}
                >
                  Next Question
                </StyledButton>
              )}
            </Box>
          </>
        ) : null}
        </Box>

        {currentQuestion && import.meta.env.MODE === 'development' && (
          <FloatingButton
            variant="contained"
            onClick={() => setShowCorrectAnswer(!showCorrectAnswer)}
            sx={{
              position: 'fixed',
              bottom: 32,
              right: 32,
              zIndex: 1000,
              backgroundColor: theme => theme.palette.mode === 'dark' ? '#1F1F1F' : '#FFFFFF',
              color: theme => theme.palette.mode === 'dark' ? '#FFFFFF' : '#1F1F1F',
              border: theme => `1px solid ${theme.palette.mode === 'dark' ? '#FFFFFF' : '#1F1F1F'}`,
              '&:hover': {
                backgroundColor: theme => theme.palette.mode === 'dark' ? '#2A2A2A' : '#F5F5F5',
                borderColor: theme => theme.palette.mode === 'dark' ? '#FFFFFF' : '#1F1F1F',
              }
            }}
            title={showCorrectAnswer ? `Answer: ${currentQuestion.correctAnswer}` : "Show correct answer"}
          >
            {showCorrectAnswer ? currentQuestion.correctAnswer+1 : <HelpIcon />}
          </FloatingButton>
        )}

        <CongratsDialog 
          open={showCongrats} 
          onClose={() => setShowCongrats(false)}
        >
          <IconButton
            onClick={() => setShowCongrats(false)}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
            }}
          >
            <CloseIcon />
          </IconButton>
          <EmojiDisplay>🎉</EmojiDisplay>
          <DialogTitle sx={{ fontWeight: 'bold', fontSize: '1.5rem' }}>
            Congratulations!
          </DialogTitle>
          <DialogContent>
            <Typography variant="body1" sx={{ mb: 2 }}>
              You've completed the level with {currentXp} XP!
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Your total Coins is now {userTotalCoins + currentXp}!
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Time remaining: {formatTime(currentTime, true)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Keep up the great work! 🚀
            </Typography>
          </DialogContent>
          <DialogActions sx={{ justifyContent: 'center', gap: 2, pb: 2 }}>
            <StyledButton
              variant="outlined"
              onClick={() => {
                setShowCongrats(false);
                confirmEndQuiz(); // End the level
              }}
            >
              End Level
            </StyledButton>
            <StyledButton
              variant="contained"
              onClick={() => setShowCongrats(false)}
            >
              Continue Quiz
            </StyledButton>
          </DialogActions>
        </CongratsDialog>

        <DialogMigrate 
          open={showResults} 
          onClose={() => setShowResults(false)}
          disableBackdropClick
          disableEscapeKeyDown
          BackdropProps={{
            sx: quizStyles.resultsBackdrop
          }}
          PaperProps={{
            sx: quizStyles.resultsDialogPaper
          }}
        >
          <Tooltip title="Back to Levels" placement="right">
            <IconButton
              onClick={() => {
                setShowResults(false);
                navigate(`/chapter/${levelSession?.chapterId}`, { replace: true });
              }}
              sx={{
                position: 'absolute',
                left: 8,
                top: 8,
              }}
            >
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>
          {Array.isArray(quizResults?.questionsHistory) && quizResults.questionsHistory.length > 0 && (
            <Tooltip title="View Solutions" placement="left">
              <IconButton
                aria-label="view solutions"
                onClick={() => setShowSolutions(true)}
                size="small"
                sx={{
                  position: 'absolute',
                  right: 12,
                  top: 12,
                  color: (theme) => theme.palette.mode === 'dark' ? '#E5E7EB' : '#374151',
                  backgroundColor: 'transparent',
                  borderRadius: 1.5,
                  '&:hover': {
                    backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'
                  }
                }}
              >
                <AssignmentIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <DialogTitle sx={{ fontWeight: 'bold', fontSize: '1.5rem' }}>
            Quiz Results
          </DialogTitle>
          <DialogContent>
            {renderResults()}
          </DialogContent>
          <DialogActions sx={{ justifyContent: 'center', gap: 2, pb: 2}}>
            <StyledButton
              variant="outlined"
              onClick={handleTryAgain}
            >
              Try Again
            </StyledButton>
            {quizResults?.hasNextLevel && quizResults?.nextLevelId && (
              <StyledButton
                variant="contained"
                onClick={handleNextLevel}
              >
                Next Level
              </StyledButton>
            )}            
          </DialogActions>
        </DialogMigrate>

        {/* Solutions Dialog */}
        <Solution 
          open={showSolutions} 
          onClose={() => setShowSolutions(false)} 
          questionsHistory={quizResults?.questionsHistory || []}
        />

        <Dialog 
          open={openDialog} 
          onClose={() => setOpenDialog(false)}
          PaperProps={{
            sx: {
              borderRadius: 2,
              padding: 2
            }
          }}
        >
          <DialogTitle sx={{ fontWeight: 'bold' }}>
            End Quiz
          </DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to end the quiz? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ padding: 2 }}>
            <Button 
              onClick={() => setOpenDialog(false)}
              variant="outlined"
            >
              Cancel
            </Button>
            <Button 
              onClick={confirmEndQuiz} 
              color="error" 
              variant="contained"
            >
              End Quiz
            </Button>
          </DialogActions>
        </Dialog>

                <Dialog 
          open={showError} 
          onClose={() => setShowError(false)}
          BackdropProps={{
            sx: quizStyles.resultsBackdrop
          }}
          sx={quizStyles.errorDialog}
        >
          <DialogTitle sx={quizStyles.errorDialogTitle}>
            <CancelIcon sx={{ fontSize: '2rem' }} />
            Quiz Error
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mb: 3 }}>
              <Box sx={quizStyles.errorMessageBox}>
                <Typography variant="body1" sx={quizStyles.errorMessageText}>
                {errorMessage}
              </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Don't worry! Please return to levels and try again.
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
            <StyledButton
              variant="contained"
              sx={quizStyles.errorDialogButton}
              onClick={() => {
                setShowError(false);
                navigate(`/chapter/${levelSession?.chapterId}`, { replace: true });
              }}
            >
              Back to Levels
            </StyledButton>
          </DialogActions>
        </Dialog>

        {/* Answer Result Drawer */}
        <Drawer
          anchor="bottom"
          open={showAnswerDrawer}
          onClose={() => setShowAnswerDrawer(false)}
          PaperProps={{
            sx: {
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              backgroundColor: answerResult?.isCorrect ? '#2e7d32' : '#d32f2f',
              color: 'white',
              padding: 2,
              textAlign: 'center',
              minHeight: '120px',
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 3,
            }
          }}
        >
          <Box sx={{ fontSize: '2.5rem' }}>
            {answerResult?.isCorrect ? '😊' : '😔'}
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <Typography variant="h4" sx={{ opacity: 0.9 }}>
              {answerResult?.message || (answerResult?.isCorrect 
                ? 'Great job! You got it right!' 
                : 'Don\'t worry, keep trying!'
              )}
              !
            </Typography>
          </Box>
          <StyledButton
            variant="contained"
            size="medium"
            onClick={handleNextQuestion}
            disabled={isLoading}
            sx={{
              backgroundColor: 'white',
              color: answerResult?.isCorrect ? '#2e7d32' : '#d32f2f',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
              },
              '&.MuiButton-contained': {
                background: 'white',
                color: answerResult?.isCorrect ? '#2e7d32' : '#d32f2f',
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.9)',
                  transform: 'translateY(-2px)',
                },
              },
            }}
          >
            Next Question
          </StyledButton>
        </Drawer>

        {/* Back Confirmation Dialog */}
        <Dialog
          open={showBackConfirmDialog}
          onClose={cancelBack}
          disableBackdropClick
          disableEscapeKeyDown
          PaperProps={{
            sx: {
              borderRadius: 2,
              padding: 2
            }
          }}
        >
          <DialogTitle sx={{ fontWeight: 'bold' }}>
            Leave Quiz?
          </DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to leave the quiz? Your progress will be lost and cannot be recovered.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ padding: 2 }}>
            <Button
              onClick={cancelBack}
              variant="outlined"
            >
              Continue Quiz
            </Button>
            <Button
              onClick={confirmBack}
              color="error"
              variant="contained"
            >
              Leave Quiz
            </Button>
          </DialogActions>
        </Dialog>

        {/* Streak Notification Component */}
        <StreakNotification 
          show={showStreakNotification}
          streakData={streakData}
          onClose={() => setShowStreakNotification(false)}
        />
        
        {/* Next Level Countdown Overlay */}
        {showNextLevelCountdown && (
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
              onClick={cancelNextLevelCountdown}
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
                  animation: nextLevelCountdown > 0 ? 'pulse 1s ease-in-out' : 'none',
                  '@keyframes pulse': {
                    '0%': { transform: 'scale(1)' },
                    '50%': { transform: 'scale(1.1)' },
                    '100%': { transform: 'scale(1)' }
                  },
                }}
              >
                {nextLevelCountdown}
              </Typography>
              <Typography 
                variant="h4" 
                sx={{ 
                  mt: 2,
                  color: 'white',
                  opacity: 0.8,
                }}
              >
                {nextLevelCountdown > 0 ? 'Get Ready!' : 'Starting Next Level...'}
              </Typography>
            </Box>
          </Box>
        )}

        {/* High Score Fireworks Component */}
        <ConfettiFireworks trigger={showHighScoreFireworks} />
        
        {/* AI Feedback Component */}
        <AIFeedback 
          feedback={aiFeedback}
          isVisible={showAIFeedback}
          onClose={() => setShowAIFeedback(false)}
          anchor="left"
          offset={20}
        />
        <AccuracySnackbars
          topics={topicAccItems}
          isVisible={topicAccVisible}
          onClose={() => setTopicAccVisible(false)}
          bottomOffset={0}
        />
      </QuizContainer>
  );
};

export default Quiz;

