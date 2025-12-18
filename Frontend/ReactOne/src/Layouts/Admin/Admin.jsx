import React, { useState } from 'react';
import { Box, Tabs, Tab, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useSelector } from 'react-redux';
import SubjectAdmin from './Subject';
import ChapterAdmin from './Chapter';
import TopicsAdmin from './Topics';
import SectionsAdmin from './Sections';
import UnitsAdmin from './Units';
import QuestionsAdmin from './Questions';
import LevelsAdmin from './Levels';
import UsersAdmin from './Users';
import BadgeAdmin from './Badge';
import OrganizationAdmin from './Organization';
import MiscAdmin from './Misc';

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
  
  // Get user role from Redux store
  const userRole = useSelector((state) => state?.auth?.user?.role || 'student');

  // Get tabs based on user role
  const getTabs = () => {
    const allTabs = [
      { label: 'Subjects', component: 'Subjects' },
      { label: 'Chapters', component: 'Chapters' },
      // { label: 'Topics', component: 'Topics' },
      // { label: 'Sections', component: 'Sections' },
      // { label: 'Units', component: 'Units' },
      { label: 'Questions', component: 'Questions' },
      // { label: 'Levels', component: 'Levels' },
      { label: 'Users', component: 'Users' },
      // { label: 'Badges', component: 'Badges' },
      { label: 'Organizations', component: 'Organizations' },
      { label: 'Misc', component: 'Misc' }
    ];

    let filteredTabs;

    // If role is adminQuestions, show only Questions tab
    if (userRole === 'adminQuestions') {
      filteredTabs = allTabs.filter(tab => tab.label === 'Questions');
    }
    // If role is admin, show all tabs
    else if (userRole === 'admin') {
      filteredTabs = allTabs;
    }
    // Default: show only Questions tab for other admin roles
    else {
      filteredTabs = allTabs.filter(tab => tab.label === 'Questions');
    }

    // Assign sequential indices starting from 0
    return filteredTabs.map((tab, index) => ({
      ...tab,
      index: index
    }));
  };

  const availableTabs = getTabs();

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
        {availableTabs.map((tabItem) => (
          <Tab 
            key={tabItem.label}
            label={tabItem.label} 
            id={`admin-tab-${tabItem.index}`} 
            aria-controls={`admin-tabpanel-${tabItem.index}`} 
          />
        ))}
      </Tabs>
      {availableTabs.map((tabItem) => {
        const components = {
          'Subjects': <SubjectAdmin />,
          'Chapters': <ChapterAdmin />,
          // 'Topics': <TopicsAdmin />,
          // 'Sections': <SectionsAdmin />,
          // 'Units': <UnitsAdmin />,
          'Questions': <QuestionsAdmin />,
          // 'Levels': <LevelsAdmin />,
          'Users': <UsersAdmin />,
          // 'Badges': <BadgeAdmin />,
          'Organizations': <OrganizationAdmin />,
          'Misc': <MiscAdmin />
        };
        
        return (
          <TabPanel key={tabItem.label} value={tab} index={tabItem.index}>
            {components[tabItem.component]}
          </TabPanel>
        );
      })}
    </Box>
  );
}
