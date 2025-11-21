import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { authClient } from './lib/auth-client';
import { useDispatch, useSelector } from 'react-redux';
import { setSession } from './features/auth/authSlice';
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, Typography, Container, Paper } from '@mui/material';
import { colors } from './theme/colors';
import Home from './components/Home';
import Login from './Layouts/Auth/Login';
import Register from './Layouts/Auth/Register';
import Dashboard from './Layouts/Dashboard/Dashboard';
import Onboarding from './Layouts/Onboarding/Onboarding';
import Quiz from './Layouts/Quiz/Quiz';
import Chapters from './Layouts/Chapters/Chapter';
import Levels from './Layouts/Levels/Levels';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import './App.css';
import Admin from './Layouts/Admin/Admin';
import Profile from './Layouts/Profile/Profile';
import TempResults from './Layouts/Temp/TempResults';
import TempMath from './Layouts/Temp/TempMath';
import QuizV2 from './Layouts/Quiz_v2/Quiz';
import QuizV3 from './Layouts/Quiz_v3/Quiz';

// Create socket instance outside component
export const socket = io(import.meta.env.VITE_BACKEND_URL, {
  withCredentials: true,
  autoConnect: false // Prevent auto-connection
});

// Screen size constants
const MIN_SCREEN_WIDTH = 1024; // Minimum width for desktop (1024px = tablet landscape and above)

// localStorage keys
const STORAGE_KEYS = {
  DARK_MODE: 'projectx_dark_mode',
  SIDEBAR_OPEN: 'projectx_sidebar_open',
};

// Helper functions for localStorage
const getStorageValue = (key, defaultValue) => {
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.warn(`Error reading localStorage key "${key}":`, error);
    return defaultValue;
  }
};

const setStorageValue = (key, value) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Error setting localStorage key "${key}":`, error);
  }
};

// Desktop only message component
const DesktopOnlyMessage = ({ isDark }) => (
  <Container maxWidth="md" sx={{ py: 8 }}>
    <Paper 
      elevation={3} 
      sx={{ 
        p: 4, 
        textAlign: 'center',
        backgroundColor: isDark ? colors.background.dark.paper : colors.background.light.paper,
        border: isDark 
          ? `1px solid ${colors.border.dark.primary}` 
          : `1px solid ${colors.border.light.primary}`,
      }}
    >
      <Typography 
        variant="h4" 
        component="h1" 
        gutterBottom
        sx={{ 
          color: isDark ? colors.text.dark.primary : colors.text.light.primary,
          fontWeight: 700,
          mb: 2
        }}
      >
        Desktop Only
      </Typography>
      <Typography 
        variant="body1" 
        sx={{ 
          color: isDark ? colors.text.dark.secondary : colors.text.light.secondary,
          mb: 3
        }}
      >
        This application is designed for desktop use only. Please access it from a computer with a screen width of at least {MIN_SCREEN_WIDTH}px.
      </Typography>
      <Typography 
        variant="body2" 
        sx={{ 
          color: isDark ? colors.text.dark.secondary : colors.text.light.secondary,
          opacity: 0.8
        }}
      >
        Current screen width: {window.innerWidth}px
      </Typography>
    </Paper>
  </Container>
);

// Create theme function
const createAppTheme = (isDark) => createTheme({
  palette: {
    mode: isDark ? 'dark' : 'light',
    primary: {
      main: isDark ? colors.text.dark.primary : colors.text.light.primary,
      light: isDark ? colors.text.dark.primary : colors.text.light.primary,
      dark: isDark ? colors.text.dark.primary : colors.text.light.primary,
      contrastText: isDark ? colors.text.dark.inverse || '#FFFFFF' : colors.text.light.inverse || '#FFFFFF',
    },
    secondary: {
      main: isDark ? colors.text.dark.secondary : colors.text.light.secondary,
      light: isDark ? colors.text.dark.secondary : colors.text.light.secondary,
      dark: isDark ? colors.text.dark.secondary : colors.text.light.secondary,
    },
    background: {
      default: isDark ? colors.background.dark.primary : colors.background.light.primary,
      surface: isDark ? colors.background.dark.surface : colors.background.light.surface,
      paper: isDark ? colors.background.dark.paper : colors.background.light.paper,
    },
    text: {
      primary: isDark ? colors.text.dark.primary : colors.text.light.primary,
      secondary: isDark ? colors.text.dark.secondary : colors.text.light.secondary,
    },
    divider: isDark ? colors.border.dark.primary : colors.border.light.primary,
    action: {
      hover: isDark ? colors.overlay.dark.low : colors.overlay.light.low,
      selected: isDark ? colors.overlay.dark.medium : colors.overlay.light.medium,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: isDark 
            ? colors.shadow.dark.medium
            : colors.shadow.light.low,
          border: isDark 
            ? `1px solid ${colors.border.dark.primary}` 
            : `1px solid ${colors.border.light.primary}`,
          background: isDark ? colors.ui.dark.cardBackground : colors.ui.light.cardBackground,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 600,
          boxShadow: 'none',
          transition: 'background-color 0.2s ease-in-out, color 0.2s ease-in-out',
        },
      },
    },
  },
  typography: {
    fontFamily: '"Roboto", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h4: {
      fontWeight: 700,
      fontSize: '1.75rem',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1.1rem',
    },
    body1: {
      fontSize: '0.9rem',
    },
    body2: {
      fontSize: '0.8rem',
    },
  },
});

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

// Quiz wrapper component to force remount on levelId change
const QuizWrapper = ({ socket }) => {
  const { levelId } = useParams();
  return <Quiz key={levelId} socket={socket} />;
};

// Quiz v2 wrapper component to force remount on quizId change
// To revert to old behavior: comment the v2 route below and keep only the v1 route.
const QuizWrapper_v2 = ({ socket }) => {
  const { quizId } = useParams();
  return <QuizV2 key={quizId} socket={socket} />;
};

// Quiz v3 wrapper component to force remount on quizId change
const QuizWrapper_v3 = ({ socket }) => {
  const { quizId } = useParams();
  return <QuizV3 key={quizId} socket={socket} />;
};

function AppContent() {
  const location = useLocation();
  const dispatch = useDispatch();
  const { data: session, isLoading } = authClient.useSession();
  const [darkMode, setDarkMode] = useState(() => 
    getStorageValue(STORAGE_KEYS.DARK_MODE, false)
  );
  const [sidebarOpen, setSidebarOpen] = useState(() => 
    getStorageValue(STORAGE_KEYS.SIDEBAR_OPEN, true)
  );
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  
  // Device pixel ratio state for zoom level tracking
  // const [devicePixelRatio, setDevicePixelRatio] = useState(window.devicePixelRatio);

  const theme = createAppTheme(darkMode);
  const isAuthenticated = !!session?.session;
  const isDesktop = screenWidth >= MIN_SCREEN_WIDTH;

  const handleDarkModeToggle = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    setStorageValue(STORAGE_KEYS.DARK_MODE, newDarkMode);
  };

  const handleSidebarToggle = () => {
    const newSidebarOpen = !sidebarOpen;
    setSidebarOpen(newSidebarOpen);
    setStorageValue(STORAGE_KEYS.SIDEBAR_OPEN, newSidebarOpen);
  };

  // Track device pixel ratio changes (zoom level changes)
  // useEffect(() => {
  //   const updateDevicePixelRatio = () => {
  //     const newRatio = window.devicePixelRatio;
  //     setDevicePixelRatio(newRatio);
  //     
  //     // At 90% zoom (approximately 0.9 ratio), if collapsed, set to expanded
  //     if (Math.round(newRatio * 100) === 90 && !sidebarOpen) {
  //       setSidebarOpen(true);
  //       setStorageValue(STORAGE_KEYS.SIDEBAR_OPEN, true);
  //     }
  //   };

  //   // Listen for resize events (which occur when zooming)
  //   window.addEventListener('resize', updateDevicePixelRatio);
  //   
  //   // Also listen for orientation changes on mobile
  //   window.addEventListener('orientationchange', updateDevicePixelRatio);

  //   // Cleanup event listeners
  //   return () => {
  //     window.removeEventListener('resize', updateDevicePixelRatio);
  //     window.removeEventListener('orientationchange', updateDevicePixelRatio);
  //   };
  // }, [sidebarOpen]);

  // Track screen size changes
  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    console.log('Session data from auth client:', session); // Debug log
    if (session?.session && session?.user) {
      // Serialize dates before dispatching to Redux
      const serializedSession = serializeDates(session.session);
      const serializedUser = serializeDates(session.user);

      console.log('Dispatching to Redux:', { serializedSession, serializedUser }); // Debug log
      dispatch(setSession({
        session: serializedSession,
        user: serializedUser
      }));
    }
  }, [session, dispatch]);

  // Determine if we should show the navbar
  const showNavbar = !location.pathname.startsWith('/quiz');
  
  // Determine if we should show the sidebar
  const showSidebar = isAuthenticated && !['/login', '/register', '/onboarding'].includes(location.pathname) && !location.pathname.startsWith('/quiz');

  // Show desktop-only message if screen is too small
  if (!isDesktop && import.meta.env.MODE !== 'development') {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          minHeight: '100vh', 
          backgroundColor: theme.palette.background.surface,
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <DesktopOnlyMessage isDark={darkMode} />
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: theme.palette.background.surface}}>
        {showNavbar && (
          <Navbar 
            darkMode={darkMode} 
            onDarkModeToggle={handleDarkModeToggle}
          />
        )}
        <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
          {showSidebar && (
            <Sidebar 
              open={sidebarOpen} 
              onToggle={handleSidebarToggle}
              // devicePixelRatio={devicePixelRatio}
            />
          )}
          <Box 
            component="main"
            sx={{ 
              flexGrow: 1, 
              minHeight: 0,
              overflowY: 'auto',
              backgroundColor: 'background.default'
            }}
          >
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/dashboard"
                element={
                  <OnboardingProtectedRoute>
                    <Dashboard darkMode={darkMode} onDarkModeToggle={handleDarkModeToggle} />
                  </OnboardingProtectedRoute>
                }
              />
              <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
              <Route path="/quiz/:levelId" element={<ProtectedRoute><QuizWrapper socket={socket} /></ProtectedRoute>} />
              {/* New Quiz v2 route (dummy). To revert, comment this line. */}
              <Route path="/quiz_v2/:quizId" element={<ProtectedRoute><QuizWrapper_v2 socket={socket} /></ProtectedRoute>} />
              {/* New Quiz v3 route */}
              <Route path="/quiz_v3/:quizId" element={<ProtectedRoute><QuizWrapper_v3 socket={socket} /></ProtectedRoute>} />
              <Route path="/chapters" element={<ProtectedRoute><Chapters /></ProtectedRoute>} />
              <Route path="/chapter/:chapterId" element={<ProtectedRoute><Levels /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/temp/result" element={<TempResults />} />
              <Route path="/temp/math" element={<TempMath />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

function ProtectedRoute({ children }) {
  const { data: session, isLoading } = authClient.useSession();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function OnboardingProtectedRoute({ children }) {
  const { data: session, isLoading } = authClient.useSession();
  const user = useSelector((state) => state.auth.user);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (session && user && !user.onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}


export default App;
