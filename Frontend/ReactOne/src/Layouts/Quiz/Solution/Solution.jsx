import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  Divider
} from '@mui/material';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import { BlockMath } from 'react-katex';

const Solution = ({ open, onClose, questionsHistory = [] }) => {
  return (
    <Dialog open={!!open} onClose={onClose} fullWidth maxWidth="md" sx={{
      zIndex:99999
    }}>
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6">Solutions</Typography>
        <IconButton aria-label="close" onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {(!questionsHistory || questionsHistory.length === 0) ? (
          <Typography variant="body2" color="text.secondary">
            No solutions available.
          </Typography>
        ) : (
          <List sx={{ width: '100%' }}>
            {questionsHistory.map((entry, index) => (
              <Box key={index} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Chip label={`Q${index + 1}`} size="small" />
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    {entry.question}
                  </Typography>
                </Box>
                {/* Topics */}
                {Array.isArray(entry.topics) && entry.topics.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                    {entry.topics.map((t, i) => (
                      <Chip key={i} label={t?.topicName || t} size="small" variant="outlined" />
                    ))}
                  </Box>
                )}
                {/* Options */}
                <List dense disablePadding>
                  {(entry.options || []).map((opt, optIdx) => (
                    <ListItem
                      key={optIdx}
                      sx={{
                        py: 0.5,
                        borderLeft: '4px solid',
                        borderColor: (theme) => (
                          entry.correctOption === optIdx
                            ? theme.palette.success.main
                            : (entry.userOptionChoice === optIdx && entry.userOptionChoice !== entry.correctOption)
                              ? theme.palette.error.main
                              : 'transparent'
                        ),
                        backgroundColor: (theme) => (
                          entry.correctOption === optIdx
                            ? (theme.palette.mode === 'dark' ? 'rgba(76, 175, 80, 0.12)' : 'rgba(76, 175, 80, 0.12)')
                            : (entry.userOptionChoice === optIdx && entry.userOptionChoice !== entry.correctOption)
                              ? (theme.palette.mode === 'dark' ? 'rgba(244, 67, 54, 0.12)' : 'rgba(244, 67, 54, 0.12)')
                              : 'transparent'
                        ),
                        borderRadius: 1,
                        px: 1
                      }}
                    >
                      <ListItemText
                        primaryTypographyProps={{
                          variant: 'body2',
                          sx: {
                            fontWeight: (entry.correctOption === optIdx || entry.userOptionChoice === optIdx) ? 'bold' : 'normal',
                            color: (theme) => (
                              entry.correctOption === optIdx
                                ? theme.palette.success.main
                                : (entry.userOptionChoice === optIdx && entry.userOptionChoice !== entry.correctOption)
                                  ? theme.palette.error.main
                                  : 'inherit'
                            )
                          }
                        }}
                        primary={`${String.fromCharCode(65 + optIdx)}. ${opt}`}
                      />
                    </ListItem>
                  ))}
                </List>
                {entry.solution && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Solution</Typography>
                    {/* <Typography variant="body2" color="text.secondary">{entry.solution}</Typography> */}
                    <Box sx={{ 
                      '& .katex-display': {
                        textAlign: 'left !important'
                      },
                      '& .katex-display > .katex': {
                        textAlign: 'left !important'
                      }
                    }}>
                      <Typography variant="body2" color="text.secondary">
                        <BlockMath math={entry.solution} />
                      </Typography>
                    </Box>
                  </Box>
                )}
                <Divider sx={{ mt: 2 }} />
              </Box>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default Solution;

