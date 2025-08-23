import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  Typography,
  Button,
  TextField,
  Chip,
  Grow,
  Fade,
  Container,
  Grid,
} from '@mui/material';
import { authClient } from '../../lib/auth-client';
import { useUpdateUserInfoMutation } from '../../features/api/userAPI';
import { setSession } from '../../features/auth/authSlice';
import { themeColors, colors } from '../../theme/colors';

const subjects = [
  { key: 'physics', name: 'Physics', icon: '⚛️' },
  { key: 'chemistry', name: 'Chemistry', icon: '🧪' },
  { key: 'math', name: 'Math', icon: '🧮' },
];

const exampleChapters = [
  // Physics Chapters
  'Mechanics',
  'Electromagnetism',
  'Thermodynamics',
  'Optics',
  'Modern Physics',
  'Wave Motion',
  'Electrostatics',
  'Magnetism',
  'Kinematics',
  'Dynamics',
  'Work & Energy',
  'Circular Motion',
  'Gravitation',
  'Fluid Mechanics',
  'Heat & Thermodynamics',
  'Wave Optics',
  'Ray Optics',
  'Nuclear Physics',
  'Semiconductor',
  'Communication',
  
  // Chemistry Chapters
  'Physical Chemistry',
  'Organic Chemistry',
  'Inorganic Chemistry',
  'Chemical Kinetics',
  'Chemical Equilibrium',
  'Thermochemistry',
  'Electrochemistry',
  'Surface Chemistry',
  'Nuclear Chemistry',
  'Coordination Chemistry',
  'Chemical Bonding',
  'Atomic Structure',
  'Periodic Table',
  'Chemical Thermodynamics',
  'Solutions',
  'Colligative Properties',
  'Redox Reactions',
  'Hydrocarbons',
  'Alcohols & Ethers',
  'Carboxylic Acids',
  'Amines',
  'Biomolecules',
  'Polymers',
  
  // Mathematics Chapters
  'Calculus',
  'Algebra',
  'Trigonometry',
  'Geometry',
  'Probability',
  'Statistics',
  'Linear Algebra',
  'Differential Equations',
  'Vector Algebra',
  '3D Geometry',
  'Matrices',
  'Determinants',
  'Complex Numbers',
  'Quadratic Equations',
  'Sequences & Series',
  'Binomial Theorem',
  'Permutations & Combinations',
  'Integration',
  'Differentiation',
  'Applications of Derivatives',
  'Definite Integrals',
  'Area Under Curves',
  'Differential Equations',
  'Vectors',
  '3D Coordinate Geometry',
];

const Onboarding = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { data: session, refetch: refetchSession } = authClient.useSession();
  const user = useSelector((state) => state.auth.user);
  const [updateUserInfo] = useUpdateUserInfoMutation();

  const [step, setStep] = useState(1);
  const [userName, setUserName] = useState('');
  const [strongestSubjects, setStrongestSubjects] = useState([]);
  const [weakestSubject, setWeakestSubject] = useState('');
  const [countUpValues, setCountUpValues] = useState({
    questions: 0,
    topics: 0,
    chapters: 0
  });

  useEffect(() => {
    if (user?.name) {
      setUserName(user.name);
    }
  }, [user]);

  // Countup animation effect
  useEffect(() => {
    if (step === 4) {
      const timer = setTimeout(() => {
        const interval = setInterval(() => {
          setCountUpValues(prev => ({
            questions: Math.min(prev.questions + 5000, 100000),
            topics: Math.min(prev.topics + 250, 5000),
            chapters: Math.min(prev.chapters + 5, 50)
          }));
        }, 50);

        setTimeout(() => clearInterval(interval), 2000);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [step]);

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

  const handleNameSubmit = (e) => {
    e.preventDefault();
    if (userName.trim()) {
        // TODO: Update user name in backend if it was not set
      setStep(2);
    }
  };

  const toggleStrongestSubject = (subjectKey) => {
    setStrongestSubjects((prev) =>
      prev.includes(subjectKey)
        ? prev.filter((s) => s !== subjectKey)
        : [...prev, subjectKey]
    );
  };

  const handleWeakestSubjectSelect = (subjectKey) => {
    setWeakestSubject(subjectKey);
  };

  const handleFinish = async () => {
    console.log('handleFinish called, user:', user);
    console.log('session:', session);
    
    // Try different possible user ID properties
    const userId = user?.id || user?.userId || session?.user?.id || session?.user?.userId;
    
    if (!userId) {
      console.error('No user ID found');
      navigate('/dashboard');
      return;
    }
    
    console.log('Using userId:', userId);
    console.log('Strongest subjects:', strongestSubjects);
    console.log('Weakest subject:', weakestSubject);
    
    try {
      // Prepare update data with onboarding completion and subject preferences
      const updateData = {
        onboardingCompleted: true,
        strongestSubject: strongestSubjects,
        weakestSubject: weakestSubject,
        // Update fullName if it was entered and not already set
        ...(userName.trim() && userName !== user?.name && { fullName: userName.trim() })
      };
      
      console.log('Update data:', updateData);
      
      const result = await updateUserInfo({
        userId: userId,
        data: updateData
      }).unwrap();
      console.log('Update result:', result);
      
      // Refetch session and update Redux
      const refreshed = await refetchSession();
      console.log('Refreshed session:', refreshed);
      
      if (refreshed?.data?.session && refreshed?.data?.user) {
        const serializedSession = serializeDates(refreshed.data.session);
        const serializedUser = serializeDates(refreshed.data.user);
        dispatch(setSession({
          session: serializedSession,
          user: serializedUser
        }));
      }
    } catch (e) {
      console.error('Failed to update onboarding data:', e);
      // Still navigate to dashboard even if update fails
    }
    navigate('/dashboard');
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <Fade in={true}>
            <Box>
              <Typography variant="h2" gutterBottom>
                👋 Welcome, {userName || 'Explorer'}
              </Typography>
              <Typography variant="h5" color="text.secondary" sx={{ mb: 4 }}>
                Let’s get you started on your JEE journey!
              </Typography>
              { !user?.name ? (
                <Box component="form" onSubmit={handleNameSubmit} sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                  <TextField
                    label="What should we call you?"
                    variant="outlined"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    sx={{ width: 300 }}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    sx={{
                      backgroundColor: themeColors.ui.buttonPrimary,
                      color: (theme) =>
                        theme.palette.mode === 'dark'
                          ? colors.ui.dark.textInverse
                          : colors.ui.light.textInverse,
                      '&:hover': {
                        backgroundColor: themeColors.ui.buttonPrimary,
                        filter: 'brightness(0.9)'
                      }
                    }}
                  >
                    Proceed
                  </Button>
                </Box>
              ) : (
                <Button
                  onClick={() => setStep(2)}
                  variant="contained"
                  size="large"
                  sx={{
                    backgroundColor: themeColors.ui.buttonPrimary,
                    color: (theme) =>
                      theme.palette.mode === 'dark'
                        ? colors.ui.dark.textInverse
                        : colors.ui.light.textInverse,
                    '&:hover': {
                      backgroundColor: themeColors.ui.buttonPrimary,
                      filter: 'brightness(0.9)'
                    }
                  }}
                >
                  Let's Go!
                </Button>
              )}
            </Box>
          </Fade>
        );

      case 2:
        return (
          <Fade in={true}>
            <Box>
              <Typography variant="h3" gutterBottom>
                💪 Which subject do you feel most confident in?
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                Pick one or more. This helps us tailor your challenges.
              </Typography>
              <Grid container spacing={2} justifyContent="center">
                {subjects.map((subject) => (
                  <Grid item key={subject.key}>
                    <Chip
                      label={`${subject.icon} ${subject.name}`}
                      clickable
                      onClick={() => toggleStrongestSubject(subject.key)}
                      sx={{ 
                        fontSize: '1.2rem', 
                        padding: '24px 16px', 
                        fontWeight: 'bold', 
                        cursor: 'pointer',
                        backgroundColor: (theme) => 
                          strongestSubjects.includes(subject.key)
                            ? theme.palette.mode === 'dark' 
                              ? '#3B82F6' // Neutral gray background for selected in dark mode
                              : '#3B82F6' // Blue background for selected in light mode
                            : theme.palette.mode === 'dark'
                              ? '#1F2937' // Dark background for unselected in dark mode
                              : '#FFFFFF', // White background for unselected in light mode
                        color: (theme) => 
                          strongestSubjects.includes(subject.key)
                            ? '#FFFFFF' // White text for selected
                            : theme.palette.mode === 'dark'
                              ? '#F9FAFB' // Light text for unselected in dark mode
                              : '#111827', // Dark text for unselected in light mode
                        border: (theme) => 
                          strongestSubjects.includes(subject.key)
                            ? 'none'
                            : theme.palette.mode === 'dark'
                              ? '1px solid #374151' // Dark border for unselected in dark mode
                              : '1px solid #E5E7EB', // Light border for unselected in light mode
                        '&:hover': {
                          backgroundColor: (theme) => 
                            strongestSubjects.includes(subject.key)
                              ? theme.palette.mode === 'dark' 
                                ? '#4B5563' // Lighter neutral gray on hover for selected
                                : '#2563EB'
                              : theme.palette.mode === 'dark'
                                ? '#374151' // Lighter dark background on hover
                                : '#F9FAFB', // Light gray on hover
                        }
                      }}
                    />
                  </Grid>
                ))}
              </Grid>
              <Button
                onClick={() => setStep(3)}
                variant="contained"
                size="large"
                sx={{
                  mt: 4,
                  backgroundColor: themeColors.ui.buttonPrimary,
                  color: (theme) =>
                    theme.palette.mode === 'dark'
                      ? colors.ui.dark.textInverse
                      : colors.ui.light.textInverse,
                  '&:hover': {
                    backgroundColor: themeColors.ui.buttonPrimary,
                    filter: 'brightness(0.9)'
                  }
                }}
              >
                Continue
              </Button>
            </Box>
          </Fade>
        );

      case 3:
        return (
            <Fade in={true}>
            <Box>
              <Typography variant="h3" gutterBottom>
              🤔 Which subject needs the most work?
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                This helps us seed easier questions or hint usage strategy.
              </Typography>
              <Grid container spacing={2} justifyContent="center">
                {subjects.map((subject) => (
                  <Grid item key={subject.key}>
                    <Chip
                      label={`${subject.icon} ${subject.name}`}
                      clickable
                      onClick={() => handleWeakestSubjectSelect(subject.key)}
                      disabled={strongestSubjects.includes(subject.key)}
                      sx={{ 
                        fontSize: '1.2rem', 
                        padding: '24px 16px', 
                        fontWeight: 'bold', 
                        cursor: 'pointer',
                        backgroundColor: (theme) => 
                          weakestSubject === subject.key
                            ? theme.palette.mode === 'dark' 
                              ? '#3B82F6' // Neutral gray background for selected in dark mode
                              : '#3B82F6' // Blue background for selected in light mode
                            : theme.palette.mode === 'dark'
                              ? '#1F2937' // Dark background for unselected in dark mode
                              : '#FFFFFF', // White background for unselected in light mode
                        color: (theme) => 
                          weakestSubject === subject.key
                            ? '#FFFFFF' // White text for selected
                            : theme.palette.mode === 'dark'
                              ? '#F9FAFB' // Light text for unselected in dark mode
                              : '#111827', // Dark text for unselected in light mode
                        border: (theme) => 
                          weakestSubject === subject.key
                            ? 'none'
                            : theme.palette.mode === 'dark'
                              ? '1px solid #374151' // Dark border for unselected in dark mode
                              : '1px solid #E5E7EB', // Light border for unselected in light mode
                        '&:hover': {
                          backgroundColor: (theme) => 
                            weakestSubject === subject.key
                              ? theme.palette.mode === 'dark' 
                                ? '#4B5563' // Lighter neutral gray on hover for selected
                                : '#2563EB'
                              : theme.palette.mode === 'dark'
                                ? '#374151' // Lighter dark background on hover
                                : '#F9FAFB', // Light gray on hover
                        }
                      }}
                    />
                  </Grid>
                ))}
              </Grid>
              <Button
                onClick={() => setStep(4)}
                variant="contained"
                size="large"
                sx={{
                  mt: 4,
                  backgroundColor: themeColors.ui.buttonPrimary,
                  color: (theme) =>
                    theme.palette.mode === 'dark'
                      ? colors.ui.dark.textInverse
                      : colors.ui.light.textInverse,
                  '&:hover': {
                    backgroundColor: themeColors.ui.buttonPrimary,
                    filter: 'brightness(0.9)'
                  }
                }}
                disabled={!weakestSubject}
              >
                Continue
              </Button>
            </Box>
          </Fade>
        );

      case 4:
        return (
            <Fade in={true}>
            <Box>
              <Typography variant="h3" gutterBottom>
              📚 We've got you covered across major chapters like:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 1, my: 4 ,px: 3 }}>
                {exampleChapters.slice(0, 20).map((chapter, index) => (
                   <Grow in={true} style={{ transformOrigin: '0 0 0' }} {...{ timeout: 100 * (index + 1) }}>
                        <Chip 
                          label={chapter} 
                          variant="outlined" 
                          size="small"
                          sx={{ 
                            fontSize: '0.8rem', 
                            padding: '8px 12px',
                            m: 0.5,
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            borderColor: 'rgba(255,255,255,0.2)',
                            color: 'text.primary'
                          }} 
                        />
                   </Grow>
                  ))}
              </Box>
              
              {/* Statistics Section */}
              <Box sx={{ mt: 6, mb: 4 }}>

                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent:"center", gap: 20}}>
                  <Grow in={true} timeout={800}>
                    <Box sx={{ textAlign: 'center', flex: 1, maxWidth: '200px'}}>
                      <Typography variant="h2" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                        {countUpValues.questions.toLocaleString()}+
                      </Typography>
                      <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                        Practice Questions
                      </Typography>
                    </Box>
                  </Grow>
                  
                  <Grow in={true} timeout={1000}>
                    <Box sx={{ textAlign: 'center', flex: 1, maxWidth: '200px'}}>
                      <Typography variant="h2" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                        {countUpValues.topics.toLocaleString()}+
                      </Typography>
                      <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                        Topics Covered
                      </Typography>
                    </Box>
                  </Grow>
                  
                  <Grow in={true} timeout={1200}>
                    <Box sx={{ textAlign: 'center', flex: 1, maxWidth: '200px'}}>
                      <Typography variant="h2" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                        {countUpValues.chapters}+
                      </Typography>
                      <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                        Chapters
                      </Typography>
                    </Box>
                  </Grow>
                </Box>
              </Box>
              
              <Button
                onClick={handleFinish}
                variant="contained"
                size="large"
                sx={{
                  fontSize: '1.2rem',
                  padding: '12px 32px',
                  borderRadius: '25px',
                  fontWeight: 'bold',
                  backgroundColor: themeColors.ui.buttonPrimary,
                  color: (theme) =>
                    theme.palette.mode === 'dark'
                      ? colors.ui.dark.textInverse
                      : colors.ui.light.textInverse,
                  '&:hover': {
                    backgroundColor: themeColors.ui.buttonPrimary,
                    filter: 'brightness(0.9)'
                  }
                }}
              >
                🚀 Get Started!
              </Button>
            </Box>
          </Fade>
        );
      default:
        return null;
    }
  };

  return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: themeColors.background.main,
          minHeight: 'calc(100vh - 64px)', // Adjust for navbar height
          textAlign: 'center',
        }}
      >
        {renderStepContent()}
      </Box>
  );
};

export default Onboarding;

