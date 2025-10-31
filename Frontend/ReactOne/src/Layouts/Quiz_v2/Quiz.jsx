import React, { useEffect, useState } from 'react';
import { Box, CardContent, CircularProgress, Grid, Typography } from '@mui/material';
import { QuizHeader, QuestionCard, OptionCard, StyledButton, TimeDisplay, quizStyles } from '../../theme/quizTheme';
import { Timer as TimerIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';

const Quiz = ({ socket }) => {
  const navigate = useNavigate();
  const { quizId } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [question, setQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [result, setResult] = useState(null);
  const [time, setTime] = useState(0);

  // minimal local timer (commented out)
  // useEffect(() => {
  //   const i = setInterval(() => setTime((t) => t + 1), 1000);
  //   return () => clearInterval(i);
  // }, []);

  // connect and fetch question
  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }
    const onConnect = () => {
      socket.emit('initiate');
    };
    const onQuestion = (data) => {
      setQuestion(data);
      setSelectedAnswer(null);
      setResult(null);
      setIsLoading(false);
    };
    const onResult = (data) => {
      setResult(data);
    };

    socket.on('connect', onConnect);
    socket.on('question', onQuestion);
    socket.on('result', onResult);

    return () => {
      socket.off('connect', onConnect);
      socket.off('question', onQuestion);
      socket.off('result', onResult);
      if (socket.connected) socket.disconnect();
    };
  }, [socket, quizId]);

  const submitAnswer = () => {
    if (!question || selectedAnswer === null) return;
    setIsLoading(true);
    socket.emit('answer', { id: question.id, answerIndex: selectedAnswer });
    setTimeout(() => setIsLoading(false), 150); // small UX delay
  };

  const nextQuestion = () => {
    setIsLoading(true);
    socket.emit('initiate');
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <Box sx={{ p: 2 }}>
      <QuizHeader>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <StyledButton
            variant="outlined"
            size="small"
            onClick={() => navigate(-1)}
            sx={quizStyles.backButton}
          >
            <ArrowBackIcon fontSize="small" />
          </StyledButton>
        </Box>
        {/* Time clock commented */}
        {/* <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <TimeDisplay>
            <TimerIcon />
            {'Time: '}
            {formatTime(time)}
          </TimeDisplay>
        </Box> */}
      </QuizHeader>

      {isLoading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      ) : (
        question && (
          <>
            <QuestionCard>
              <CardContent sx={quizStyles.questionCardContent}>
                <Typography variant="h6" sx={quizStyles.questionTitle}>
                  {question.ques}
                </Typography>
              </CardContent>
            </QuestionCard>

            <Grid container spacing={3} sx={{ mt: 2 }}>
              {question.options?.map((opt, idx) => (
                <Grid key={idx} size={{ xs: 12, sm: 6, md: 3 }}>
                  <OptionCard
                    selected={selectedAnswer === idx}
                    className={
                      result
                        ? idx === result.correctIndex
                          ? 'correct-answer'
                          : idx === selectedAnswer
                            ? (result.isCorrect ? 'correct' : 'wrong')
                            : ''
                        : selectedAnswer === idx
                          ? 'selected'
                          : ''
                    }
                    onClick={() => result ? null : setSelectedAnswer(idx)}
                  >
                    <CardContent>
                      <Typography variant="subtitle1" align="center">
                        {opt}
                      </Typography>
                    </CardContent>
                  </OptionCard>
                </Grid>
              ))}
            </Grid>

            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', gap: 2 }}>
              {!result ? (
                <StyledButton
                  variant="contained"
                  size="large"
                  onClick={submitAnswer}
                  disabled={selectedAnswer === null || isLoading}
                  sx={{
                    backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#444' : '#1F1F1F',
                    color: (theme) => theme.palette.mode === 'dark' ? 'white' : 'white',
                  }}
                >
                  Submit Answer
                </StyledButton>
              ) : (
                <StyledButton
                  variant="contained"
                  size="large"
                  onClick={nextQuestion}
                  disabled={isLoading}
                >
                  Next Question
                </StyledButton>
              )}
            </Box>
          </>
        )
      )}
    </Box>
  );
};

export default Quiz;

