import React, { useEffect, useState, useMemo } from 'react';
import { 
  Container, 
  Grid, 
  Typography, 
  Box
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
// @ts-ignore
import { useGetAllMetadataQuery } from '../../features/api/metadataAPI';
// @ts-ignore
import { useGetChapterSessionsQuery } from '../../features/api/userAPI';
// @ts-ignore
import axios from 'axios';
// @ts-ignore
import ChapterCard from '../../components/ChapterCard';

interface Chapter {
  _id: string;
  name: string;
  description: string;
  gameName: string;
  topics: string[];
  status: boolean;
  thumbnailUrl?: string;
}

const Chapters: React.FC = () => {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const navigate = useNavigate();
  const user = useSelector((state: any) => state?.auth?.user);
  
  // Fetch metadata and chapter sessions
  const { data: metadataData } = useGetAllMetadataQuery(undefined, {
    skip: !user
  });
  
  const { data: chapterSessionsData } = useGetChapterSessionsQuery(undefined, {
    skip: !user
  });
  
  const metadataList = metadataData?.data || [];
  
  // Create a map of chapterId -> userRating for quick lookup
  const chapterSessionsMap = useMemo(() => {
    if (!chapterSessionsData?.data) return {};
    const map: { [key: string]: number } = {};
    chapterSessionsData.data.forEach((session: any) => {
      if (session.chapterId) {
        map[session.chapterId.toString()] = session.userRating || 0;
      }
    });
    return map;
  }, [chapterSessionsData]);

  useEffect(() => {
    const fetchChapters = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/chapters`);
        setChapters(response.data.data);
      } catch (error) {
        console.error('Error fetching chapters:', error);
      }
    };

    fetchChapters();
  }, []);

  // @ts-ignore
  const handleChapterClick = (chapterId: string) => {
    navigate(`/chapter/${chapterId}`);
  };

  // New v2 start handler (dummy) moved to ChapterCard.jsx
  // const handleStartQuizV2 = async (_chapterId: string) => { ... }

  return (
    <Box sx={{minHeight: '100vh'}}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Chapters
        </Typography>
        <Grid container spacing={3}>
          {chapters.map((chapter) => {
            const userRating = chapterSessionsMap[chapter._id] || 0;
            return (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={chapter._id}>
                <ChapterCard 
                  chapter={{
                    ...chapter,
                    image: chapter.thumbnailUrl
                  }}
                  userRating={userRating}
                  metadataList={metadataList}
                  // old v1 (at call-site): onClick={() => chapter.status && handleChapterClick(chapter._id)}
                  // new v2 is now handled inside ChapterCard.jsx; no onClick override here
                />
              </Grid>
            );
          })}
        </Grid>
      </Container>
    </Box>
  );
};

export default Chapters;
