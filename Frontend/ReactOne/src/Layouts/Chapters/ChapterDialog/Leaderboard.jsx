import React, { useEffect, useRef, Fragment, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  Divider,
  CircularProgress,
  useTheme
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon
} from '@mui/icons-material';
import { colors, themeScrollbar } from '../../../theme/colors';
import { useGetChapterLeaderboardQuery, useGetDummyUsersQuery } from '../../../features/api/chapterAPI';
import { getAvatarSrc as getAvatarSrcFromUtils } from '../../../utils/avatarUtils';
import { getRankForRating } from '../../../utils/rankUtils';

// Import badge images
import bronzeBadge from '../../../assets/badges/bronze.png';
import silverBadge from '../../../assets/badges/silver.png';
import goldBadge from '../../../assets/badges/gold.png';
import platinumBadge from '../../../assets/badges/platinum.png';
import diamondBadge from '../../../assets/badges/diamond.png';

const Leaderboard = ({ chapter }) => {
  const theme = useTheme();
  const scrollContainerRef = useRef(null);
  
  // Get current user ID and metadataList from Redux
  const currentUserId = useSelector((state) => state?.auth?.user?.id);
  const metadataList = useSelector((state) => state?.metadata?.metadataList || []);
  
  // Fetch leaderboard data
  const { data: leaderboardData, isLoading } = useGetChapterLeaderboardQuery(
    chapter?._id,
    { skip: !chapter?._id }
  );

  const realLeaderboard = leaderboardData?.data || [];
  const currentUserRank = leaderboardData?.currentUserRank || null;

  // Fetch dummy users from API
  const chapterId = chapter?._id?.toString();
  const { data: dummyUsersResponse } = useGetDummyUsersQuery(chapterId, { skip: !chapterId });
  const chapterDummyUsers = dummyUsersResponse?.data || [];

  // Merge dummy users with real leaderboard data
  const leaderboard = useMemo(() => {
    
    // ============================================================
    // TO DISABLE DUMMY USERS: Change line below to:
    // const filteredDummyUsers = [].filter(
    // ============================================================
    const filteredDummyUsers = chapterDummyUsers.filter(
      dummyUser => dummyUser.userId !== currentUserId
    );

    // Get real user IDs to avoid duplicates
    const realUserIds = new Set(realLeaderboard.map(user => user.userId));
    
    // Filter dummy users that don't conflict with real users
    const availableDummyUsers = filteredDummyUsers.filter(
      dummyUser => !realUserIds.has(dummyUser.userId)
    );

    // Combine real and dummy users
    const combined = [...realLeaderboard, ...availableDummyUsers];

    // Sort by userRating descending
    const sorted = combined.sort((a, b) => (b.userRating || 0) - (a.userRating || 0));

    // Reassign ranks (1-based)
    const withRanks = sorted.map((user, index) => ({
      ...user,
      rank: index + 1
    }));

    return withRanks;
  }, [realLeaderboard, currentUserId, chapter, chapterDummyUsers]);

  // Recalculate current user rank after merging
  const finalCurrentUserRank = useMemo(() => {
    if (!currentUserId) return null;
    const userEntry = leaderboard.find(user => user.userId === currentUserId);
    return userEntry ? userEntry.rank : currentUserRank;
  }, [leaderboard, currentUserId, currentUserRank]);

  // Map rank name to badge image
  const getBadgeImage = (rank) => {
    if (!rank) return null;
    const rankLower = rank.toLowerCase();
    switch (rankLower) {
      case 'bronze':
        return bronzeBadge;
      case 'silver':
        return silverBadge;
      case 'gold':
        return goldBadge;
      case 'platinum':
        return platinumBadge;
      case 'diamond':
        return diamondBadge;
      default:
        return null;
    }
  };

  // Find current user in leaderboard and scroll to their position
  useEffect(() => {
    if (scrollContainerRef.current && finalCurrentUserRank && leaderboard.length > 0) {
      const userIndex = leaderboard.findIndex(user => user.userId === currentUserId);
      
      if (userIndex !== -1) {
        const itemHeight = 70;
        const scrollPosition = userIndex * itemHeight;
        
        scrollContainerRef.current.scrollTo({
          top: scrollPosition,
          behavior: 'smooth'
        });
      }
    }
  }, [leaderboard, finalCurrentUserRank, currentUserId]);

  // Resolve avatar image source using shared utils by filename
  const resolveAvatarSrc = (avatarPath) => {
    if (!avatarPath) return null;
    const filename = avatarPath.includes('/') ? avatarPath.split('/').pop() : avatarPath;
    return getAvatarSrcFromUtils(filename) || null;
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <TrophyIcon sx={{ color: '#FFA500', fontSize: 20 }} />;
      case 2:
        return <TrophyIcon sx={{ color: '#E5E5E5', fontSize: 18 }} />;
      case 3:
        return <TrophyIcon sx={{ color: '#B8860B', fontSize: 16 }} />;
      default:
        return null;
    }
  };

  const getRankBadgeColor = (rank) => {
    switch (rank) {
      case 1:
        return { backgroundColor: '#FFA500', color: '#000' };
      case 2:
        return { backgroundColor: '#E5E5E5', color: '#000' };
      case 3:
        return { backgroundColor: '#B8860B', color: '#fff' };
      default:
        return { backgroundColor: '#666666', color: '#fff' };
    }
  };

  const getAvatarDisplay = (user) => {
    const avatarSrc = resolveAvatarSrc(user.avatar);
    
    if (avatarSrc) {
      return (
        <Avatar
          src={avatarSrc}
          sx={{
            width: 36,
            height: 36,
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}
        />
      );
    }

    const backgroundColor = user.avatarBgColor || 'rgba(255, 255, 255, 0.2)';
    const initials = user.fullName 
      ? user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
      : 'U';

    return (
      <Avatar
        sx={{
          width: 36,
          height: 36,
          backgroundColor,
          color: 'white',
          fontWeight: 'bold',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          fontSize: '0.875rem'
        }}
      >
        {initials}
      </Avatar>
    );
  };

  // Scrollbar color defaults
  const getResolvedScrollbarThumb = (theme) => themeScrollbar.thumb(theme);
  const getResolvedScrollbarThumbHover = (theme) => themeScrollbar.thumbHover(theme);
  const getResolvedScrollbarTrack = (theme) => themeScrollbar.track(theme);
  const getResolvedScrollbarWidth = (theme) => themeScrollbar.width(theme);

  // Loading state
  if (isLoading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100%',
        minHeight: 200 
      }}>
        <CircularProgress />
      </Box>
    );
  }

  // Empty state (shouldn't happen now with dummy users, but keep for safety)
  if (!leaderboard || leaderboard.length === 0) {
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
          No leaderboard data available yet. Start taking quizzes to see rankings!
        </Typography>
      </Box>
    );
  }

  return (
    <Card sx={{
      backgroundColor: theme => theme.palette.mode === 'dark' 
        ? 'rgba(0, 0, 0, 0.8)' 
        : 'rgba(255, 255, 255, 0.95)',
      border: theme => `1px solid ${theme.palette.mode === 'dark' 
        ? 'rgba(255, 255, 255, 0.1)' 
        : 'rgba(0, 0, 0, 0.1)'}`,
      borderRadius: 3,
      mb: 1
    }}>
      <CardContent sx={{ p: 2 }}>
        {/* Header */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: 1,
          mb: 2
        }}>
          <TrophyIcon sx={{ color: '#FFA500', fontSize: '1.2rem' }} />
          <Typography variant="h6" sx={{ 
            fontWeight: 'bold', 
            color: '#FFA500'
          }}>
            {finalCurrentUserRank && finalCurrentUserRank <= 10 ? 'Top 10 Leaderboard' : 'Leaderboard'}
          </Typography>
        </Box>

        {/* Leaderboard List */}
        <Box 
          ref={scrollContainerRef}
          sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 1,
            maxHeight: '300px',
            overflowY: 'auto',
            overflowX: 'hidden',
            paddingRight: '4px',
            scrollbarWidth: 'thin',
            scrollbarColor: (theme) => `${getResolvedScrollbarThumb(theme)} ${getResolvedScrollbarTrack(theme)}`,
            '&::-webkit-scrollbar': {
              width: (theme) => getResolvedScrollbarWidth(theme),
            },
            '&::-webkit-scrollbar-track': {
              background: (theme) => getResolvedScrollbarTrack(theme),
              borderRadius: '3px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: (theme) => getResolvedScrollbarThumb(theme),
              borderRadius: '3px',
              '&:hover': {
                background: (theme) => getResolvedScrollbarThumbHover(theme),
              },
            },
          }}>
          {leaderboard.map((user, index) => {
            const isCurrentUser = user.userId === currentUserId;
            const isTop10 = user.rank <= 10;
            const showSeparator = index === 10 && finalCurrentUserRank && finalCurrentUserRank > 10;
            
            return (
              <Fragment key={user.userId || index}>
                {/* Separator for user outside top 10 */}
                {showSeparator && (
                  <Box sx={{ my: 1 }}>
                    <Divider sx={{ 
                      borderColor: theme => theme.palette.mode === 'dark' 
                        ? 'rgba(255, 255, 255, 0.2)' 
                        : 'rgba(0, 0, 0, 0.2)' 
                    }} />
                    <Typography variant="caption" sx={{ 
                      display: 'block', 
                      textAlign: 'center', 
                      mt: 1,
                      color: theme => theme.palette.mode === 'dark' 
                        ? 'rgba(255, 255, 255, 0.6)' 
                        : 'rgba(0, 0, 0, 0.6)',
                      fontStyle: 'italic'
                    }}>
                      Your Rank
                    </Typography>
                  </Box>
                )}
                
                <Box 
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    p: 1.5,
                    borderRadius: 2,
                    backgroundColor: isCurrentUser 
                      ? 'rgba(255, 165, 0, 0.15)'
                      : theme => theme.palette.mode === 'dark' 
                        ? 'rgba(255, 255, 255, 0.05)' 
                        : 'rgba(0, 0, 0, 0.05)',
                    border: isCurrentUser 
                      ? '1px solid rgba(255, 165, 0, 0.4)'
                      : theme => `1px solid ${theme.palette.mode === 'dark' 
                        ? 'rgba(255, 255, 255, 0.1)' 
                        : 'rgba(0, 0, 0, 0.1)'}`,
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      backgroundColor: isCurrentUser 
                        ? 'rgba(255, 165, 0, 0.2)'
                        : theme => theme.palette.mode === 'dark' 
                          ? 'rgba(255, 255, 255, 0.1)' 
                          : 'rgba(0, 0, 0, 0.1)'
                    }
                  }}
                >
                  {/* Rank Icon - Only show for top 3 */}
                  {user.rank <= 3 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 24 }}>
                      {getRankIcon(user.rank)}
                    </Box>
                  )}
                  {user.rank > 3 && (
                    <Box sx={{ minWidth: 24 }} />
                  )}

                  {/* Avatar */}
                  {getAvatarDisplay(user)}

                  {/* User Info */}
                  <Box sx={{ flex: 2, minWidth: 0, alignContent: 'left', textAlign: 'left' }}>
                    <Typography variant="body2" sx={{ 
                      fontWeight: '500',
                      color: theme => theme.palette.mode === 'dark' ? 'white' : 'black',
                      alignContent: 'left',
                      lineHeight: 1.2
                    }}>
                      {user.fullName || `User ${user.userId?.slice(-4)}`}
                    </Typography>
                  </Box>

                  {/* Rating with Badge */}
                  <Box sx={{ flex: 0, minWidth: '80px', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                    {(() => {
                      const rankName = getRankForRating(user.userRating, metadataList);
                      const badgeImage = getBadgeImage(rankName);
                      
                      return (
                        <>
                          {badgeImage && (
                            <img
                              src={badgeImage}
                              alt={rankName}
                              style={{
                                width: 18,
                                height: 18,
                                objectFit: 'contain',
                                filter: 'drop-shadow(0 1px 4px rgba(0, 0, 0, 0.2))',
                              }}
                            />
                          )}
                          <Typography variant="body2" sx={{ 
                            color: theme => theme.palette.mode === 'dark' 
                              ? 'rgba(255, 255, 255, 0.7)' 
                              : 'rgba(0, 0, 0, 0.7)',
                            fontWeight: '500'
                          }}>
                            {user.userRating?.toLocaleString() || '0'}
                          </Typography>
                        </>
                      );
                    })()}
                  </Box>

                  {/* Rank Badge */}
                  <Box sx={{ flex: 0, minWidth: '40px', display: 'flex', justifyContent: 'flex-end' }}>
                    <Chip
                      label={`#${user.rank}`}
                      size="small"
                      sx={{
                        ...getRankBadgeColor(user.rank),
                        fontWeight: 'bold',
                        fontSize: '0.7rem',
                        height: 20,
                        minWidth: '32px'
                      }}
                    />
                  </Box>
                </Box>
              </Fragment>
            );
          })}
        </Box>
      </CardContent>
    </Card>
  );
};

export default Leaderboard;

