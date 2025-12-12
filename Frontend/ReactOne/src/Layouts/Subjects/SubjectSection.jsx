import React from 'react';
import {
  Box,
  Typography,
  IconButton,
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { useGetChaptersBySubjectQuery } from '../../features/api/chapterAPI';
import ChapterCard from '../Chapters/ChapterCard';
import { subjectSectionStyles } from '../../theme/subjectSectionTheme';

const SubjectSection = ({ subject, metadataList = [], chapterSessionsMap = {} }) => {
  const { data: chaptersData, isLoading, error } = useGetChaptersBySubjectQuery(subject.slug);
  const scrollContainerRef = React.useRef(null);
  const [showScrollButtons, setShowScrollButtons] = React.useState(false);

  const handleChapterClick = (chapter) => {
    console.log('Chapter clicked:', chapter);
    // Navigate to chapter detail or start quiz
  };

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  if (isLoading) {
    return (
      <Box sx={subjectSectionStyles.container}>
        <Typography variant="h6" sx={subjectSectionStyles.sectionTitle}>
          {subject.icon} {subject.name}
        </Typography>
        <Typography {...subjectSectionStyles.loadingText}>Loading chapters...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={subjectSectionStyles.container}>
        <Typography variant="h6" sx={subjectSectionStyles.sectionTitle}>
          {subject.icon} {subject.name}
        </Typography>
        <Typography {...subjectSectionStyles.errorText}>No chapters found for {subject.name}</Typography>
      </Box>
    );
  }

  const chapters = chaptersData?.data || [];

  return (
    <Box sx={subjectSectionStyles.container}>
      <Typography variant="h6" sx={subjectSectionStyles.sectionTitle}>
        {subject.icon} {subject.name} 
      </Typography>
      
      {chapters.length > 0 ? (
        <Box 
          sx={subjectSectionStyles.scrollContainer}
          onMouseEnter={() => setShowScrollButtons(true)}
          onMouseLeave={() => setShowScrollButtons(false)}
        >
          {/* Left Scroll Button */}
          <Box
            sx={{
              ...subjectSectionStyles.scrollButtonContainer,
              ...subjectSectionStyles.leftScrollButton,
              opacity: showScrollButtons ? 1 : 0,
            }}
            onClick={scrollLeft}
          >
            <IconButton sx={subjectSectionStyles.scrollButton}>
              <ChevronLeftIcon />
            </IconButton>
          </Box>

          {/* Right Scroll Button */}
          <Box
            sx={{
              ...subjectSectionStyles.scrollButtonContainer,
              ...subjectSectionStyles.rightScrollButton,
              opacity: showScrollButtons ? 1 : 0,
            }}
            onClick={scrollRight}
          >
            <IconButton sx={subjectSectionStyles.scrollButton}>
              <ChevronRightIcon />
            </IconButton>
          </Box>

          {/* Scroll Container */}
          <Box 
            ref={scrollContainerRef}
            sx={subjectSectionStyles.chaptersContainer}
          >
            {chapters.map((chapter) => {
              const userRating = chapterSessionsMap[chapter._id] || 0;
              return (
                <Box key={chapter._id} sx={subjectSectionStyles.chapterItem}>
                  <ChapterCard 
                    chapter={chapter} 
                    onClick={handleChapterClick}
                    userRating={userRating}
                    metadataList={metadataList}
                  />
                </Box>
              );
            })}
          </Box>
        </Box>
      ) : (
        <Typography {...subjectSectionStyles.noChaptersText}>
          No chapters available for {subject.name}
        </Typography>
      )}
    </Box>
  );
};

export default SubjectSection; 