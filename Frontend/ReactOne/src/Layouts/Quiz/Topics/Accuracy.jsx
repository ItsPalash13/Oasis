import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Card, CardContent, IconButton, LinearProgress, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { colors, themeColors } from '../../../theme/colors';
import { Close as CloseIcon } from '@mui/icons-material';
import SOUND_FILES from '../../../assets/sound/soundFiles';

// Snackbars that show stacked, one over another, for topic accuracy changes
// props:
// - topics: Array<{ topicId, topicName, previousAcc, updatedAcc }>
// - isVisible: boolean
// - onClose: () => void
// - bottomOffset?: number (px)
const AccuracySnackbars = ({ topics, isVisible, onClose, bottomOffset = 20 }) => {
  const sanitizedTopics = useMemo(() => {
    if (!Array.isArray(topics)) return [];
    return topics.map(t => ({
      topicId: t.topicId,
      topicName: t.topicName || 'Topic',
      previousAcc: typeof t.previousAcc === 'number' ? t.previousAcc : (typeof t.previousAccuracy === 'number' ? t.previousAccuracy : 0),
      updatedAcc: typeof t.updatedAcc === 'number' ? t.updatedAcc : (typeof t.updatedAccuracy === 'number' ? t.updatedAccuracy : 0),
    })).filter(t => Number.isFinite(t.previousAcc) && Number.isFinite(t.updatedAcc));
  }, [topics]);

  const theme = useTheme();
  const getAccuracyColor = (acc) => {
    if (acc == null) return themeColors.text.secondary(theme);
    if (acc >= 0.75) return colors.success.main;
    if (acc >= 0.5) return colors.warning.main;
    return colors.error.main;
  };

  const [fromValues, setFromValues] = useState([]);
  const [toValues, setToValues] = useState([]);
  const [progressValues, setProgressValues] = useState([]);
  const [running, setRunning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0); // which snackbar is currently animating
  const [visibleCount, setVisibleCount] = useState(0); // how many snackbars are currently shown (stacked)
  const rafRef = useRef(null);
  const prevVisibleRef = useRef(0);

  const durationMs = 1500; // animate over 1.5s
  // Simple scrolling container – no hover behavior

  useEffect(() => {
    if (!isVisible || sanitizedTopics.length === 0) return;
    const from = sanitizedTopics.map(t => Math.max(0, Math.min(1, t.previousAcc || 0)) * 100);
    const to = sanitizedTopics.map(t => Math.max(0, Math.min(1, t.updatedAcc || 0)) * 100);
    setFromValues(from);
    setToValues(to);
    setProgressValues(from);
    setCurrentIndex(0);
    setVisibleCount(1); // show the first snackbar
    setRunning(true);
  }, [isVisible, sanitizedTopics.length]);

  useEffect(() => {
    if (!isVisible || sanitizedTopics.length === 0) return;
    if (!running) return;

    let startTime = null;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const t = Math.min(1, elapsed / durationMs);
      const value = fromValues[currentIndex] + (toValues[currentIndex] - fromValues[currentIndex]) * t;
      setProgressValues(prev => {
        const next = [...prev];
        next[currentIndex] = value;
        return next;
      });
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        // Snap this bar to its final value to avoid any rounding artifacts
        setProgressValues(prev => {
          const next = [...prev];
          next[currentIndex] = toValues[currentIndex];
          return next;
        });
        setRunning(false);
        // After finishing this animation, reveal the next snackbar (if any) and start its animation
        setTimeout(() => {
          setVisibleCount(prev => Math.min(prev + 1, sanitizedTopics.length));
          setCurrentIndex(prev => {
            const nextIndex = prev + 1;
            if (nextIndex < sanitizedTopics.length) {
              setRunning(true);
            }
            return nextIndex;
          });
        }, 250);
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [isVisible, sanitizedTopics, fromValues, toValues, running, currentIndex]);

  // Do not auto-close to prevent unexpected disappearance; rely on close button
  // Ensure values remain after animations are done
  useEffect(() => {
    if (!isVisible) return;
    // When we've revealed all and are not running, snap all to final values
    if (!running && visibleCount >= sanitizedTopics.length && sanitizedTopics.length > 0) {
      setProgressValues(toValues);
    }
  }, [isVisible, running, visibleCount, sanitizedTopics.length, toValues]);

  // Play sound when a new snackbar becomes visible
  useEffect(() => {
    if (!isVisible) {
      prevVisibleRef.current = 0;
      return;
    }
    if (visibleCount > prevVisibleRef.current && visibleCount > 0) {
      try {
        const audio = new Audio(SOUND_FILES.LEVEL_TOPIC_PERFORMANCE);
        audio.play();
      } catch (_) { /* ignore playback errors */ }
      prevVisibleRef.current = visibleCount;
    }
  }, [visibleCount, isVisible]);

  if (!isVisible || sanitizedTopics.length === 0) return null;

  const totalToRender = Math.min(visibleCount, sanitizedTopics.length);

  return (
    <Box sx={{
      position: 'fixed',
      right: 20,
      bottom: bottomOffset,
      zIndex: 10000,
      pointerEvents: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 1,
      alignItems: 'flex-end',
      maxHeight: '60vh',
      overflowY: 'hidden',
      scrollbarWidth: 'none',
      '&::-webkit-scrollbar': { width: 0, height: 0 },
      
      '&:hover': {
        overflowY: 'auto',
        scrollbarWidth: 'thin',
        '&::-webkit-scrollbar': { width: '6px', height: 0 },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.18)',
          borderRadius: 8
        },
        '&::-webkit-scrollbar-track': {
          backgroundColor: 'transparent'
        }
      }
    }}>
      {Array.from({ length: totalToRender }, (_, k) => totalToRender - 1 - k).map((renderIdx) => {
        const i = renderIdx;
        const prevPercent = Math.round((fromValues[i] ?? 0));
        const newPercent = Math.round((toValues[i] ?? 0));
        const isIncrease = (toValues[i] ?? 0) >= (fromValues[i] ?? 0);
        const value = Math.max(0, Math.min(100, progressValues[i] ?? 0));
        const topic = sanitizedTopics[i];
        // Color transition by bucket: current animating item uses live progress bucket color,
        // completed items use target bucket color, upcoming items use start bucket color
        const isCurrent = i === currentIndex;
        const isDone = i < currentIndex;
        const liveAcc = (progressValues[i] ?? fromValues[i] ?? 0) / 100;
        const startAcc = (fromValues[i] ?? 0) / 100;
        const targetAcc = (toValues[i] ?? 0) / 100;
        const barColor = getAccuracyColor(isCurrent ? liveAcc : (isDone ? targetAcc : startAcc));
        return (
          <Card key={topic.topicId} elevation={0} sx={{
            width: 320,
            maxWidth: '90vw',
            backgroundColor: 'transparent',
            backdropFilter: 'none',
            border: 'none',
            flex: '0 0 auto' // prevent shrinking so scrollbars appear when container maxHeight is reduced
          }}>
            <CardContent sx={{ p: 0, position: 'relative' }}>
              <IconButton
                size="small"
                onClick={onClose}
                sx={{ position: 'absolute', top: -8, right: -8, color: 'inherit' }}
              >

              </IconButton>
              <Box sx={{
                p: 1.5,
                borderRadius: 2,
                height: 76,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                backgroundColor: theme => theme.palette.mode === 'dark'
                  ? 'rgba(0,0,0,0.4)'
                  : 'rgba(255,255,255)',
                backdropFilter: 'blur(6px)',
                
              }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {topic.topicName}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  
                  <Box sx={{ flex: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={value}
                      sx={{
                        height: 8,
                        borderRadius: 8,
                        '& .MuiLinearProgress-bar': {
                          transition: 'transform 120ms linear, background-color 200ms linear',
                          backgroundColor: barColor
                        },
                        backgroundColor: theme => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'
                      }}
                    />
                  </Box>
                  <Typography variant="caption" sx={{ minWidth: 32, textAlign: 'right' }}>{Math.round(value)}%</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
};

export default AccuracySnackbars;


