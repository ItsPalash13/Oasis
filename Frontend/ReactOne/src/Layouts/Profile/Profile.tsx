// @ts-nocheck
import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { 
  Avatar, 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  CircularProgress, 
  Alert, 
  Button,
  IconButton,
  Tooltip,
  Stack,
  Chip,
  Grid
} from '@mui/material';
import { Edit as EditIcon, Palette as PaletteIcon, Email as EmailIcon, Star as CoinsIcon, Favorite as HealthIcon, Whatshot as StreakIcon, TrendingUp as TrendingUpIcon, TrendingDown as TrendingDownIcon, CheckCircle as CheckCircleIcon, Cancel as CancelIcon, Assessment as AssessmentIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
// @ts-ignore
import { selectCurrentUser } from '../../features/auth/authSlice';
// @ts-ignore
import { useGetUserInfoQuery, useUpdateUserInfoMutation, useGetMonthlyLeaderboardQuery } from '../../features/api/userAPI';
import AvatarSelector from '../../components/AvatarSelector';
import AvatarColorPicker from '../../components/AvatarColorPicker';
import Leaderboard from '../../components/Leaderboard';
import { getAvatarSrc, getDefaultAvatar, getDefaultAvatarBgColor } from '../../utils/avatarUtils';

interface Topic {
  _id: string;
  topic: string;
}

interface UserAnalytics {
  totalQuestionsAttempted?: number;
  totalQuestionsCorrect?: number;
  totalQuestionsIncorrect?: number;
  strengths?: Topic[] | string[];
  weaknesses?: Topic[] | string[];
}

interface UserInfo {
  _id?: string;
  name?: string;
  email?: string;
  totalCoins?: number;
  health?: number;
  avatar?: string;
  avatarBgColor?: string;
  badges?: Array<{ badgeId: string; level: number }>;
  analytics?: UserAnalytics;
  [key: string]: any;
}

const Profile: React.FC = () => {
  const [avatarSelectorOpen, setAvatarSelectorOpen] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  
  // Get current user from Redux
  const user: UserInfo = useSelector(selectCurrentUser) || {};
  console.log(user?.id);
  const userId = user?.id;

  // Fetch user info from API
  const { data, isLoading, error, refetch } = useGetUserInfoQuery(userId, { skip: !userId });
  const userInfo: UserInfo = data?.data || user;
  const badges = userInfo?.badges || [];
  const analytics = userInfo?.analytics;

  // Helper to get topic name (handles both populated objects and IDs)
  const getTopicName = (topic: Topic | string): string => {
    if (typeof topic === 'string') return topic;
    return topic?.topic || 'Unknown Topic';
  };

  // Calculate accuracy
  const accuracy = analytics?.totalQuestionsAttempted && analytics.totalQuestionsAttempted > 0
    ? Math.round((analytics.totalQuestionsCorrect || 0) / analytics.totalQuestionsAttempted * 100)
    : 0;
  
  // Fetch monthly leaderboard
  const { data: leaderboardData, isLoading: leaderboardLoading, error: leaderboardError } = useGetMonthlyLeaderboardQuery();
  
  // Update user info mutation
  const [updateUserInfo, { isLoading: isUpdating }] = useUpdateUserInfoMutation();

  const handleAvatarSelect = async (selectedAvatar) => {
    try {
      await updateUserInfo({
        userId,
        data: { avatar: selectedAvatar }
      });
      // Refetch user info to get updated data
      refetch();
    } catch (error) {
      console.error('Failed to update avatar:', error);
    }
  };

  const handleColorSelect = async (selectedColor) => {
    try {
      await updateUserInfo({
        userId,
        data: { avatarBgColor: selectedColor }
      });
      // Refetch user info to get updated data
      refetch();
    } catch (error) {
      console.error('Failed to update avatar background color:', error);
    }
  };



  const getCurrentAvatarSrc = () => {
    if (userInfo?.avatar) {
      return getAvatarSrc(userInfo.avatar);
    }
    return getDefaultAvatar().src;
  };

  const getCurrentBgColor = () => {
    return userInfo?.avatarBgColor || getDefaultAvatarBgColor();
  };

  // --- Stats for coins, health, streak with specific colors ---
  const stats = [
    {
      label: 'XP',
      value: userInfo?.totalCoins ?? 0,
      icon: <CoinsIcon sx={{ color: '#FFD700' }} />, // gold
      color: 'warning',
    },
    {
      label: 'Health',
      value: userInfo?.health ?? 0,
      icon: <HealthIcon sx={{ color: '#FF0808' }} />, // red
      color: 'error',
    },
    {
      label: 'Streak',
      value: userInfo?.dailyAttemptsStreak ?? 0,
      icon: <StreakIcon sx={{ color: '#ff5722' }} />, // orange
      color: 'secondary',
    },
  ];

  if (!userId) {
    return <Alert severity="error">User not found. Please log in again.</Alert>;
  }

  return (
    <Box
      sx={{
        width: '100%',
        minHeight: '100vh',
        bgcolor: 'background.default',
        p: { xs: 1, sm: 4 },
        boxSizing: 'border-box',
        background: isDark
          ? 'linear-gradient(135deg, #232526 0%, #414345 100%)'
          : 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        transition: 'background 0.3s',
      }}
    >
      {/* Profile Card and Leaderboard Side by Side */}
      <Grid container spacing={3} sx={{ mt: { xs: 2, sm: 6 } }}>
        {/* Profile Card */}
        <Grid item xs={12} md={6}>
          <Card
            sx={{
              borderRadius: 4,
              boxShadow: 6,
              p: { xs: 2, sm: 4 },
              position: 'relative',
              overflow: 'visible',
              height: 'fit-content',
              backgroundColor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            {/* Avatar with glow and edit buttons */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
              <Box sx={{ position: 'relative', mb: 1 }}>
                <Avatar
                  src={getCurrentAvatarSrc()}
                  sx={{
                    width: 120,
                    height: 120,
                    fontSize: 48,
                    border: '4px solid',
                    borderColor: theme.palette.mode === 'dark' ? '#444' : '#1F1F1F',
                    boxShadow: '0 0 24px 4px rgba(108, 5, 250, 0.2)',
                    bgcolor: getCurrentBgColor(),
                    transition: 'box-shadow 0.3s',
                  }}
                >
                  {userInfo?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                </Avatar>
                {/* Edit Avatar Button */}
                <Tooltip title="Change Avatar">
                  <IconButton
                    onClick={() => setAvatarSelectorOpen(true)}
                    sx={{
                      position: 'absolute',
                      bottom: 8,
                      right: 8,
                      backgroundColor: theme.palette.mode === 'dark' ? '#444' : '#1F1F1F',
                      color: 'white',
                      '&:hover': { 
                        backgroundColor: theme.palette.mode === 'dark' ? '#555' : '#2A2A2A' 
                      },
                      boxShadow: 2,
                      zIndex: 2,
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                {/* Edit Color Button */}
                <Tooltip title="Change Background Color">
                  <IconButton
                    onClick={() => setColorPickerOpen(true)}
                    sx={{
                      position: 'absolute',
                      bottom: 8,
                      left: 8,
                      backgroundColor: theme.palette.mode === 'dark' ? '#444' : '#1F1F1F',
                      color: 'white',
                      '&:hover': { 
                        backgroundColor: theme.palette.mode === 'dark' ? '#555' : '#2A2A2A' 
                      },
                      boxShadow: 2,
                      zIndex: 2,
                    }}
                  >
                    <PaletteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              {/* Name and Email */}
              <Typography variant="h4" fontWeight={700} gutterBottom align="center" sx={{ letterSpacing: 1, color: 'text.primary' }}>
                {userInfo?.fullName || 'User'}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <EmailIcon fontSize="small" color="action" />
                <Typography variant="body1" color="text.secondary" fontWeight={500}>
                  {userInfo?.email || 'No email'}
                </Typography>
              </Box>
              {/* Stats Chips */}
              <Box sx={{ display: 'flex', gap: 2, mt: 1, mb: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                {stats.map((stat, idx) => (
                  <Chip
                    key={stat.label}
                    icon={stat.icon}
                    label={`${stat.value} ${stat.label}`}
                    color={stat.color as any}
                    sx={{
                      fontWeight: 600,
                      fontSize: '1rem',
                      px: 2,
                      boxShadow: 1,
                      letterSpacing: 0.5,
                    }}
                  />
                ))}
              </Box>


            </Box>

          </Card>
        </Grid>

        {/* Leaderboard */}
        <Grid item xs={12} md={6}>
          <Card
            sx={{
              borderRadius: 4,
              boxShadow: 6,
              p: { xs: 2, sm: 3 },
              height: 'fit-content',
              backgroundColor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Leaderboard 
              data={leaderboardData?.data || []}
              month={leaderboardData?.month}
              isLoading={leaderboardLoading}
              error={leaderboardError}
            />
          </Card>
        </Grid>
      </Grid>
      {/* Analytics Section */}
      {analytics && (
        <Box sx={{ width: '100%', maxWidth: 900, mt: 4 }}>
          <Typography variant="h5" fontWeight={700} gutterBottom align="left" sx={{ mb: 3, color: 'text.primary' }}>
            <AssessmentIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
            Your Analytics
          </Typography>
          
          {/* Statistics Cards */}
          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid item xs={6} sm={3}>
              <Card
                sx={{
                  p: 2,
                  borderRadius: 3,
                  boxShadow: 3,
                  textAlign: 'center',
                  backgroundColor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Total Attempted
                </Typography>
                <Typography variant="h4" fontWeight={700} color="text.primary">
                  {analytics.totalQuestionsAttempted || 0}
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card
                sx={{
                  p: 2,
                  borderRadius: 3,
                  boxShadow: 3,
                  textAlign: 'center',
                  backgroundColor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Correct Answers
                </Typography>
                <Typography variant="h4" fontWeight={700} color="success.main">
                  {analytics.totalQuestionsCorrect || 0}
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card
                sx={{
                  p: 2,
                  borderRadius: 3,
                  boxShadow: 3,
                  textAlign: 'center',
                  backgroundColor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Incorrect Answers
                </Typography>
                <Typography variant="h4" fontWeight={700} color="error.main">
                  {analytics.totalQuestionsIncorrect || 0}
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card
                sx={{
                  p: 2,
                  borderRadius: 3,
                  boxShadow: 3,
                  textAlign: 'center',
                  backgroundColor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Accuracy
                </Typography>
                <Typography variant="h4" fontWeight={700} color="primary.main">
                  {accuracy}%
                </Typography>
              </Card>
            </Grid>
          </Grid>

          {/* Strengths and Weaknesses */}
          <Grid container spacing={3}>
            {/* Strengths */}
            <Grid item xs={12} md={6}>
              <Card
                sx={{
                  p: 3,
                  borderRadius: 3,
                  boxShadow: 3,
                  backgroundColor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  height: '100%',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <TrendingUpIcon sx={{ color: 'success.main', mr: 1 }} />
                  <Typography variant="h6" fontWeight={700} color="text.primary">
                    Your Strengths
                  </Typography>
                </Box>
                {analytics.strengths && analytics.strengths.length > 0 ? (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {analytics.strengths.map((topic, idx) => (
                      <Chip
                        key={idx}
                        label={getTopicName(topic)}
                        color="success"
                        icon={<CheckCircleIcon />}
                        sx={{
                          fontWeight: 600,
                          fontSize: '0.9rem',
                        }}
                      />
                    ))}
                  </Box>
                ) : (
                  <Typography color="text.secondary" fontStyle="italic">
                    No strengths identified yet. Keep practicing!
                  </Typography>
                )}
              </Card>
            </Grid>

            {/* Weaknesses */}
            <Grid item xs={12} md={6}>
              <Card
                sx={{
                  p: 3,
                  borderRadius: 3,
                  boxShadow: 3,
                  backgroundColor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  height: '100%',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <TrendingDownIcon sx={{ color: 'error.main', mr: 1 }} />
                  <Typography variant="h6" fontWeight={700} color="text.primary">
                    Areas to Improve
                  </Typography>
                </Box>
                {analytics.weaknesses && analytics.weaknesses.length > 0 ? (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {analytics.weaknesses.map((topic, idx) => (
                      <Chip
                        key={idx}
                        label={getTopicName(topic)}
                        color="error"
                        icon={<CancelIcon />}
                        sx={{
                          fontWeight: 600,
                          fontSize: '0.9rem',
                        }}
                      />
                    ))}
                  </Box>
                ) : (
                  <Typography color="text.secondary" fontStyle="italic">
                    Great job! No areas need improvement right now.
                  </Typography>
                )}
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Badges Section */}
      <Box sx={{ width: '100%', maxWidth: 900, mt: 4}}>
        <Typography variant="h5" fontWeight={700} gutterBottom align="left" sx={{ mb: 2, color: 'text.primary' }}>
          Badges
        </Typography>
        <Grid container spacing={3}>
          {badges.length === 0 && (
            <Grid item xs={12}>
              <Typography color="text.secondary">No badges earned yet.</Typography>
            </Grid>
          )}
          {badges.map((badge, idx) => {
            const badgeDef = badge.badgeId;
            if (!badgeDef) return null;
            const level = badge.level ?? 0;
            const badgeLevel = badgeDef.badgelevel?.[level] || {};
            return (
              <Grid item xs={6} sm={4} md={3} key={idx}>
                <Tooltip title={<> 
                  <Typography variant="subtitle2" fontWeight={600}>{badgeDef.badgeName}</Typography>
                  <Typography variant="body2">{badgeDef.badgeDescription}</Typography>
                  <Typography variant="caption" color="primary">Level: {level + 1}</Typography>
                </>} arrow>
                  <Card
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      p: 2,
                      borderRadius: 3,
                      boxShadow: 3,
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'scale(1.05)',
                        boxShadow: 6,
                      },
                      minHeight: 180,
                      backgroundColor: 'background.paper',
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <img
                      src={badgeLevel.badgeImage || ''}
                      alt={badgeDef.badgeName}
                      style={{ width: 72, height: 72, objectFit: 'contain', borderRadius: 12, marginBottom: 8, background: '#f5f5f5' }}
                    />
                    <Typography variant="subtitle1" fontWeight={600} align="center" sx={{ color: 'text.primary' }}>
                      {badgeDef.badgeName}
                    </Typography>
                    <Typography variant="caption" color="primary" align="center" sx={{ mt: 0.5 }}>
                      Level: {level + 1}
                    </Typography>
                  </Card>
                </Tooltip>
              </Grid>
            );
          })}
        </Grid>
      </Box>
      {/* Avatar Selector Dialog */}
      <AvatarSelector
        open={avatarSelectorOpen}
        onClose={() => setAvatarSelectorOpen(false)}
        onSelect={handleAvatarSelect}
        currentAvatar={userInfo?.avatar}
      />
      {/* Avatar Color Picker Dialog */}
      <AvatarColorPicker
        open={colorPickerOpen}
        onClose={() => setColorPickerOpen(false)}
        onSelect={handleColorSelect}
        currentColor={userInfo?.avatarBgColor}
        currentAvatar={getCurrentAvatarSrc()}
      />
    </Box>
  );
};

export default Profile;
