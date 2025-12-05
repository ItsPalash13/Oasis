import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { 
  Box, 
  IconButton, 
  Toolbar, 
  Button,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
  Typography,
} from '@mui/material';
import { 
  Menu as MenuIcon, 
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  AccountCircle as AccountCircleIcon,
  Logout as LogoutIcon,
  Login as LoginIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  Notifications as NotificationsIcon,
  Palette as PaletteIcon,
  Favorite as HealthIcon,
  Star as CoinsIcon,
  Whatshot as StreakIcon,
} from '@mui/icons-material';
import { authClient } from '../lib/auth-client';
import { useDispatch } from 'react-redux';  
import { logout, selectUserHealth, selectUserTotalCoins, selectUserAvatarBgColor } from '../features/auth/authSlice';
import { StyledAppBar, BrandText, navbarStyles } from '../theme/navbarTheme';
import { getAvatarSrc, getDefaultAvatar, getDefaultAvatarBgColor } from '../utils/avatarUtils';
import { colors } from '../theme/colors';

const Navbar = ({ darkMode, onDarkModeToggle, onSidebarToggle, showSidebarToggle = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { data: session } = authClient.useSession();
  const [anchorEl, setAnchorEl] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Get health and totalCoins from Redux store
  const userHealth = useSelector(selectUserHealth);
  const userTotalCoins = useSelector(selectUserTotalCoins);
  const userAvatarBgColor = useSelector(selectUserAvatarBgColor);
  
  // Only show search bar on dashboard
  const showSearchBar = location.pathname === '/dashboard';

  const handleLogout = async () => {
    try {
      handleMenuClose();
      await authClient.revokeSession({
        token: session?.session?.token
      });
      await authClient.signOut();
      dispatch(logout());
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleAvatarClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleProfile = () => {
    navigate('/profile');
    handleMenuClose();
  };

  const handleLogin = () => {
    navigate('/login');
  };

  const handleBrandClick = () => {
    navigate(session ? '/dashboard' : '/');
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    if (searchQuery.trim()) {
      // Implement search functionality here
      console.log('Searching for:', searchQuery);
      // You can add navigation to search results page or API call here
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  // Get avatar source for the user
  const getCurrentAvatarSrc = () => {
    if (session?.user?.avatar) {
      return getAvatarSrc(session.user.avatar);
    }
    return getDefaultAvatar().src;
  };

  // Get avatar background color for the user
  const getCurrentAvatarBgColor = () => {
    return userAvatarBgColor || getDefaultAvatarBgColor();
  };

  return (
    <StyledAppBar position="static" elevation={0}>
      <Toolbar sx={navbarStyles.toolbar}>
        <Box sx={navbarStyles.leftSection}>
          {showSidebarToggle && (
            <IconButton
              edge="start"
              color="inherit"
              aria-label="toggle sidebar"
              onClick={onSidebarToggle}
              sx={navbarStyles.sidebarToggle}
            >
              <MenuIcon />
            </IconButton>
          )}
        </Box>
        
        {/* Search Bar - Only visible on dashboard for now hidding search*/}
        {/*
        {showSearchBar ? (
          <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', px: 2 }}>
            <Box component="form" onSubmit={handleSearchSubmit} sx={navbarStyles.searchBar}>
              <Box
                component="input"
                sx={{
                  ...navbarStyles.searchInput,
                  '&::placeholder': {
                    color: (theme) => theme.palette.mode === 'dark' 
                      ? 'rgba(255, 255, 255, 0.3)' 
                      : 'rgba(0, 0, 0, 0.5)',
                    fontSize: '0.9rem',
                    fontWeight: 400,
                  },
                }}
                placeholder="Search chapters, subjects, or topics..."
                value={searchQuery}
                onChange={handleSearchChange}
              />
              <Box sx={navbarStyles.searchActions}>
                {searchQuery && (
                  <IconButton
                    onClick={handleClearSearch}
                    sx={navbarStyles.clearButton}
                    size="small"
                  >
                    <CloseIcon />
                  </IconButton>
                )}
                <IconButton
                  type="submit"
                  sx={navbarStyles.searchIconButton}
                >
                  <SearchIcon />
                </IconButton>
              </Box>
            </Box>
          </Box>
        ) : (
          <Box sx={{ flexGrow: 1 }} />
        )}
        */}
        <Box sx={navbarStyles.rightSection}>
          {/* Authenticated User Menu */}
          {session ? (
            <>
              {/* Health and XP Display */}
              {/* <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 2 }}>
                <Chip
                  icon={<HealthIcon />}
                  label={`${userHealth}`}
                  size="small"
                  sx={{
                    backgroundColor: userHealth > 0 ? '#FF0808' : '#f44336',
                    color: 'white',
                    fontWeight: 'bold',
                    '& .MuiChip-icon': {
                      color: 'white',
                    }
                  }}
                />
                <Chip
                  icon={<CoinsIcon />}
                  label={`${userTotalCoins} XP`}
                  size="small"
                  sx={{
                    backgroundColor: '#ff9800',
                    color: 'white',
                    fontWeight: 'bold',
                    '& .MuiChip-icon': {
                      color: 'white',
                    }
                  }}
                />
                {session?.user?.dailyAttemptsStreak !== undefined && (
                  <Chip
                    icon={<StreakIcon />}
                    label={`${session.user.dailyAttemptsStreak}`}
                    size="small"
                    sx={{
                      backgroundColor: '#ff5722',
                      color: 'white',
                      fontWeight: 'bold',
                      '& .MuiChip-icon': {
                        color: 'white',
                      }
                    }}
                  />
                )}
              </Box> */}
              
              {/* Notifications Bell 
              <Box sx={{ position: 'relative', mr: 1 }}>
                <IconButton
                  sx={{
                    p: '8px',
                    minWidth: 'auto',
                    minHeight: 'auto',
                    color: 'text.primary',
                  }}
                >
                  <NotificationsIcon fontSize="medium" />
                </IconButton>
                <Box
                  sx={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    backgroundColor: '#6C05FA',
                    color: 'white',
                    borderRadius: '50%',
                    width: 18,
                    height: 18,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                  }}
                >
                  3
                </Box>
              </Box>
              */}
              
              <IconButton
                onClick={handleAvatarClick}
                sx={{ 
                  p: '0 !important', 
                  m: '0 !important',
                  minWidth: '36px !important', 
                  minHeight: '36px !important',
                  width: '36px',
                  height: '36px'
                }}
              >
                <Avatar 
                  src={getCurrentAvatarSrc()}
                  sx={{
                    width: 36,
                    height: 36,
                    background: getCurrentAvatarBgColor(),
                    color: colors.special.white,
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    '&:hover': {
                      background: getCurrentAvatarBgColor(),
                      transform: 'scale(1.05)',
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  {session?.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </Avatar>
              </IconButton>
              
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                onClick={handleMenuClose}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                sx={navbarStyles.menu}
              >
                <MenuItem onClick={handleProfile} sx={navbarStyles.menuItem}>
                  <ListItemIcon>
                    <AccountCircleIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Profile" 
                    secondary={session?.user?.name}
                    secondaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                  />
                </MenuItem>
                <MenuItem onClick={(e) => { e.stopPropagation(); onDarkModeToggle(); }} sx={navbarStyles.menuItem}>
                  <ListItemIcon>
                    {darkMode ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
                  </ListItemIcon>
                  <ListItemText primary={darkMode ? "Light Mode" : "Dark Mode"} />
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleLogout} sx={navbarStyles.logoutMenuItem}>
                  <ListItemIcon>
                    <LogoutIcon fontSize="small" sx={{ color: 'error.main' }} />
                  </ListItemIcon>
                  <ListItemText primary="Logout" />
                </MenuItem>
              </Menu>
            </>
          ) : (
            /* Unauthenticated User Buttons */
            <>
              <IconButton
                onClick={onDarkModeToggle}
                sx={navbarStyles.themeToggle}
                size="small"
              >
                {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
              {location.pathname === '/' && (
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Button
                    onClick={() => navigate('/register')}
                    variant="outlined"
                    size="small"
                    sx={navbarStyles.registerButton}
                  >
                    Sign Up
                  </Button>
                  <Button
                    onClick={handleLogin}
                    variant="contained"
                    startIcon={<LoginIcon />}
                    size="small"
                    sx={navbarStyles.loginButton}
                  >
                    Login
                  </Button>
                </Box>
              )}
            </>
          )}
        </Box>
      </Toolbar>
    </StyledAppBar>
  );
};

export default Navbar; 