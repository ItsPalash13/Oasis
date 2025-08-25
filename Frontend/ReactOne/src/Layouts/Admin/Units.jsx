import React, { useState } from 'react';
import {
  useGetChaptersQuery,
  useGetTopicsQuery,
  useGetSectionsQuery,
  useCreateUnitMutation,
  useUpdateUnitMutation,
  useDeleteUnitMutation,
  useGetUnitsQuery,
  useGetLevelsByUnitQuery,
} from '../../features/api/adminAPI';
import {
  DataGrid,
  GridActionsCellItem,
} from '@mui/x-data-grid';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Autocomplete,
  Chip,
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

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

const levelColors = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A020F0', '#FF1493', '#228B22', '#B22222'
];
const getColor = (levelNumber) => levelColors[(levelNumber - 1) % levelColors.length];

const emptyForm = { chapterId: '', sectionId: '', name: '', description: '', unitNumber: '', topics: [] };

export default function UnitsAdmin() {
  const { data: chaptersData } = useGetChaptersQuery();
  const [selectedChapter, setSelectedChapter] = useState('');
  const { data: sectionsData } = useGetSectionsQuery(selectedChapter, { skip: !selectedChapter });
  const [selectedSection, setSelectedSection] = useState('');
  const { data: topicsData } = useGetTopicsQuery(selectedSection || selectedChapter, { skip: !selectedChapter });
  const { data: unitsData } = useGetUnitsQuery(selectedSection ? { chapterId: selectedChapter, sectionId: selectedSection } : selectedChapter, { skip: !selectedChapter });
  // You may want to fetch units for the selected chapter if you have a list endpoint
  const [createUnit] = useCreateUnitMutation();
  const [updateUnit] = useUpdateUnitMutation();
  const [deleteUnit] = useDeleteUnitMutation();

  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);

  const [openLevelsDialog, setOpenLevelsDialog] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState(null);

  const handleOpen = () => {
    setForm({ chapterId: selectedChapter, sectionId: selectedSection, name: '', description: '', unitNumber: '', topics: [] });
    setEditMode(false);
    setOpen(true);
  };
  const handleEdit = (row) => {
    setForm({
      chapterId: row.chapterId,
      sectionId: row.sectionId || '',
      name: row.name,
      description: row.description,
      unitNumber: row.unitNumber || '',
      topics: row.topics || [],
    });
    setEditId(row._id);
    setEditMode(true);
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
    setForm(emptyForm);
    setEditId(null);
    setEditMode(false);
  };
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };
  const handleTopicsChange = (event, value) => {
    setForm((prev) => ({ ...prev, topics: value }));
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editMode) {
      await updateUnit({ id: editId, ...form, unitNumber: parseInt(form.unitNumber) });
    } else {
      await createUnit({ ...form, unitNumber: parseInt(form.unitNumber) });
    }
    handleClose();
  };
  const handleDelete = async (id) => {
    if (window.confirm('Delete this unit?')) {
      await deleteUnit(id);
    }
  };

  const handleUnitRowClick = (params) => {
    setSelectedUnitId(params.row._id);
    setOpenLevelsDialog(true);
  };
  const handleCloseLevelsDialog = () => {
    setOpenLevelsDialog(false);
    setSelectedUnitId(null);
  };

  const columns = [
    { field: 'unitNumber', headerName: 'Unit #', width: 100 },
    { field: 'name', headerName: 'Name', flex: 1 },
    { field: 'description', headerName: 'Description', flex: 2 },
    { field: 'sectionId', headerName: 'Section', flex: 1, renderCell: (params) => {
        const sectionIdToName = (sectionsData?.data || []).reduce((acc, s) => { acc[s._id] = s.name; return acc; }, {});
        return sectionIdToName[params.row.sectionId] || params.row.sectionId || '-';
      }
    },
    {
      field: 'topics',
      headerName: 'Topics',
      flex: 2,
      renderCell: (params) => {
        const topicIdToName = (topicsData?.data || []).reduce((acc, t) => {
          acc[t._id] = t.topic;
          return acc;
        }, {});
        const topicNames = Array.isArray(params.row.topics)
          ? params.row.topics.map(id => topicIdToName[id] || id)
          : [];
        return (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {topicNames.map((name, idx) => (
              <Chip key={idx} label={name} size="small" sx={{ mb: 0.5 }} />
            ))}
          </Box>
        );
      },
    },
    {
      field: 'actions',
      type: 'actions',
      getActions: (params) => [
        <GridActionsCellItem icon={<Edit />} label="Edit" onClick={() => handleEdit(params.row)} />,
        <GridActionsCellItem icon={<Delete />} label="Delete" onClick={() => handleDelete(params.row._id)} />,
      ],
    },
  ];

  const { data: levelsByUnitData, isLoading: levelsByUnitLoading } = useGetLevelsByUnitQuery(selectedUnitId, { skip: !selectedUnitId });

  return (
    <Box p={2}>
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel id="chapter-select-label">Chapter</InputLabel>
          <Select
            labelId="chapter-select-label"
            label="Chapter"
            value={selectedChapter}
            onChange={e => setSelectedChapter(e.target.value)}
          >
            {chaptersData?.data?.map((chapter) => (
              <MenuItem key={chapter._id} value={chapter._id}>{chapter.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        {selectedChapter && (
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel id="section-select-label">Section</InputLabel>
            <Select
              labelId="section-select-label"
              label="Section"
              value={selectedSection}
              onChange={e => setSelectedSection(e.target.value)}
            >
              <MenuItem value="">All Sections</MenuItem>
              {sectionsData?.data?.map((section) => (
                <MenuItem key={section._id} value={section._id}>{section.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        <Button variant="contained" startIcon={<Add />} onClick={handleOpen} disabled={!selectedChapter}>
          Add Unit
        </Button>
      </Box>
      <Box height={500}>
        <DataGrid
          rows={unitsData?.data || []}
          columns={columns}
          getRowId={(row) => row._id}
          disableRowSelectionOnClick
          getRowHeight={() => 'auto'}
          onRowClick={handleUnitRowClick}
        />
      </Box>
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{editMode ? 'Edit Unit' : 'Add Unit'}</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 350 }}>
            <FormControl fullWidth required>
              <InputLabel id="chapter-select-label-dialog">Chapter</InputLabel>
              <Select
                labelId="chapter-select-label-dialog"
                label="Chapter"
                name="chapterId"
                value={form.chapterId}
                onChange={handleChange}
              >
                {chaptersData?.data?.map((chapter) => (
                  <MenuItem key={chapter._id} value={chapter._id}>{chapter.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            {form.chapterId && (
              <FormControl fullWidth required>
                <InputLabel id="section-select-label-dialog">Section</InputLabel>
                <Select
                  labelId="section-select-label-dialog"
                  label="Section"
                  name="sectionId"
                  value={form.sectionId}
                  onChange={handleChange}
                >
                  {sectionsData?.data?.map((section) => (
                    <MenuItem key={section._id} value={section._id}>{section.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <TextField 
              label="Unit Number" 
              name="unitNumber" 
              type="number"
              value={form.unitNumber} 
              onChange={handleChange} 
              required 
              fullWidth 
            />
            <TextField
              label="Name"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              fullWidth
            />
            <TextField
              label="Description"
              name="description"
              value={form.description}
              onChange={handleChange}
              required
              fullWidth
            />
            <Autocomplete
              multiple
              options={topicsData?.data?.map(t => ({ label: t.topic, value: t._id })) || []}
              getOptionLabel={option => option.label}
              value={topicsData?.data?.filter(t => form.topics.includes(t._id)).map(t => ({ label: t.topic, value: t._id })) || []}
              onChange={(event, value) => handleTopicsChange(event, value.map(v => v.value))}
              renderInput={(params) => (
                <TextField {...params} label="Topics" placeholder="Select topics" />
              )}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="submit" variant="contained">{editMode ? 'Update' : 'Create'}</Button>
          </DialogActions>
        </form>
      </Dialog>
      <Dialog open={openLevelsDialog} onClose={handleCloseLevelsDialog} maxWidth="lg" fullWidth>
        <DialogTitle>Levels Difficulty Map for Unit</DialogTitle>
        <DialogContent>
          {levelsByUnitLoading ? (
            <Typography>Loading...</Typography>
          ) : levelsByUnitData?.data?.length ? (
            <Box sx={{ width: '100%', minWidth: 700, height: 450 }}>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="x" type="number" domain={['auto', 'auto']} label={{ value: 'Score', position: 'insideBottomRight', offset: -5 }} />
                  <YAxis label={{ value: 'Density', angle: -90, position: 'insideLeft' }} />
                  <RechartsTooltip 
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      return (
                        <Box sx={{ bgcolor: 'background.paper', p: 2, borderRadius: 1, boxShadow: 2 }}>
                          <Typography variant="subtitle2">X : {label}</Typography>
                          {payload.map((entry, idx) => (
                            <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                              <Box sx={{ width: 12, height: 12, bgcolor: entry.color, borderRadius: '50%' }} />
                              <Typography variant="body2">{entry.name}: {entry.value.toFixed(4)}</Typography>
                            </Box>
                          ))}
                        </Box>
                      );
                    }}
                  />
                  <Legend />
                  {levelsByUnitData.data.map((level, idx) => (
                    <Line
                      key={level._id || level.levelNumber || idx}
                      data={generateSkewNormalData(
                        level.difficultyParams.mean,
                        level.difficultyParams.sd,
                        level.difficultyParams.alpha
                      )}
                      dataKey="y"
                      name={`Level ${level.levelNumber}: ${level.name} (μ=${level.difficultyParams.mean}, σ=${level.difficultyParams.sd}, α=${level.difficultyParams.alpha})`}
                      stroke={getColor(level.levelNumber)}
                      dot={false}
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </Box>
          ) : (
            <Typography>No levels found for this unit.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseLevelsDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
