import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  IconButton,
  Collapse,
  Tooltip,
  Drawer,
  Backdrop,
} from '@mui/material';
import {
  Home as HomeIcon,
  Quiz as QuizIcon,
  MenuBook as ChaptersIcon,
  Assessment as ReportsIcon,
  Settings as SettingsIcon,
  ChevronLeft as ChevronLeftIcon,
  Menu as MenuIcon,
  LibraryBooks as LibraryBooksIcon,
} from '@mui/icons-material';
import { 
  StyledDrawer, 
  DrawerHeader, 
  StyledListItemButton, 
  BrandText, 
  sidebarStyles 
} from '../theme/sidebarTheme';
import { useSelector } from 'react-redux';

const Sidebar = ({ open, onToggle, devicePixelRatio }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get user role from Redux store
  const userRole = useSelector((state) => state?.auth?.user?.role || 'student');

  const handleNavigation = (path) => {
    navigate(path);
  };

  // Filter navigation items based on user role
  const getNavigationItems = () => {
    const baseItems = [
      { text: 'Dashboard', icon: <HomeIcon fontSize="small" />, path: '/dashboard' },
    ];

    // Show Admin link for users with admin prefix (admin or adminQuestions)
    if (userRole && userRole.startsWith('admin')) {
      baseItems.push({ text: 'Admin', icon: <SettingsIcon fontSize="small" />, path: '/admin' });
    }

    // Show Quiz Bank for teachers
    if (userRole === 'teacher') {
      baseItems.push({ text: 'Question Bank', icon: <QuizIcon fontSize="small" />, path: '/quesbank' });
      baseItems.push({ text: 'Tests', icon: <LibraryBooksIcon fontSize="small" />, path: '/tests' });
    }

    return baseItems;
  };

  // Render sidebar content
  const renderSidebarContent = () => (
    <>
      <DrawerHeader>
        <Typography 
          variant="caption" 
          sx={{ 
            fontWeight: 700, 
            fontSize: '0.7rem',
            color: 'primary.main',
            letterSpacing: '0.1em'
          }}
        >
          BETA
        </Typography>
      </DrawerHeader>

      <List sx={sidebarStyles.listContainer}>
        {getNavigationItems().map((item) => {
          const isSelected = location.pathname === item.path;
          return (
            <ListItem key={item.text} disablePadding sx={{ px: 0 }}>
              <Tooltip 
                title={item.text} 
                placement="right"
                arrow
              >
                <StyledListItemButton
                  selected={isSelected}
                  onClick={() => handleNavigation(item.path)}
                  sx={{ width: '100%' }}
                >
                  <ListItemIcon
                    sx={{
                      ...sidebarStyles.listItemIcon,
                      mr: 'auto',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                </StyledListItemButton>
              </Tooltip>
            </ListItem>
          );
        })}
      </List>
    </>
  );

  return (
    <StyledDrawer variant="permanent" open={false}>
      {renderSidebarContent()}
    </StyledDrawer>
  );
};

export default Sidebar; 