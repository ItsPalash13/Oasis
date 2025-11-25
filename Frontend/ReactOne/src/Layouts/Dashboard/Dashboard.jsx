import React from 'react';
import { Box, Chip } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import SubjectSection from '../Subjects/SubjectSection';
import { dashboardStyles } from '../../theme/dashboardTheme';
import { authClient } from '../../lib/auth-client';
import { setSession } from '../../features/auth/authSlice';
import { useTheme } from '@mui/material/styles';
import { useGetAllMetadataQuery } from '../../features/api/metadataAPI';
import { useGetChapterSessionsQuery } from '../../features/api/userAPI';

// Chapters by Subject Component
const ChaptersBySubject = ({ darkMode, metadataList, chapterSessionsMap }) => {
  const subjects = [
    { name: 'Physics', slug: 'phy', icon: '' },
    { name: 'Mathematics', slug: 'math', icon: '' },
    { name: 'Chemistry', slug: 'chem', icon: '' }
  ];

  return (
    <Box sx={dashboardStyles.chaptersContainer}>
      {subjects.map((subject) => (
        <SubjectSection 
          key={subject.slug} 
          subject={subject}
          metadataList={metadataList}
          chapterSessionsMap={chapterSessionsMap}
        />
      ))}
    </Box>
  );
};

const Dashboard = ({ darkMode, onDarkModeToggle }) => {
  const dispatch = useDispatch();
  const [selectedTopic, setSelectedTopic] = React.useState('All');
  
  // Get session data from auth client
  const { data: session, refetch: refetchSession } = authClient.useSession();
  
  // Get user from Redux store
  const user = useSelector((state) => state?.auth?.user);
  
  // Fetch metadata and chapter sessions
  const { data: metadataData, isLoading: metadataLoading } = useGetAllMetadataQuery(undefined, {
    skip: !user // Skip if user is not authenticated
  });
  
  const { data: chapterSessionsData, isLoading: sessionsLoading } = useGetChapterSessionsQuery(undefined, {
    skip: !user // Skip if user is not authenticated
  });
  
  // Process metadata list
  const metadataList = metadataData?.data || [];
  
  // Create a map of chapterId -> userRating for quick lookup
  const chapterSessionsMap = React.useMemo(() => {
    if (!chapterSessionsData?.data) return {};
    const map = {};
    chapterSessionsData.data.forEach((session) => {
      if (session.chapterId) {
        map[session.chapterId.toString()] = session.userRating || 0;
      }
    });
    return map;
  }, [chapterSessionsData]);
  
  // Helper function to serialize dates in an object
  const serializeDates = (obj) => {
    if (!obj) return obj;
    
    const result = { ...obj };
    for (const key in result) {
      if (result[key] instanceof Date) {
        result[key] = result[key].toISOString();
      } else if (typeof result[key] === 'object' && result[key] !== null) {
        result[key] = serializeDates(result[key]);
      }
    }
    return result;
  };

  // Update session data on load
  React.useEffect(() => {
    console.log('Session data from auth client in Dashboard:', session); // Debug log
    if (session?.session && session?.user) {
      // Serialize dates before dispatching to Redux
      const serializedSession = serializeDates(session.session);
      const serializedUser = serializeDates(session.user);

      console.log('Dispatching to Redux from Dashboard:', { serializedSession, serializedUser }); // Debug log
      dispatch(setSession({
        session: serializedSession,
        user: serializedUser
      }));
    }
  }, [session, dispatch]);

  // Force session refetch on component mount
  React.useEffect(() => {
    console.log('Dashboard component mounted, refetching session...');
    refetchSession();
  }, [refetchSession]);
  
  const jeeTopics = [
    'All',
    'Calculus',
    'Algebra',
    'Trigonometry',
    'Mechanics',
    'Electromagnetism',
    'Thermodynamics',
    'Organic Chemistry',
    'Inorganic Chemistry',
    'Physical Chemistry',
    'Coordination Chemistry',
    'Electrochemistry',
    'Chemical Kinetics'
  ];

  const theme = useTheme();

  return (
    <Box sx={dashboardStyles.container}>
      {/* JEE Topic Tags */}
      <Box sx={{ mb: 1.25, px: 2 }}>
        <Box sx={{ 
          display: 'flex', 
          pt:1.5,
          gap: 1, 
          overflowX: 'auto',
          overflowY: 'hidden',
          whiteSpace: 'nowrap',
          scrollbarWidth: 'none', // Firefox
          msOverflowStyle: 'none', // IE and Edge
          '&::-webkit-scrollbar': { // Chrome, Safari, Opera
            display: 'none'
          },
          pb: 1 // Add padding bottom for hidden scrollbar
        }}>
          {jeeTopics.map((topic, index) => {
            const isSelected = selectedTopic === topic;
            return (
              <Chip
                key={index}
                label={topic}
                size="small"
                clickable
                onClick={() => setSelectedTopic(topic)}
                sx={{
                  backgroundColor: isSelected 
                    ? (theme.palette.mode === 'dark' ? '#1F1F1F' : '#FFFFFF')
                    : 'background.paper',
                  color: isSelected 
                    ? (theme.palette.mode === 'dark' ? '#FFFFFF' : '#1F1F1F')
                    : 'text.secondary',
                  borderRadius: '10px',
                  fontSize: '0.85rem',
                  fontWeight: isSelected ? 600 : 500,
                  flexShrink: 0, // Prevent chips from shrinking
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: isSelected 
                      ? (theme.palette.mode === 'dark' ? '#2A2A2A' : '#F5F5F5')
                      : (theme.palette.mode === 'dark' ? '#2A2A2A' : '#F5F5F5'),
                    borderColor: isSelected ? 'transparent' : (theme.palette.mode === 'dark' ? '#FFFFFF' : '#1F1F1F'),
                  },
                  transition: 'all 0.2s ease',
                }}
              />
            );
          })}
        </Box>
      </Box>

      {/* Chapters by Subject */}
      <ChaptersBySubject 
        darkMode={darkMode}
        metadataList={metadataList}
        chapterSessionsMap={chapterSessionsMap}
      />
    </Box>
  );
};

export default Dashboard; 