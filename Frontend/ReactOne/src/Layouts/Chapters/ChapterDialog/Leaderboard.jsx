import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { colors } from '../../../theme/colors';

const Leaderboard = ({ chapter }) => {
  const theme = useTheme();
  const textSecondary = theme.palette.mode === 'dark' ? colors.ui.dark.textSecondary : colors.ui.light.textSecondary;

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 200 }}>
      <Typography
        variant="body2"
        sx={{
          textAlign: 'center',
          color: textSecondary,
          fontStyle: 'italic',
        }}
      >
        Leaderboard coming soon...
      </Typography>
    </Box>
  );
};

export default Leaderboard;

