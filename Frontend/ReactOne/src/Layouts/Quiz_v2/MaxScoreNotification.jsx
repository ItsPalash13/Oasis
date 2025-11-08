import React from 'react';
import { Box, Typography } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';

const MaxScoreNotification = ({ 
  show, 
  maxScore, 
  onClose 
}) => {
  return (
    <AnimatePresence>
      {show && (
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
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999
          }}
        >
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            p: 2,
            borderRadius: 2,
            backgroundColor: 'rgba(255, 193, 7, 0.95)',
            border: '2px solid #f57c00',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            maxWidth: 280,
            minWidth: 250
          }}>
            <motion.div
              animate={{ 
                y: [0, -10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 0.6,
                repeat: 1,
                repeatType: "reverse"
              }}
              style={{ fontSize: '2rem' }}
            >
              🎉
            </motion.div>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body1" sx={{ 
                fontWeight: 'bold', 
                color: '#f57c00',
                fontSize: '0.9rem',
                mb: 0.5
              }}>
                NEW HIGH SCORE!
              </Typography>
              <Typography variant="body2" sx={{ 
                fontWeight: 'bold', 
                color: '#2e7d32',
                fontSize: '0.8rem'
              }}>
                {maxScore || 0} XP
              </Typography>
            </Box>
          </Box>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MaxScoreNotification;

