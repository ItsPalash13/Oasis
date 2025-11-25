import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useStartGameV3Mutation } from '../features/api/chapterAPI';
import { setquizSession } from '../features/auth/quizSessionSlice';
import {
  Typography,
  Box,
  Chip,
} from '@mui/material';
import { StyledChapterCard, chapterCardStyles } from '../theme/chapterCardTheme';
import { getRankForRating } from '../utils/rankUtils';

const ChapterCard = ({ chapter, onClick, userRating = 0, metadataList = [] }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [startGameV3] = useStartGameV3Mutation();
  const isActive = chapter.status !== false; // Use status from Chapter data
  
  // Get rank name based on userRating
  const rankName = getRankForRating(userRating, metadataList);

  const handleChapterClick = () => {
    console.log("ChapterCard clicked");
    // Don't navigate if chapter is inactive
    if (!isActive) {
      return;
    }
    
    // Old custom onClick (v1). To restore, uncomment the next lines.
    // if (onClick) {
    //   onClick(chapter);
    //   return;
    // }

    // Old v1 navigation:
    // navigate(`/chapter/${chapter._id}`);

    // New v3 start flow
    (async () => {
      try {
        console.log('Starting Quiz v3 via /level_v3/start');
        const result = await startGameV3(chapter._id).unwrap();
        console.log('Game started result:', result);
        // Map `{ userChapterTicket }` into `{ data: { session: { id } } }` if backend returns ticket
        const mapped = result && result.data ? result : { data: { session: { id: result.userChapterTicket } } };
        dispatch(setquizSession(mapped.data.session));
        console.log('Navigating to /quiz_v3/', mapped.data.session.id);
        navigate(`/quiz_v3/${mapped.data.session.id}`);
      } catch (err) {
        console.error('Quiz v3 start failed:', err);
        // Fallback: if start fails, go to chapter page
        navigate(`/chapter/${chapter._id}`);
      }
    })();
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
            {isActive && rankName && (
              <Chip
                label={`${rankName}, ${userRating}`}
                size="small"
                sx={{
                  height: '20px',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: 'inherit',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}
              />
            )}
          </Box>
          
          {!isActive && (
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
          )}
        </Box>
      </Box>
    </StyledChapterCard>
  );
};

export default ChapterCard; 