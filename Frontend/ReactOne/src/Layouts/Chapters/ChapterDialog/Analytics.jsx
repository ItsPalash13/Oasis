import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Box, Typography, useTheme } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { colors } from '../../../theme/colors';

const Analytics = ({ chapter }) => {
  const theme = useTheme();

  // Get actual color values from theme - using neutral colors
  const textSecondary = theme.palette.mode === 'dark' ? colors.ui.dark.textSecondary : colors.ui.light.textSecondary;
  const textPrimary = theme.palette.mode === 'dark' ? colors.ui.dark.textPrimary : colors.ui.light.textPrimary;
  const cardBackground = theme.palette.mode === 'dark' ? colors.ui.dark.cardBackground : colors.ui.light.cardBackground;
  const cardBorder = theme.palette.mode === 'dark' ? colors.ui.dark.cardBorder : colors.ui.light.cardBorder;
  // Use neutral gray for chart line instead of blue
  const chartLineColor = theme.palette.mode === 'dark' 
    ? colors.text.dark.primary  // White/gray for dark mode
    : colors.text.light.primary; // Dark gray for light mode

  // Get chapter sessions from Redux (already fetched in Dashboard)
  const chapterSessionsFull = useSelector((state) => state?.metadata?.chapterSessionsFull || []);

  // Find the chapter session for this chapter
  const currentChapterSession = useMemo(() => {
    if (!chapter?._id || !chapterSessionsFull.length) return null;
    const session = chapterSessionsFull.find((session) =>
      session.chapterId && session.chapterId.toString() === chapter._id.toString()
    );
    return session;
  }, [chapter?._id, chapterSessionsFull]);

  // Format data for chart from Redux data
  const chartData = useMemo(() => {
    const userAttemptWindowList = currentChapterSession?.analytics?.userAttemptWindowList;

    if (!userAttemptWindowList || userAttemptWindowList.length === 0) {
      return [];
    }

    return userAttemptWindowList
      .filter(entry => entry && entry.timestamp && typeof entry.averageAccuracy === 'number')
      .map((entry, index) => ({
        index: index + 1,
        accuracy: Number(entry.averageAccuracy.toFixed(2)),
        timestamp: new Date(entry.timestamp).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        fullTimestamp: new Date(entry.timestamp)
      }))
      .sort((a, b) => a.fullTimestamp - b.fullTimestamp);
  }, [currentChapterSession]);

  return (
    <Box>
      {/* Accuracy Graph */}
      {chartData.length > 0 && (
        <Box>
          <Typography
            variant="h6"
            sx={{
              mb: 2,
              fontWeight: 600,
              textAlign: 'center',
              color: textPrimary,
            }}
          >
            Average Accuracy Over Time
          </Typography>
          <Box sx={{ width: '100%', height: 350 }}>
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={textSecondary} opacity={0.3} />
                <XAxis
                  dataKey="timestamp"
                  stroke={textSecondary}
                  style={{ fontSize: '0.75rem' }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  domain={[0, 100]}
                  stroke={textSecondary}
                  label={{
                    value: 'Accuracy (%)',
                    angle: -90,
                    position: 'insideLeft',
                    style: { fill: textSecondary }
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: cardBackground,
                    border: `1px solid ${cardBorder}`,
                    borderRadius: '8px',
                    color: textPrimary,
                  }}
                  formatter={(value) => [`${value}%`, 'Accuracy']}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="accuracy"
                  stroke={chartLineColor}
                  strokeWidth={2}
                  dot={{ fill: chartLineColor, r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Average Accuracy (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </Box>
      )}

      {chartData.length === 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 200 }}>
          <Typography
            variant="body2"
            sx={{
              textAlign: 'center',
              color: textSecondary,
              fontStyle: 'italic',
            }}
          >
            No accuracy data available yet. Start taking quizzes to see your progress!
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default Analytics;

