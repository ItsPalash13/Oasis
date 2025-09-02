import React, { useMemo, useState } from 'react';
import { Box, Typography, LinearProgress, IconButton, Dialog, DialogTitle, DialogContent, CircularProgress, Skeleton } from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import dayjs from 'dayjs';
import { useGetTopicsAccuracyLatestQuery, useGetTopicsAccuracyHistoryQuery } from '../../features/api/performanceAPI';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { useTheme } from '@mui/material/styles';
import { colors, themeColors } from '../../theme/colors';

// Props: { topicIds: string[], topicIdToName?: Record<string,string>, startDate?: string, endDate?: string, sectionId?: string }
const Topics = ({ topicIds = [], topicIdToName = {}, startDate, endDate, chapterId, sectionId }) => {
  const { data: latestData, isLoading: latestLoading } = useGetTopicsAccuracyLatestQuery({ topicIds, sectionId }, { skip: !topicIds.length && !sectionId });
  const { data: historyData, isLoading: historyLoading } = useGetTopicsAccuracyHistoryQuery({ topicIds, sectionId, startDate, endDate }, { skip: !topicIds.length && !sectionId });

  const [openTopicId, setOpenTopicId] = useState(null);

  const latestMap = useMemo(() => {
    const map = new Map();
    const arr = latestData?.data || [];
    arr.forEach(item => {
      map.set(item.topicId, item.latest?.accuracy ?? null);
    });
    return map;
  }, [latestData]);

  const historyMap = useMemo(() => {
    const map = new Map();
    const arr = historyData?.data || [];
    arr.forEach(item => {
      map.set(item.topicId, item.accuracyHistory || []);
    });
    return map;
  }, [historyData]);

  // Determine which topics to render: only those present in latest response
  const availableTopicIds = useMemo(() => {
    const arr = latestData?.data || [];
    return arr.map(item => item.topicId);
  }, [latestData]);

  const toRender = (topicIds && topicIds.length ? topicIds : availableTopicIds) || [];

  const theme = useTheme();

  const getAccuracyColor = (acc) => {
    if (acc == null) return themeColors.text.secondary(theme);
    if (acc >= 0.75) return colors.success.main;
    if (acc >= 0.5) return colors.warning.main;
    return colors.error.main;
  };

  // Initial list loader when nothing to render yet but latest is loading
  if (latestLoading && toRender.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {[0,1,2].map((i) => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ minWidth: 160 }}>
              <Skeleton variant="text" width={120} height={20} />
            </Box>
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Skeleton variant="rectangular" width="100%" height={8} sx={{ borderRadius: 4 }} />
              <Skeleton variant="text" width={40} height={16} />
            </Box>
            <Skeleton variant="circular" width={28} height={28} />
          </Box>
        ))}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {toRender.map((tid) => {
        const name = topicIdToName[tid] || tid;
        const accuracy = latestMap.get(tid);
        const value = typeof accuracy === 'number' ? Math.round(accuracy * 100) : null;
        return (
          <Box key={tid} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ minWidth: 160 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{name}</Typography>
            </Box>
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <LinearProgress 
                variant={value !== null ? 'determinate' : 'indeterminate'} 
                value={value || 0} 
                sx={{ 
                  width: '100%', 
                  height: 8, 
                  borderRadius: 4,
                  backgroundColor: themeColors.card.border(theme),
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: getAccuracyColor(accuracy)
                  }
                }} 
              />
              <Typography variant="caption" sx={{ minWidth: 40, textAlign: 'right' }}>
                {value !== null ? `${value}%` : (latestLoading ? '...' : 'N/A')}
              </Typography>
            </Box>
            <IconButton aria-label={`history-${tid}`} onClick={() => setOpenTopicId(tid)} size="small">
              <HistoryIcon fontSize="small" />
            </IconButton>
          </Box>
        );
      })}

      <Dialog open={!!openTopicId} onClose={() => setOpenTopicId(null)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton aria-label="back" onClick={() => setOpenTopicId(null)} size="small">
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Accuracy History</Typography>
        </DialogTitle>
        <DialogContent dividers>
          {historyLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={20} />
            </Box>
          ) : (() => {
            const data = (historyMap.get(openTopicId) || [])
              .slice()
              .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
              .map(d => ({ ts: d.timestamp, accuracy: d.accuracy || 0 }));
            if (!data.length) {
              return <Typography variant="caption" color="text.secondary">No history available.</Typography>;
            }
            return (
              <Box sx={{ width: '100%', height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="ts" tickFormatter={(v) => dayjs(v).format('DD/MM/YYYY HH:mm')} minTickGap={24} />
                    <YAxis domain={[0, 1]} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
                    <Tooltip 
                      labelFormatter={(label) => dayjs(label).format('DD/MM/YYYY HH:mm')}
                      formatter={(value, name) => [ `${Math.round((value || 0) * 100)}%`, 'Accuracy' ]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="accuracy" 
                      stroke={themeColors.text.secondary(theme)} 
                      strokeWidth={2} 
                      dot={(props) => {
                        const { cx, cy, payload } = props;
                        const fill = getAccuracyColor(payload?.accuracy);
                        return <circle cx={cx} cy={cy} r={5} fill={fill} stroke="none" />;
                      }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            );
          })()}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default Topics;


