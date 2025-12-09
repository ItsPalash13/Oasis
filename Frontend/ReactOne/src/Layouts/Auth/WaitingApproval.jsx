import React from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { themeColors, colors } from '../../theme/colors';

const WaitingApproval = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: themeColors.background.main,
        minHeight: 'calc(100vh - 64px)', // Adjust for navbar height
        textAlign: 'center',
        gap: 3,
      }}
    >
      <CircularProgress 
        size={60} 
        sx={{ 
          color: (theme) => theme.palette.mode === 'dark' 
          ? colors.text.dark.primary 
          : colors.text.light.primary,
          mb: 2
        }} 
      />
      <Typography 
        variant="h4" 
        component="h1"
        sx={{
          color: (theme) => 
            theme.palette.mode === 'dark' 
              ? colors.text.dark.primary 
              : colors.text.light.primary,
          fontWeight: 700,
          mb: 2
        }}
      >
        Waiting for Admin Approval
      </Typography>
      <Typography 
        variant="body1"
        sx={{
          color: (theme) => 
            theme.palette.mode === 'dark' 
              ? colors.text.dark.secondary 
              : colors.text.light.secondary,
          maxWidth: '500px',
          px: 3
        }}
      >
        Your account is pending approval. Please wait while an administrator reviews your registration.
      </Typography>
    </Box>
  );
};

export default WaitingApproval;

