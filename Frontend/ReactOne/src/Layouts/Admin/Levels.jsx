import React, { useState, useMemo } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import {
  useGetLevelsQuery,
  useCreateLevelMutation,
  useUpdateLevelMutation,
  useDeleteLevelMutation,
  useGetChaptersQuery,
  useGetAllUnitsQuery,
  useGetSectionsQuery,
  useGetTopicsQuery,
  useGetQuestionsMuByTopicsMutation,
} from '../../features/api/adminAPI';

import { ChartContainer } from '@mui/x-charts/ChartContainer';
import { LinePlot, MarkPlot } from '@mui/x-charts/LineChart';
import { ScatterPlot } from '@mui/x-charts/ScatterChart';
import { ChartsXAxis, ChartsYAxis } from '@mui/x-charts';
import { ChartsTooltip } from '@mui/x-charts/ChartsTooltip';

// Utility functions for skew normal distribution
function erf(x) {
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429;
  const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-x * x);
  return sign * y;
}

function skewNormalPDF(x, mu, sigma, alpha) {
  const z = (x - mu) / sigma;
  const norm = (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * z * z);
  const skew = 1 + erf((alpha * z) / Math.sqrt(2));
  return norm * skew;
}

function generateSkewNormalData(mu, sigma, alpha, points = 100) {
  const data = [];
  const min = mu - 4 * sigma;
  const max = mu + 4 * sigma;
  const step = (max - min) / points;
  for (let i = 0; i <= points; i++) {
    const x = min + i * step;
    data.push({ x, y: skewNormalPDF(x, mu, sigma, alpha) });
  }
  return data;
}

export default function LevelsAdmin() {
  const [openDialog, setOpenDialog] = useState(false);
  const [editingLevel, setEditingLevel] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [selectedChapterFilter, setSelectedChapterFilter] = useState('');
  const [selectedUnitFilter, setSelectedUnitFilter] = useState('');
  const [selectedSectionFilter, setSelectedSectionFilter] = useState('');

  // For question mu scatter
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [muPoints, setMuPoints] = useState([]);
  const [questionsData, setQuestionsData] = useState([]);
  const [getQuestionsMuByTopics, { isLoading: muLoading }] = useGetQuestionsMuByTopicsMutation();

  // API hooks
  const { data: levelsData, isLoading: levelsLoading } = useGetLevelsQuery(
    selectedChapterFilter ? { 
      chapterId: selectedChapterFilter, 
      ...(selectedUnitFilter && selectedUnitFilter !== '' && { unitId: selectedUnitFilter }),
      ...(selectedSectionFilter && selectedSectionFilter !== '' && { sectionId: selectedSectionFilter })
    } : undefined,
    { skip: !selectedChapterFilter }
  );
  const { data: chaptersData } = useGetChaptersQuery();
  const { data: unitsData } = useGetAllUnitsQuery(); // Get all units
  const { data: sectionsData } = useGetSectionsQuery(selectedChapterFilter, { skip: !selectedChapterFilter });
  const { data: topicsData } = useGetTopicsQuery();
  const [createLevel] = useCreateLevelMutation();
  const [updateLevel] = useUpdateLevelMutation();
  const [deleteLevel] = useDeleteLevelMutation();

  // Fetch mu values when selectedTopics changes
  React.useEffect(() => {
    if (selectedTopics.length > 0) {
      getQuestionsMuByTopics(selectedTopics).unwrap().then(res => {
        if (res.success) {
          setQuestionsData(res.data);
          setMuPoints(res.data.map(d => d.mu).filter(mu => mu !== null));
        } else {
          setQuestionsData([]);
          setMuPoints([]);
        }
      }).catch(() => {
        setQuestionsData([]);
        setMuPoints([]);
      });
    } else {
      setQuestionsData([]);
      setMuPoints([]);
    }
  }, [selectedTopics, getQuestionsMuByTopics]);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    levelNumber: '',
    description: '',
    topics: [],
    status: false,
    chapterId: '',
    unitId: '',
    sectionId: '',
    type: 'time_rush',
    timeRush: {
      requiredCorrectQuestions: '',
      totalTime: '',
      totalQuestions: '',
    },
    precisionPath: {
      requiredCorrectQuestions: '',
      totalQuestions: '',
      expectedTime: '',
    },
    difficultyParams: {
      mean: 750,
      sd: 150,
      alpha: 5,
    },
  });

  const handleOpenDialog = (level = null) => {
    if (level) {
      setEditingLevel(level);
      setFormData({
        name: level.name || '',
        levelNumber: level.levelNumber || '',
        description: level.description || '',
        topics: level.topics?.map(t => typeof t === 'string' ? t : t._id) || [],
        status: level.status || false,
        chapterId: level.chapterId?._id || level.chapterId || '',
        unitId: level.unitId?._id || level.unitId || '',
        sectionId: level.sectionId?._id || level.sectionId || '',
        type: level.type || 'time_rush',
        timeRush: level.timeRush || { requiredCorrectQuestions: '', totalTime: '', totalQuestions: '' },
        precisionPath: level.precisionPath || { requiredCorrectQuestions: '', totalQuestions: '', expectedTime: '' },
        difficultyParams: level.difficultyParams || { mean: 750, sd: 150, alpha: 5 },
      });
    } else {
      setEditingLevel(null);
      setFormData({
        name: '',
        levelNumber: '',
        description: '',
        topics: [],
        status: false,
        chapterId: '',
        unitId: '',
        sectionId: '',
        type: 'time_rush',
        timeRush: { requiredCorrectQuestions: '', totalTime: '', totalQuestions: '' },
        precisionPath: { requiredCorrectQuestions: '', totalQuestions: '', expectedTime: '' },
        difficultyParams: { mean: 750, sd: 150, alpha: 5 },
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingLevel(null);
  };

  const handleCloseDetailsDialog = () => {
    setOpenDetailsDialog(false);
    setSelectedLevel(null);
    setSelectedTopics([]);
    setMuPoints([]);
    setQuestionsData([]);
  };

  const handleSubmit = async () => {
    try {
      const submitData = {
        ...formData,
        levelNumber: parseInt(formData.levelNumber),
        topics: formData.topics,
        timeRush: formData.type === 'time_rush' ? {
          requiredCorrectQuestions: parseInt(formData.timeRush.requiredCorrectQuestions),
          totalTime: parseInt(formData.timeRush.totalTime),
          totalQuestions: parseInt(formData.timeRush.totalQuestions),
        } : undefined,
        precisionPath: formData.type === 'precision_path' ? {
          requiredCorrectQuestions: parseInt(formData.precisionPath.requiredCorrectQuestions),
          totalQuestions: parseInt(formData.precisionPath.totalQuestions),
          expectedTime: parseInt(formData.precisionPath.expectedTime),
        } : undefined,
      };

      if (editingLevel) {
        await updateLevel({ id: editingLevel._id, ...submitData }).unwrap();
      } else {
        await createLevel(submitData).unwrap();
      }
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving level:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this level?')) {
      try {
        await deleteLevel(id).unwrap();
      } catch (error) {
        console.error('Error deleting level:', error);
      }
    }
  };

  const handleRowClick = (params) => {
    setSelectedLevel(params.row);
    setOpenDetailsDialog(true);
  };

  const columns = [
    {
      field: 'name',
      headerName: 'Name',
      width: 200,
      renderCell: (params) => (
        <Box sx={{ cursor: 'pointer' }} onClick={() => handleRowClick(params)}>
          {params.value}
        </Box>
      ),
    },
    {
      field: 'levelNumber',
      headerName: 'Level #',
      width: 100,
    },
    {
      field: 'type',
      headerName: 'Type',
      width: 150,
      renderCell: (params) => (
        <Chip
          label={params.value === 'time_rush' ? 'Time Rush' : 'Precision Path'}
          color='secondary'
          size="small"
        />
      ),
    },
    {
      field: 'chapterId',
      headerName: 'Chapter',
      width: 150,
      renderCell: (params) => params.value?.name || 'N/A',
    },
    {
      field: 'unitId',
      headerName: 'Unit',
      width: 150,
      renderCell: (params) => params.value?.name || 'N/A',
    },
    {
      field: 'sectionId',
      headerName: 'Section',
      width: 150,
      renderCell: (params) => params.value?.name || 'N/A',
    },
    {
      field: 'topics',
      headerName: 'Topics',
      width: 200,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {params.value?.map((topic, index) => (
            <Chip key={index} label={typeof topic === 'string' ? topic : topic.topic} size="small" variant="outlined" />
          ))}
        </Box>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Active' : 'Inactive'}
          color={params.value ? 'success' : 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      renderCell: (params) => (
        <Box>
          <Tooltip title="Edit">
            <IconButton onClick={() => handleOpenDialog(params.row)} size="small">
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton onClick={() => handleDelete(params.row._id)} size="small" color="error">
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  const filteredUnits = useMemo(() => {
    if (!formData.chapterId || !unitsData?.data) return [];
    return unitsData.data.filter(unit => unit.chapterId === formData.chapterId);
  }, [formData.chapterId, unitsData]);

  const filteredSections = useMemo(() => {
    if (!formData.chapterId || !sectionsData?.data) return [];
    return sectionsData.data.filter(section => section.chapterId === formData.chapterId);
  }, [formData.chapterId, sectionsData]);

  const filteredUnitsForFilter = useMemo(() => {
    if (!selectedChapterFilter || !unitsData?.data) return [];
    return unitsData.data.filter(unit => unit.chapterId === selectedChapterFilter);
  }, [selectedChapterFilter, unitsData]);

  const filteredSectionsForFilter = useMemo(() => {
    if (!selectedChapterFilter || !sectionsData?.data) return [];
    return sectionsData.data.filter(section => section.chapterId === selectedChapterFilter);
  }, [selectedChapterFilter, sectionsData]);

  // Get topics for the selected unit
  const filteredTopics = useMemo(() => {
    if (!formData.unitId || !topicsData?.data) return [];
    // Find the selected unit to get its topics
    const selectedUnit = unitsData?.data?.find(unit => unit._id === formData.unitId);
    if (!selectedUnit || !selectedUnit.topics) return [];
    
    // Filter topics that belong to the selected unit
    return topicsData.data.filter(topic => 
      selectedUnit.topics.includes(topic._id)
    );
  }, [formData.unitId, topicsData?.data, unitsData?.data]);

  const filteredLevels = useMemo(() => {
    return levelsData?.data || [];
  }, [levelsData?.data]);

  return (
    <Box sx={{ height: 600, width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">Levels Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Level
        </Button>
      </Box>

      {/* Filter Dropdowns */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <FormControl sx={{ minWidth: 200 }} required>
          <InputLabel id="chapter-filter-label">Select Chapter *</InputLabel>
          <Select
            labelId="chapter-filter-label"
            label="Select Chapter *"
            value={selectedChapterFilter}
            onChange={(e) => {
              setSelectedChapterFilter(e.target.value);
              setSelectedUnitFilter(''); // Reset unit filter when chapter changes
              setSelectedSectionFilter(''); // Reset section filter when chapter changes
            }}
          >
            {chaptersData?.data?.map((chapter) => (
              <MenuItem key={chapter._id} value={chapter._id}>
                {chapter.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel id="unit-filter-label">Filter by Unit (Optional)</InputLabel>
          <Select
            labelId="unit-filter-label"
            label="Filter by Unit (Optional)"
            value={selectedUnitFilter}
            onChange={(e) => setSelectedUnitFilter(e.target.value)}
            disabled={!selectedChapterFilter}
          >
            <MenuItem value="">All Units in Chapter</MenuItem>
            {filteredUnitsForFilter.map((unit) => (
              <MenuItem key={unit._id} value={unit._id}>
                {unit.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel id="section-filter-label">Filter by Section (Optional)</InputLabel>
          <Select
            labelId="section-filter-label"
            label="Filter by Section (Optional)"
            value={selectedSectionFilter}
            onChange={(e) => setSelectedSectionFilter(e.target.value)}
            disabled={!selectedChapterFilter}
          >
            <MenuItem value="">All Sections in Chapter</MenuItem>
            {filteredSectionsForFilter.map((section) => (
              <MenuItem key={section._id} value={section._id}>
                {section.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {!selectedChapterFilter && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Please select a chapter to view levels. You can optionally filter by unit and section as well.
        </Alert>
      )}

      {selectedChapterFilter ? (
        <DataGrid
          rows={filteredLevels}
          columns={columns}
          loading={levelsLoading}
          getRowId={(row) => row._id}
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: {
              paginationModel: { page: 0, pageSize: 10 },
            },
          }}
          getRowHeight={() => 'auto'}
          sx={{ height: 500 }}
        />
      ) : (
        <Box sx={{ 
          height: 500, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          border: '1px solid #e0e0e0',
          borderRadius: 1,
          bgcolor: '#fafafa'
        }}>
          <Typography variant="h6" color="text.secondary">
            Select a chapter to view levels
          </Typography>
        </Box>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingLevel ? 'Edit Level' : 'Add New Level'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Level Number"
                type="number"
                value={formData.levelNumber}
                onChange={(e) => setFormData({ ...formData, levelNumber: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Chapter</InputLabel>
                <Select
                  value={formData.chapterId}
                  onChange={(e) => setFormData({ ...formData, chapterId: e.target.value, unitId: '', sectionId: '' })}
                  label="Chapter"
                >
                  {chaptersData?.data?.map((chapter) => (
                    <MenuItem key={chapter._id} value={chapter._id}>
                      {chapter.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Unit</InputLabel>
                <Select
                  value={formData.unitId}
                  onChange={(e) => setFormData({ ...formData, unitId: e.target.value })}
                  label="Unit"
                  disabled={!formData.chapterId}
                >
                  {filteredUnits.map((unit) => (
                    <MenuItem key={unit._id} value={unit._id}>
                      {unit.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Section</InputLabel>
                <Select
                  value={formData.sectionId}
                  onChange={(e) => setFormData({ ...formData, sectionId: e.target.value })}
                  label="Section"
                  disabled={!formData.chapterId}
                >
                  {filteredSections.map((section) => (
                    <MenuItem key={section._id} value={section._id}>
                      {section.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  label="Type"
                >
                  <MenuItem value="time_rush">Time Rush</MenuItem>
                  <MenuItem value="precision_path">Precision Path</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Topics</InputLabel>
                <Select
                  multiple
                  value={formData.topics}
                  onChange={(e) => setFormData({ ...formData, topics: e.target.value })}
                  label="Topics"
                  disabled={!formData.unitId}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((topicId) => {
                        const topic = filteredTopics.find(t => t._id === topicId);
                        return <Chip key={topicId} label={topic?.topic || topicId} size="small" />;
                      })}
                    </Box>
                  )}
                >
                  {filteredTopics.map((topic) => (
                    <MenuItem key={topic._id} value={topic._id}>
                      {topic.topic}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.checked })}
                  />
                }
                label="Active Status"
              />
            </Grid>

            {/* Type-specific fields */}
            {formData.type === 'time_rush' && (
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Time Rush Settings</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={4}>
                        <TextField
                          fullWidth
                          label="Required Correct Questions"
                          type="number"
                          value={formData.timeRush.requiredCorrectQuestions}
                          onChange={(e) => setFormData({
                            ...formData,
                            timeRush: { ...formData.timeRush, requiredCorrectQuestions: e.target.value }
                          })}
                        />
                      </Grid>
                      <Grid item xs={4}>
                        <TextField
                          fullWidth
                          label="Total Time (seconds)"
                          type="number"
                          value={formData.timeRush.totalTime}
                          onChange={(e) => setFormData({
                            ...formData,
                            timeRush: { ...formData.timeRush, totalTime: e.target.value }
                          })}
                        />
                      </Grid>
                      <Grid item xs={4}>
                        <TextField
                          fullWidth
                          label="Total Questions"
                          type="number"
                          value={formData.timeRush.totalQuestions}
                          onChange={(e) => setFormData({
                            ...formData,
                            timeRush: { ...formData.timeRush, totalQuestions: e.target.value }
                          })}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {formData.type === 'precision_path' && (
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Precision Path Settings</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={4}>
                        <TextField
                          fullWidth
                          label="Required Correct Questions"
                          type="number"
                          value={formData.precisionPath.requiredCorrectQuestions}
                          onChange={(e) => setFormData({
                            ...formData,
                            precisionPath: { ...formData.precisionPath, requiredCorrectQuestions: e.target.value }
                          })}
                        />
                      </Grid>
                      <Grid item xs={4}>
                        <TextField
                          fullWidth
                          label="Total Questions"
                          type="number"
                          value={formData.precisionPath.totalQuestions}
                          onChange={(e) => setFormData({
                            ...formData,
                            precisionPath: { ...formData.precisionPath, totalQuestions: e.target.value }
                          })}
                        />
                      </Grid>
                      <Grid item xs={4}>
                        <TextField
                          fullWidth
                          label="Expected Time (seconds)"
                          type="number"
                          value={formData.precisionPath.expectedTime}
                          onChange={(e) => setFormData({
                            ...formData,
                            precisionPath: { ...formData.precisionPath, expectedTime: e.target.value }
                          })}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Difficulty Parameters */}
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>Difficulty Parameters</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <TextField
                        fullWidth
                        label="Mean"
                        type="number"
                        value={formData.difficultyParams.mean}
                        onChange={(e) => setFormData({
                          ...formData,
                          difficultyParams: { ...formData.difficultyParams, mean: parseInt(e.target.value) }
                        })}
                      />
                    </Grid>
                    <Grid item xs={4}>
                      <TextField
                        fullWidth
                        label="Standard Deviation"
                        type="number"
                        value={formData.difficultyParams.sd}
                        onChange={(e) => setFormData({
                          ...formData,
                          difficultyParams: { ...formData.difficultyParams, sd: parseInt(e.target.value) }
                        })}
                      />
                    </Grid>
                    <Grid item xs={4}>
                      <TextField
                        fullWidth
                        label="Alpha"
                        type="number"
                        value={formData.difficultyParams.alpha}
                        onChange={(e) => setFormData({
                          ...formData,
                          difficultyParams: { ...formData.difficultyParams, alpha: parseInt(e.target.value) }
                        })}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingLevel ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={openDetailsDialog} onClose={handleCloseDetailsDialog} maxWidth="md" fullWidth>
        <DialogTitle>Level Details</DialogTitle>
        <DialogContent>
          {selectedLevel && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="h6">{selectedLevel.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Level {selectedLevel.levelNumber} - {selectedLevel.description}
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="subtitle1">Chapter</Typography>
                <Typography>{selectedLevel.chapterId?.name}</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="subtitle1">Unit</Typography>
                <Typography>{selectedLevel.unitId?.name}</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="subtitle1">Section</Typography>
                <Typography>{selectedLevel.sectionId?.name}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle1">Type</Typography>
                <Chip
                  label={selectedLevel.type === 'time_rush' ? 'Time Rush' : 'Precision Path'}
                  color={selectedLevel.type === 'time_rush' ? 'primary' : 'secondary'}
                />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle1">Status</Typography>
                <Chip
                  label={selectedLevel.status ? 'Active' : 'Inactive'}
                  color={selectedLevel.status ? 'success' : 'default'}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1">Topics</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                  {selectedLevel.topics?.map((topic, index) => (
                    <Chip key={index} label={typeof topic === 'string' ? topic : topic.topic} variant="outlined" />
                  ))}
                </Box>
              </Grid>
              {selectedLevel.type === 'time_rush' && selectedLevel.timeRush && (
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6">Time Rush Settings</Typography>
                      <Typography>Required Correct Questions: {selectedLevel.timeRush.requiredCorrectQuestions}</Typography>
                      <Typography>Total Time: {selectedLevel.timeRush.totalTime} seconds</Typography>
                      <Typography>Total Questions: {selectedLevel.timeRush.totalQuestions}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )}
              {selectedLevel.type === 'precision_path' && selectedLevel.precisionPath && (
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6">Precision Path Settings</Typography>
                      <Typography>Required Correct Questions: {selectedLevel.precisionPath.requiredCorrectQuestions}</Typography>
                      <Typography>Total Questions: {selectedLevel.precisionPath.totalQuestions}</Typography>
                      <Typography>Expected Time: {selectedLevel.precisionPath.expectedTime} seconds</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )}
              {selectedLevel.difficultyParams && (
                (() => {
                  // Calculate x-axis domain to include both skewed normal and mu points
                  const skewMin = selectedLevel.difficultyParams.mean - 4 * selectedLevel.difficultyParams.sd;
                  const skewMax = selectedLevel.difficultyParams.mean + 4 * selectedLevel.difficultyParams.sd;
                  const muMin = muPoints.length > 0 ? Math.min(...muPoints) : skewMin;
                  const muMax = muPoints.length > 0 ? Math.max(...muPoints) : skewMax;
                  const xMin = Math.floor(Math.min(skewMin, muMin)) - 20;
                  const xMax = Math.ceil(Math.max(skewMax, muMax)) + 20;

                  // Generate skewed normal data for MUI X Charts
                  const skewedNormalData = generateSkewNormalData(
                    selectedLevel.difficultyParams.mean,
                    selectedLevel.difficultyParams.sd,
                    selectedLevel.difficultyParams.alpha
                  );

                  // Prepare series data for MUI X Charts
                  const series = [
                    {
                      type: 'line',
                      data: skewedNormalData.map(point => point.y),
                      color: '#8884d8',
                      label: 'Skewed Normal Distribution',
                      showMark: false // Remove dots from the line
                    }
                  ];

                  // Add mu points as scatter if available
                  if (muPoints.length > 0) {
                    series.push({
                      type: 'scatter',
                      data: muPoints.map(mu => ({ x: mu, y: 0.001 })), // Small y value to make dots visible
                      color: 'red',
                      label: 'Question μ',
                      markerSize: 4 // Make dots larger
                    });
                  }

                  const xAxis = [
                    {
                      data: skewedNormalData.map(point => point.x),
                      scaleType: 'linear',
                      valueFormatter: (value) => value.toFixed(0),
                      min: xMin,
                      max: xMax
                    }
                  ];
                  return (
                    <>
                      <Grid item xs={12}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="h6">Difficulty Parameters</Typography>
                            <Typography>Mean: {selectedLevel.difficultyParams.mean}</Typography>
                            <Typography>Standard Deviation: {selectedLevel.difficultyParams.sd}</Typography>
                            <Typography>Alpha: {selectedLevel.difficultyParams.alpha}</Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Box sx={{ width: '100%', mt: 3, mb: 2 }}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="h6" gutterBottom>Skewed Normal Distribution Map</Typography>
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="body2">
                                μ = {selectedLevel.difficultyParams.mean}, σ = {selectedLevel.difficultyParams.sd}, α = {selectedLevel.difficultyParams.alpha}
                              </Typography>
                            </Box>
                            <Box sx={{ width: '100%', minWidth: 600, height: 400 }}>
                              <ChartContainer
                                series={series}
                                xAxis={xAxis}
                                height={400}
                                margin={{ left: 60, right: 20, top: 20, bottom: 40 }}
                                slotProps={{
                                  legend: {
                                    hidden: true
                                  }
                                }}
                              >
                                <LinePlot />
                                {muPoints.length > 0 && <ScatterPlot />}
                                <ChartsXAxis label="Score" />
                                <ChartsYAxis label="Density" />
                                <ChartsTooltip 
                                  trigger="axis"
                                  slotProps={{
                                    content: {
                                      sx: {
                                        bgcolor: 'background.paper',
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderRadius: 1,
                                        boxShadow: 2,
                                        p: 1
                                      }
                                    }
                                  }}
                                />
                              </ChartContainer>
                            </Box>
                            {/* Topic selector for mu points */}
                            <Box sx={{ mt: 2 }}>
                              <FormControl fullWidth>
                                <InputLabel>Select Topics to Show Question μ</InputLabel>
                                <Select
                                  multiple
                                  value={selectedTopics}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    // Remove duplicates
                                    const uniqueValues = value.filter((item, index, self) => 
                                      index === self.findIndex(t => t === item)
                                    );
                                    setSelectedTopics(uniqueValues);
                                  }}
                                  label="Select Topics to Show Question μ"
                                  renderValue={(selected) => (
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                      {selected.map((topicId) => {
                                        const topic = selectedLevel.topics?.find(t => t._id === topicId);
                                        return (
                                          <Chip
                                            key={topicId}
                                            label={topic?.topic || 'Unknown Topic'}
                                            size="small"
                                            color="primary"
                                            variant="outlined"
                                          />
                                        );
                                      })}
                                    </Box>
                                  )}
                                >
                                  {selectedLevel.topics?.map((topic) => (
                                    <MenuItem key={topic._id} value={topic._id}>
                                      {topic.topic}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                              {muLoading && <Typography variant="body2">Loading μ values...</Typography>}
                              {/* Debug info */}
                              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                                Available topics: {selectedLevel.topics?.map(t => t.topic).join(', ') || 'None'}
                              </Typography>
                            </Box>
                          </CardContent>
                        </Card>
                      </Box>
                      {/* Questions Display */}
                      {questionsData.length > 0 && (
                        <Box sx={{ mt: 3 }}>
                          <Card variant="outlined">
                            <CardContent>
                              <Typography variant="h6" gutterBottom>
                                Questions for Selected Topics ({questionsData.length} questions)
                              </Typography>
                              <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                                {questionsData.map((question, index) => (
                                                                      <Box key={question.quesId} sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                        <Typography variant="subtitle2" color="primary">
                                          Question {index + 1}
                                        </Typography>
                                        <Chip 
                                          label={`μ = ${question.mu || 'N/A'}`} 
                                          color={question.mu ? 'success' : 'default'}
                                          size="small"
                                        />
                                      </Box>
                                      <Typography variant="body2" sx={{ mb: 1 }}>
                                        {question.ques}
                                      </Typography>
                                      {/* Question Topics */}
                                      {question.topics && question.topics.length > 0 && (
                                        <Box sx={{ mb: 1 }}>
                                          <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                                            Topics:
                                          </Typography>
                                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                            {question.topics.map((topic, topicIndex) => (
                                              <Chip 
                                                key={topicIndex} 
                                                label={typeof topic === 'string' ? topic : (topic.name || topic.id || 'Unknown')} 
                                                size="small" 
                                                variant="outlined"
                                                color="primary"
                                              />
                                            ))}
                                          </Box>
                                        </Box>
                                      )}
                                      <Box sx={{ ml: 2 }}>
                                        {question.options.map((option, optIndex) => (
                                          <Typography 
                                            key={optIndex} 
                                            variant="body2" 
                                            sx={{ 
                                              color: optIndex === question.correct ? 'success.main' : 'text.secondary',
                                              fontWeight: optIndex === question.correct ? 'bold' : 'normal'
                                            }}
                                          >
                                            {String.fromCharCode(65 + optIndex)}. {option}
                                            {optIndex === question.correct && ' ✓'}
                                          </Typography>
                                        ))}
                                      </Box>
                                    </Box>
                                ))}
                              </Box>
                            </CardContent>
                          </Card>
                        </Box>
                      )}
                    </>
                  );
                })()
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetailsDialog}>Close</Button>
        </DialogActions>
      </Dialog>
      {/* Minimal test chart for debugging Scatter */}
      <Box sx={{ width: 400, height: 200, bgcolor: 'white', mt: 2, border: '1px solid black' }}>
        <Typography variant="h6">Test Chart</Typography>
        {/* This box is no longer needed as the chart is now in the Details Dialog */}
      </Box>
    </Box>
  );
}
