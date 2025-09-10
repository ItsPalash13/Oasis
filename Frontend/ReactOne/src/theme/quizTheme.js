import { styled } from '@mui/material/styles';
import { Box, Card, Button, Dialog } from '@mui/material';
import { colors, getThemeColor, getThemeGradient, themeColors } from './colors.js';

export const QuizContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  backgroundColor: theme.palette.mode === 'dark' ? '#0A0A0A' : theme.palette.background.default,
  backgroundImage: theme.palette.mode === 'dark' ? 'none' : themeColors.background.main(theme),
  position: 'relative',
  minHeight: '100vh', // Auto-scale based on content while ensuring minimum full height
  height: 'auto', // Allow content to determine height
  display: 'flex',
  flexDirection: 'column',
}));

export const QuestionCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(4),
  borderRadius: 16,
  background: theme.palette.mode === 'dark' 
    ? '#111111'
    : colors.background.light.paper,
  border: theme.palette.mode === 'dark'
    ? `1px solid ${colors.border.dark.primary}`
    : `1px solid ${colors.border.light.primary}`,
  boxShadow: theme.palette.mode === 'dark' 
    ? colors.shadow.dark.medium
    : colors.shadow.light.medium,
  transition: 'all 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.palette.mode === 'dark' 
      ? colors.shadow.dark.high
      : colors.shadow.light.high,
  },
}));

export const OptionCard = styled(Card, {
  shouldForwardProp: (prop) => prop !== 'selected'
})(({ theme, selected }) => ({
  cursor: 'pointer',
  borderRadius: 16,
  minHeight: '120px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(2),
  background: selected
    ? getThemeColor('#e0e0e0', '#222')(theme)
    : theme.palette.mode === 'dark'
      ? '#111111'
      : colors.background.light.accent,
  color: selected
    ? getThemeColor('#111', '#fafafa')(theme)
    : undefined,
  fontWeight: selected ? 700 : undefined,
  border: selected
    ? 'none'
    : theme.palette.mode === 'dark'
      ? `2px solid ${colors.border.dark.secondary}`
      : `2px solid ${colors.border.light.secondary}`,
  boxShadow: selected
    ? getThemeColor('0 2px 8px #bbb', '0 2px 8px #111')(theme)
    : theme.palette.mode === 'dark'
      ? colors.shadow.dark.low
      : colors.shadow.light.low,
  '&:hover:not(.correct):not(.wrong):not(.correct-answer)': {
    border: theme.palette.mode === 'dark'
      ? `2px solid ${colors.border.dark.accent}`
      : `2px solid ${colors.border.light.accent}`,
    boxShadow: theme.palette.mode === 'dark' 
      ? colors.shadow.dark.medium
      : colors.shadow.light.medium,
  },
  '& .MuiTypography-root': selected ? {
    color: getThemeColor('#111', '#fafafa')(theme),
    fontWeight: 700,
  } : {},
  '&.correct': {
    border: '2px solid #2e7d32',
    background: colors.success.main,
    color: 'white',
    transform: 'translateY(-2px)',
    '& .MuiTypography-root': {
      color: 'white',
      fontWeight: 600,
    }
  },
  '&.wrong': {
    border: '2px solid #d32f2f',
    background: colors.error.main,
    color: 'white',
    transform: 'translateY(-2px)',
    '& .MuiTypography-root': {
      color: 'white',
      fontWeight: 600,
    }
  },
  '&.correct-answer': {
    border: '2px solid #2e7d32',
    background: colors.success.main,
    color: 'white',
    transform: 'translateY(-2px)',
    '& .MuiTypography-root': {
      color: 'white',
      fontWeight: 600,
    }
  }
}));

export const QuizHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: theme.spacing(4),
  padding: theme.spacing(2),

  borderRadius: 16,

}));

export const StyledButton = styled(Button)(({ theme }) => ({
  borderRadius: 12,
  padding: theme.spacing(1.5, 4),
  fontSize: '1rem',
  fontWeight: 600,
  textTransform: 'none',
  boxShadow: 'none',
  transition: 'all 0.2s ease-in-out',
  '&.MuiButton-contained': {
    background: theme.palette.mode === 'dark' ? '#1F1F1F' : '#1F1F1F',
    color: theme.palette.mode === 'dark' ? '#FFFFFF' : '#FFFFFF',
    '&:hover': {
      background: theme.palette.mode === 'dark' ? '#2A2A2A' : '#2A2A2A',
      transform: 'translateY(-2px)',
    },
  },
  '&.MuiButton-outlined': {

    color: theme.palette.mode === 'dark' ? '#FFFFFF' : '#1F1F1F',
    '&:hover': {
      backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(31, 31, 31, 0.1)',
      borderColor: theme.palette.mode === 'dark' ? '#FFFFFF' : '#1F1F1F',
    },
  },
}));

export const TimeDisplay = styled(Box)(({ theme }) => ({
  fontSize: '1rem',
  fontWeight: 'bold',
  textAlign: 'center',
  marginBottom: theme.spacing(2),
  padding: theme.spacing(1, 3),
  background: theme.palette.mode === 'dark' 
    ? '#111111'
    : colors.background.light.paper,
  borderRadius: 12,
  border: theme.palette.mode === 'dark'
    ? `1px solid ${colors.border.dark.primary}`
    : `1px solid ${colors.border.light.primary}`,
  boxShadow: theme.palette.mode === 'dark' 
    ? colors.shadow.dark.low
    : colors.shadow.light.low,
  display: 'inline-flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  color: getThemeColor(colors.text.light.primary, colors.text.dark.primary),
}));

export const XpDisplay = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  background: colors.warning.main,
  padding: theme.spacing(1.5, 2.5),
  borderRadius: 12,
  color: 'white',
  fontWeight: 'bold',
  boxShadow: '0 4px 16px rgba(245, 158, 11, 0.3)',
  '& .MuiSvgIcon-root': {
    color: 'white',
  }
}));

export const HeartDisplay = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  background: '#F0242D',
  padding: theme.spacing(1.5, 2.5),
  borderRadius: 12,
  color: 'white',
  fontWeight: 'bold',
  boxShadow: '0 4px 16px rgba(233, 30, 99, 0.3)',
  '& .MuiSvgIcon-root': {
    color: 'white',
  }
}));

export const CorrectQuestionsDisplay = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  background: '#4CAF50',
  padding: theme.spacing(1.5, 2.5),
  borderRadius: 12,
  color: 'white',
  fontWeight: 'bold',
  boxShadow: '0 4px 16px rgba(76, 175, 80, 0.3)',
  '& .MuiSvgIcon-root': {
    color: 'white',
  }
}));

export const CongratsDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    borderRadius: 20,
    padding: theme.spacing(3),
    textAlign: 'center',
    maxWidth: '400px',
    width: '100%',
    background: theme.palette.mode === 'dark' 
      ? colors.background.dark.paper
      : colors.background.light.paper,
    border: theme.palette.mode === 'dark'
      ? `1px solid ${colors.border.dark.primary}`
      : `1px solid ${colors.border.light.primary}`,
  },
}));

export const EmojiDisplay = styled(Box)(({ theme }) => ({
  fontSize: '4rem',
  marginBottom: theme.spacing(2),
  animation: 'bounce 1s infinite',
  '@keyframes bounce': {
    '0%, 100%': {
      transform: 'translateY(0)',
    },
    '50%': {
      transform: 'translateY(-20px)',
    },
  },
}));

export const FloatingButton = styled(Button)(({ theme }) => ({
  position: 'fixed',
  bottom: theme.spacing(4),
  right: theme.spacing(4),
  borderRadius: '50%',
  width: '64px',
  height: '64px',
  minWidth: '64px',
  background: getThemeColor(colors.app.light.border, colors.app.dark.border),
  color: getThemeColor(colors.text.light.primary, colors.text.dark.primary),
  fontWeight: 'bold',
  fontSize: '1.2rem',
  boxShadow: getThemeColor(colors.shadow.light.medium, colors.shadow.dark.medium),
  transition: 'all 0.3s ease-in-out',
  '&:hover': {
    background: getThemeColor(colors.app.light.accent, colors.app.dark.accent),
    transform: 'translateY(-4px)',
    boxShadow: getThemeColor(colors.shadow.light.high, colors.shadow.dark.high),
  },
}));

export const quizStyles = {
  backButton: {
    background: theme => theme.palette.mode === 'dark' 
      ? colors.overlay.dark.medium
      : colors.overlay.light.medium,
    color: getThemeColor(colors.text.light.secondary, colors.text.dark.secondary),
    border: theme => theme.palette.mode === 'dark'
      ? `1px solid ${colors.border.dark.secondary}`
      : `1px solid ${colors.border.light.secondary}`,
    borderRadius: 2,
    transition: 'all 0.2s ease-in-out',
    '&:hover': {
      background: theme => theme.palette.mode === 'dark' 
        ? colors.overlay.dark.high
        : colors.overlay.light.high,
      transform: 'translateY(-1px)',
    },
  },
  questionCardContent: {
    p: 4,
  },
  questionChip: {
    background: getThemeColor(colors.app.light.border, colors.app.dark.border),
    color: getThemeColor(colors.text.light.primary, colors.text.dark.primary),
    fontWeight: 'bold',
  },
  questionTitle: {
    color: getThemeColor(colors.text.light.primary, colors.text.dark.primary),
  },
  correctChip: {
    background: colors.success.main,
    color: 'white',
    fontWeight: 'bold',
  },
  wrongChip: {
    background: colors.error.main,
    color: 'white',
    fontWeight: 'bold',
  },
  resultContainer: {
    mb: 4,
    textAlign: 'center',
  },
  xpContainer: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 1,
    mb: 2,
    p: 2,
    borderRadius: 3,
    background: colors.warning.main,
    color: 'white',
  },
  progressContainer: {
    mb: 3,
  },
  messageContainer: {
    p: 3,
    borderRadius: 2,
    background: theme => theme.palette.mode === 'dark' 
      ? colors.overlay.dark.medium
      : colors.overlay.light.medium,
    border: theme => theme.palette.mode === 'dark'
      ? `1px solid ${colors.border.dark.secondary}`
      : `1px solid ${colors.border.light.secondary}`,
    mb: 3,
  },
  statusContainer: {
    textAlign: 'center',
    p: 2,
    borderRadius: 2,
  },
  completedStatus: {
    background: colors.success.lighter,
  },
  inProgressStatus: {
    background: getThemeColor(colors.overlay.light.medium, colors.overlay.dark.medium),
  },
  
  // Results page styles
  resultsXpBox: {
    display: 'inline-flex', 
    alignItems: 'center', 
    gap: 1, 
    mb: 2,
    p: 2,
    borderRadius: 3,
    background: '#f59e0b',
    color: 'white'
  },
  
  resultsStatsContainer: {
    display: 'flex', 
    justifyContent: 'space-between', 
    mb: 2
  },
  
  progressBarContainer: {
    mb: 3
  },
  
  progressBar: {
    height: 12, 
    borderRadius: 2,
    backgroundColor: theme => theme.palette.mode === 'dark' ? '#3a3a5c' : '#e5e7eb',
    '& .MuiLinearProgress-bar': {
      borderRadius: 2,
    }
  },
  
  progressBarCompleted: {
    background: '#4caf50',
  },
  
  progressBarIncomplete: {
    background: theme => theme.palette.mode === 'dark' ? '#666666' : '#999999',
  },
  
  resultsMessageBox: {
    p: 3,
    borderRadius: 2,
    background: theme => theme.palette.mode === 'dark' 
      ? 'rgba(255, 255, 255, 0.05)' 
      : 'rgba(0, 0, 0, 0.03)',
    border: theme => theme.palette.mode === 'dark'
      ? '1px solid rgba(255, 255, 255, 0.1)'
      : '1px solid rgba(0, 0, 0, 0.1)',
    mb: 3
  },
  
  resultsMessageText: {
    fontWeight: 500,
    textAlign: 'center',
    lineHeight: 1.6
  },
  
  resultsStatusBox: {
    textAlign: 'center',
    p: 2,
    borderRadius: 2,
  },
  
  resultsStatusCompleted: {
    background: 'rgba(76, 175, 80, 0.1)',
  },
  
  resultsStatusInProgress: {
    background: theme => theme.palette.mode === 'dark' 
      ? 'rgba(255, 255, 255, 0.05)' 
      : 'rgba(0, 0, 0, 0.03)',
  },
  
  resultsStatusTitle: {
    fontWeight: 'bold',
    mb: 1
  },
  
  // Answer chips
  correctAnswerChip: {
    background: '#4caf50',
    color: 'white',
    fontWeight: 'bold'
  },
  
  wrongAnswerChip: {
    background: '#f44336',
    color: 'white',
    fontWeight: 'bold'
  },
  
  // Error dialog styles
  errorDialog: {
    '& .MuiDialog-paper': {
      borderRadius: 20,
      padding: 3,
      textAlign: 'center',
      maxWidth: '400px',
      width: '100%',
      background: theme => theme.palette.mode === 'dark' 
        ? '#2A2A2A'
        : '#FBFBFA',
      border: '1px solid rgba(211, 47, 47, 0.2)',
    }
  },
  
  errorDialogTitle: {
    fontWeight: 'bold', 
    fontSize: '1.5rem', 
    color: '#d32f2f',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1
  },
  
  errorMessageBox: {
    p: 2,
    borderRadius: 2,
    background: 'rgba(244, 67, 54, 0.1)',
    border: '1px solid rgba(211, 47, 47, 0.2)',
    mb: 2
  },
  
  errorMessageText: {
    fontWeight: 500,
    color: '#d32f2f',
    mb: 1
  },
  
  errorDialogButton: {
    background: '#f44336',
    '&:hover': {
      background: '#d32f2f',
    }
  },
  
  // Results backdrop
  resultsBackdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  
  resultsDialogPaper: {
    borderRadius: 3,
    padding: 3,
    textAlign: 'center',
    maxWidth: '470px',
    width: '100%',
  },
}; 