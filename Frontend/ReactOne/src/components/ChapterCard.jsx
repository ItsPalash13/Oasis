import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography,
  Box,
} from '@mui/material';
import { StyledChapterCard, chapterCardStyles } from '../theme/chapterCardTheme';
import { getRankForRating } from '../utils/rankUtils';

// Import badge images
import bronzeBadge from '../assets/badges/bronze.png';
import silverBadge from '../assets/badges/silver.png';
import goldBadge from '../assets/badges/gold.png';
import platinumBadge from '../assets/badges/platinum.png';
import diamondBadge from '../assets/badges/diamond.png';

const ChapterCard = ({ chapter, onClick, userRating = 0, metadataList = [] }) => {
  const navigate = useNavigate();
  const isActive = chapter.status !== false; // Use status from Chapter data
  
  // Get rank name based on userRating
  const rankName = getRankForRating(userRating, metadataList);

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

  const badgeImage = getBadgeImage(rankName);

  const handleChapterClick = () => {
    console.log("ChapterCard clicked");
    // Don't navigate if chapter is inactive
    if (!isActive) {
      return;
    }
    
    // Navigate to PreQuizLayout with chapter data in state
    navigate(`/pre-quiz/${chapter._id}`, {
      state: { chapter }
    });
  };

  return (
    <StyledChapterCard 
      onClick={handleChapterClick}
      isActive={isActive}
      sx={{

        cursor: isActive ? 'pointer' : 'default',
        position: 'relative',
        ...(isActive ? {} : {
          '&:hover': {
            transform: 'none',
            boxShadow: 'none'
          }
        })
      }}
    >
      {chapter.thumbnailUrl ? (
        <Box sx={chapterCardStyles.imageContainer}>
          <img
            src={chapter.thumbnailUrl}
            alt={chapter.name}
            style={{
              ...chapterCardStyles.image,

            }}
          />
        </Box>
      ) : (
        <Box sx={chapterCardStyles.placeholderContainer} />
      )}
      <Box sx={chapterCardStyles.cardContent}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
            <Typography 
              variant="h6" 
              sx={{
                ...chapterCardStyles.title,
                color: isActive ? 'inherit' : 'text.secondary'
              }}
            >
              {chapter.name}
            </Typography>
          </Box>
          
          {!isActive ? (
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontWeight: 500,
                fontSize: '0.75rem',
                opacity: 0.5,
                mb:1.4
              }}
            >
              Coming Soon
            </Typography>
          ) : (
            isActive && badgeImage && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  mb:1.5
                }}
              >
                <img
                  src={badgeImage}
                  alt={rankName}
                  style={{
                    width: 20,
                    height: 20,
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 1px 4px rgba(0, 0, 0, 0.2))',
                  }}
                />
                {userRating > 0 && (
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      color: 'text.secondary',
                      lineHeight: 1,
                    }}
                  >
                    {userRating}
                  </Typography>
                )}
              </Box>
            )
          )}
        </Box>
      </Box>
    </StyledChapterCard>
  );
};

export default ChapterCard; 