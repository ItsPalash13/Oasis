import React, { useState } from 'react';
import { Box, Tabs, Tab, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import SubjectAdmin from './Subject';
import ChapterAdmin from './Chapter';
import TopicsAdmin from './Topics';
import SectionsAdmin from './Sections';
import UnitsAdmin from './Units';
import QuestionsAdmin from './Questions';
import LevelsAdmin from './Levels';
import UsersAdmin from './Users';
import BadgeAdmin from './Badge';

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function Admin() {
  const [tab, setTab] = useState(0);
  const theme = useTheme();
  const handleChange = (_e, newValue) => setTab(newValue);

  return (
    <Box sx={{ 
      width: '100%', 
      p: 2,
      '& .MuiButton-root': {
        backgroundColor: theme.palette.mode === 'dark' ? '#444' : '#1F1F1F',
        color: theme.palette.mode === 'dark' ? 'white' : 'white',
        border: `1px solid ${theme.palette.mode === 'dark' ? '#666' : '#1F1F1F'}`,
        '&:hover': {
          backgroundColor: theme.palette.mode === 'dark' ? '#555' : '#2A2A2A',
          borderColor: theme.palette.mode === 'dark' ? '#888' : '#2A2A2A',
        },
        '&:disabled': {
          backgroundColor: theme.palette.mode === 'dark' ? '#333' : '#E0E0E0',
          color: theme.palette.mode === 'dark' ? '#666' : '#999',
          borderColor: theme.palette.mode === 'dark' ? '#555' : '#CCC',
        },
        '&.MuiButton-contained': {
          backgroundColor: theme.palette.mode === 'dark' ? '#444' : '#1F1F1F',
          color: theme.palette.mode === 'dark' ? 'white' : 'white',
          '&:hover': {
            backgroundColor: theme.palette.mode === 'dark' ? '#555' : '#2A2A2A',
          },
          '&:disabled': {
            backgroundColor: theme.palette.mode === 'dark' ? '#333' : '#E0E0E0',
            color: theme.palette.mode === 'dark' ? '#666' : '#999',
          }
        },
        '&.MuiButton-outlined': {
          backgroundColor: 'transparent',
          color: theme.palette.mode === 'dark' ? 'white' : '#1F1F1F',
          borderColor: theme.palette.mode === 'dark' ? '#666' : '#1F1F1F',
          '&:hover': {
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(31,31,31,0.1)',
            borderColor: theme.palette.mode === 'dark' ? '#888' : '#2A2A2A',
          },
          '&:disabled': {
            backgroundColor: 'transparent',
            color: theme.palette.mode === 'dark' ? '#666' : '#999',
            borderColor: theme.palette.mode === 'dark' ? '#555' : '#CCC',
          }
        }
      }
    }}>
      <Typography variant="h4" sx={{ mb: 2 }}>Admin Panel</Typography>
      <Tabs value={tab} onChange={handleChange} aria-label="admin tabs">
        <Tab label="Subjects" id="admin-tab-0" aria-controls="admin-tabpanel-0" />
        <Tab label="Chapters" id="admin-tab-1" aria-controls="admin-tabpanel-1" />
        <Tab label="Topics" id="admin-tab-2" aria-controls="admin-tabpanel-2" />
        <Tab label="Sections" id="admin-tab-3" aria-controls="admin-tabpanel-3" />
        <Tab label="Units" id="admin-tab-4" aria-controls="admin-tabpanel-4" />
        <Tab label="Questions" id="admin-tab-5" aria-controls="admin-tabpanel-5" />
        <Tab label="Levels" id="admin-tab-6" aria-controls="admin-tabpanel-6" />
        <Tab label="Users" id="admin-tab-7" aria-controls="admin-tabpanel-7" />
        <Tab label="Badges" id="admin-tab-8" aria-controls="admin-tabpanel-8" />
      </Tabs>
      <TabPanel value={tab} index={0}>
        <SubjectAdmin />
      </TabPanel>
      <TabPanel value={tab} index={1}>
        <ChapterAdmin />
      </TabPanel>
      <TabPanel value={tab} index={2}>
        <TopicsAdmin />
      </TabPanel>
      <TabPanel value={tab} index={3}>
        <SectionsAdmin />
      </TabPanel>
      <TabPanel value={tab} index={4}>
        <UnitsAdmin />
      </TabPanel>
      <TabPanel value={tab} index={5}>
        <QuestionsAdmin />
      </TabPanel>
      <TabPanel value={tab} index={6}>
        <LevelsAdmin />
      </TabPanel>
      <TabPanel value={tab} index={7}>
        <UsersAdmin />
      </TabPanel>
      <TabPanel value={tab} index={8}>
        <BadgeAdmin />
      </TabPanel>
    </Box>
  );
}
