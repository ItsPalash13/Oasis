import React, { useMemo, useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select, TextField, Chip, Autocomplete } from '@mui/material';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import { Add, Edit, Delete } from '@mui/icons-material';
import { 
  useGetChaptersQuery,
  useGetTopicsQuery,
  useGetSectionsQuery,
  useCreateSectionMutation,
  useUpdateSectionMutation,
  useDeleteSectionMutation,
} from '../../features/api/adminAPI';

const emptyForm = { chapterId: '', name: '', description: '', sectionNumber: '', topics: [] };

export default function SectionsAdmin() {
  const { data: chaptersData } = useGetChaptersQuery();
  const [selectedChapter, setSelectedChapter] = useState('');
  const { data: sectionsData } = useGetSectionsQuery(selectedChapter, { skip: !selectedChapter });
  const { data: topicsData } = useGetTopicsQuery(selectedChapter, { skip: !selectedChapter });
  const [createSection] = useCreateSectionMutation();
  const [updateSection] = useUpdateSectionMutation();
  const [deleteSection] = useDeleteSectionMutation();

  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);

  const handleOpen = () => {
    setForm({ chapterId: selectedChapter, name: '', description: '', sectionNumber: '', topics: [] });
    setEditMode(false);
    setOpen(true);
  };
  const handleEdit = (row) => {
    setForm({ chapterId: row.chapterId, name: row.name, description: row.description, sectionNumber: row.sectionNumber || '', topics: row.topics || [] });
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
  const handleTopicsChange = (_event, value) => {
    setForm((prev) => ({ ...prev, topics: value }));
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editMode) {
      await updateSection({ id: editId, ...form, sectionNumber: parseInt(form.sectionNumber) });
    } else {
      await createSection({ ...form, sectionNumber: parseInt(form.sectionNumber) });
    }
    handleClose();
  };
  const handleDelete = async (id) => {
    if (window.confirm('Delete this section?')) {
      await deleteSection(id);
    }
  };

  const columns = useMemo(() => [
    { field: 'sectionNumber', headerName: 'Section #', width: 100 },
    { field: 'name', headerName: 'Name', flex: 1 },
    { field: 'description', headerName: 'Description', flex: 2 },
    {
      field: 'topics',
      headerName: 'Topics',
      flex: 2,
      renderCell: (params) => {
        const topicIdToName = (topicsData?.data || []).reduce((acc, t) => { acc[t._id] = t.topic; return acc; }, {});
        const topicNames = Array.isArray(params.row.topics) ? params.row.topics.map(id => topicIdToName[id] || id) : [];
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
  ], [topicsData]);

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
        <Button variant="contained" startIcon={<Add />} onClick={handleOpen} disabled={!selectedChapter}>
          Add Section
        </Button>
      </Box>
      <Box height={500}>
        <DataGrid
          rows={sectionsData?.data || []}
          columns={columns}
          getRowId={(row) => row._id}
          disableRowSelectionOnClick
          getRowHeight={() => 'auto'}
        />
      </Box>
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{editMode ? 'Edit Section' : 'Add Section'}</DialogTitle>
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
            <TextField 
              label="Section Number" 
              name="sectionNumber" 
              type="number"
              value={form.sectionNumber} 
              onChange={handleChange} 
              required 
              fullWidth 
            />
            <TextField label="Name" name="name" value={form.name} onChange={handleChange} required fullWidth />
            <TextField label="Description" name="description" value={form.description} onChange={handleChange} required fullWidth />
            <Autocomplete
              multiple
              options={topicsData?.data?.map(t => ({ label: t.topic, value: t._id })) || []}
              getOptionLabel={option => option.label}
              value={topicsData?.data?.filter(t => form.topics.includes(t._id)).map(t => ({ label: t.topic, value: t._id })) || []}
              onChange={(_event, value) => handleTopicsChange(_event, value.map(v => v.value))}
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
    </Box>
  );
}

