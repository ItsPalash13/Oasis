import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { Close as CloseIcon } from '@mui/icons-material';
import SOUND_FILES from '../../../assets/sound/soundFiles';

// Bonus notifications that show in top-right like the original streak notification
// props:
// - bonuses: Array<{ type: string, msg: string, currentXp: number }>
// - isVisible: boolean
// - onClose: () => void
const BonusNotifications = ({ bonuses, isVisible, onClose }) => {
  const sanitizedBonuses = useMemo(() => {
    if (!Array.isArray(bonuses)) return [];
    return bonuses.map(b => ({
      type: b.type || 'bonus',
      msg: b.msg || 'Bonus earned!',
      currentXp: typeof b.currentXp === 'number' ? b.currentXp : 0,
    })).filter(b => b.msg && b.type);
  }, [bonuses]);

  const [visibleCount, setVisibleCount] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const prevVisibleRef = useRef(0);

  const getBonusIcon = (type) => {
    switch (type) {
      case 'streak':
        return '🔥';
      case 'bonus':
        return '⚡'; // Lightning bolt for speed bonus
      case 'achievement':
        return '🏆';
      default:
        return '⭐';
    }
  };

  const getBonusColor = (type) => {
    switch (type) {
      case 'streak':
        return '#ffffff'; // White for all text
      case 'bonus':
        return '#ffffff'; // White for all text
      case 'achievement':
        return '#ffffff'; // White for all text
      default:
        return '#ffffff';
    }
  };

  const getBonusBackground = (type) => {
    switch (type) {
      case 'streak':
        return 'rgba(255, 193, 7, 0.95)'; // Orange background for streak
      case 'bonus':
        return 'rgba(255, 152, 0, 0.95)'; // Orange background for speed bonus
      case 'achievement':
        return 'rgba(33, 150, 243, 0.95)'; // Blue background for achievements
      default:
        return 'rgba(255, 235, 59, 0.95)';
    }
  };

  useEffect(() => {
    if (!isVisible || sanitizedBonuses.length === 0) {
      setVisibleCount(0);
      setCurrentIndex(0);
      return;
    }
    
    console.log('Starting bonus notification sequence with', sanitizedBonuses.length, 'bonuses');
    
    // Start showing bonuses one by one
    setVisibleCount(1);
    setCurrentIndex(0);
    
    // Show each bonus with a delay
    const showNextBonus = (index) => {
      if (index < sanitizedBonuses.length) {
        setTimeout(() => {
          console.log('Showing bonus', index + 1, 'of', sanitizedBonuses.length);
          setVisibleCount(index + 1);
          setCurrentIndex(index);
        }, index * 800); // 800ms delay between each bonus
      }
    };
    
    // Start the sequence - show all bonuses one by one
    for (let i = 0; i < sanitizedBonuses.length; i++) {
      showNextBonus(i);
    }
    
    // Auto-hide all bonuses after they've all been shown
    const totalDuration = sanitizedBonuses.length * 800 + 2000; // 2 seconds after last bonus
    console.log('Setting auto-hide timer for', totalDuration, 'ms');
    
    const hideTimer = setTimeout(() => {
      console.log('Auto-hiding bonus notifications');
      onClose();
    }, totalDuration);
    
    return () => {
      console.log('Cleaning up bonus notification timers');
      clearTimeout(hideTimer);
    };
  }, [isVisible, sanitizedBonuses.length]); // Removed onClose from dependencies

  // Play sound when a new bonus becomes visible
  useEffect(() => {
    if (!isVisible) {
      prevVisibleRef.current = 0;
      return;
    }
    if (visibleCount > prevVisibleRef.current && visibleCount > 0) {
      try {
        const audio = new Audio(SOUND_FILES.ACHIEVEMENT);
        audio.play();
      } catch (_) { /* ignore playback errors */ }
      prevVisibleRef.current = visibleCount;
    }
  }, [visibleCount, isVisible]);

  if (!isVisible || sanitizedBonuses.length === 0) return null;

  const totalToRender = Math.min(visibleCount, sanitizedBonuses.length);

  return (
    <Box sx={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 1,
      alignItems: 'flex-end'
    }}>
      {Array.from({ length: totalToRender }, (_, k) => totalToRender - 1 - k).map((renderIdx) => {
        const i = renderIdx;
        const bonus = sanitizedBonuses[i];
        const isCurrent = i === currentIndex;
        const bonusIcon = getBonusIcon(bonus.type);
        const bonusColor = getBonusColor(bonus.type);
        const bonusBackground = getBonusBackground(bonus.type);
        
        return (
          <AnimatePresence key={`${bonus.type}-${i}`}>
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 30,
                duration: 0.5
              }}
            >
                             <Box sx={{
                 display: 'flex',
                 alignItems: 'center',
                 gap: 1.5,
                 p: 1.5,
                 borderRadius: 1.5,
                 backgroundColor: bonusBackground,
                 width: 220,
                 height: 60,
                 position: 'relative'
               }}>
                                 <IconButton
                   size="small"
                   onClick={onClose}
                   sx={{
                     position: 'absolute',
                     top: -6,
                     right: -6,
                     color: bonusBackground,
                     backgroundColor: 'rgba(255,255,255,0.9)',
                     width: 20,
                     height: 20,
                     '&:hover': {
                       backgroundColor: 'rgba(255,255,255,1)',
                     }
                   }}
                 >
                   <CloseIcon sx={{ fontSize: 14 }} />
                 </IconButton>
                                 <motion.div
                   animate={{ 
                     y: [0, -5, 0],
                     scale: [1, 1.05, 1]
                   }}
                   transition={{ 
                     duration: 0.4,
                     repeat: 1,
                     repeatType: "reverse"
                   }}
                   style={{ fontSize: '1.5rem' }}
                 >
                   {bonusIcon}
                 </motion.div>
                                 <Box sx={{ flex: 1 }}>
                   <Typography variant="body2" sx={{ 
                     fontWeight: 'bold', 
                     color: bonusColor,
                     fontSize: '0.75rem',
                     mb: 0.25,
                     textTransform: 'uppercase',
                     letterSpacing: '0.5px'
                   }}>
                     {bonus.type}
                   </Typography>
                   <Typography variant="body2" sx={{ 
                     fontWeight: '500', 
                     color: '#fff',
                     fontSize: '0.7rem',
                     lineHeight: 1.2
                   }}>
                     {bonus.msg}
                   </Typography>
                 </Box>
              </Box>
            </motion.div>
          </AnimatePresence>
        );
      })}
    </Box>
  );
};

export default BonusNotifications;
