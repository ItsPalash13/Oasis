import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useStartGameMutation } from '../features/api/chapterAPI';
import { setquizSession } from '../features/auth/quizSessionSlice';
import {
  Typography,
  Box,
} from '@mui/material';
import { StyledChapterCard, chapterCardStyles } from '../theme/chapterCardTheme';

const ChapterCard = ({ chapter, onClick }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [startGame] = useStartGameMutation();
  const isActive = chapter.status !== false; // Use status from Chapter data

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

    // New v2 (dummy) start flow
    (async () => {
      try {
        console.log('Starting Quiz v2 via /level_v2_dummy/start');
        const result = await startGame(chapter._id).unwrap();
        console.log('Game started result:', result);
        // Map `{ userChapterTicket }` into `{ data: { session: { id } } }` if backend returns ticket
        const mapped = result && result.data ? result : { data: { session: { id: result.userChapterTicket } } };
        dispatch(setquizSession(mapped.data.session));
        console.log('Navigating to /quiz_v2/', mapped.data.session.id);
        navigate(`/quiz_v2/${mapped.data.session.id}`);
      } catch (err) {
        console.error('Quiz v2 start failed:', err);
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
          <Typography 
            variant="h6" 
            sx={{
              ...chapterCardStyles.title,
              color: isActive ? 'inherit' : 'text.secondary'
            }}
          >
            {chapter.name}
          </Typography>
          
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