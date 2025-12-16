import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  Snackbar,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Save as SaveIcon, Download as DownloadIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import dummyUsersData from '../../data/dummyUsers.json';

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`misc-tabpanel-${index}`}
      aria-labelledby={`misc-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function MiscAdmin() {
  const [tab, setTab] = useState(0);
  const [data, setData] = useState(dummyUsersData);
  const [editingUser, setEditingUser] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    userId: '',
    fullName: '',
    userRating: '',
    avatarBgColor: '',
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [openChapterDialog, setOpenChapterDialog] = useState(false);
  const [newChapterId, setNewChapterId] = useState('');

  // Load data from localStorage on mount, or use default
  useEffect(() => {
    const savedData = localStorage.getItem('dummyUsersData');
    if (savedData) {
      try {
        setData(JSON.parse(savedData));
      } catch (error) {
        console.error('Error loading saved data:', error);
      }
    }
  }, []);

  const chapters = Object.keys(data);
  const handleChange = (_e, newValue) => setTab(newValue);

  const handleOpenDialog = (chapterId, user = null) => {
    if (user) {
      setFormData({
        userId: user.userId || '',
        fullName: user.fullName || '',
        userRating: user.userRating?.toString() || '',
        avatarBgColor: user.avatarBgColor || '',
      });
      setEditingUser({ chapterId, user });
    } else {
      setFormData({
        userId: '',
        fullName: '',
        userRating: '',
        avatarBgColor: '',
      });
      setEditingUser({ chapterId, user: null });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingUser(null);
    setFormData({
      userId: '',
      fullName: '',
      userRating: '',
      avatarBgColor: '',
    });
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    const { chapterId, user } = editingUser;
    const chapterData = [...(data[chapterId] || [])];

    if (user) {
      // Update existing user
      const index = chapterData.findIndex((u) => u.userId === user.userId);
      if (index !== -1) {
        chapterData[index] = {
          userId: formData.userId,
          fullName: formData.fullName,
          userRating: parseInt(formData.userRating) || 0,
          avatarBgColor: formData.avatarBgColor,
        };
      }
    } else {
      // Add new user
      chapterData.push({
        userId: formData.userId,
        fullName: formData.fullName,
        userRating: parseInt(formData.userRating) || 0,
        avatarBgColor: formData.avatarBgColor,
      });
    }

    // Sort by userRating descending
    chapterData.sort((a, b) => b.userRating - a.userRating);

    const newData = {
      ...data,
      [chapterId]: chapterData,
    };

    setData(newData);
    localStorage.setItem('dummyUsersData', JSON.stringify(newData));
    handleCloseDialog();
    setSnackbar({ open: true, message: user ? 'User updated successfully!' : 'User added successfully!', severity: 'success' });
  };

  const handleDelete = (chapterId, userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      const chapterData = data[chapterId].filter((u) => u.userId !== userId);
      const newData = {
        ...data,
        [chapterId]: chapterData,
      };

      setData(newData);
      localStorage.setItem('dummyUsersData', JSON.stringify(newData));
      setSnackbar({ open: true, message: 'User deleted successfully!', severity: 'success' });
    }
  };

  const handleDownload = () => {
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'dummyUsers.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setSnackbar({ open: true, message: 'JSON file downloaded!', severity: 'success' });
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all changes and reload from the original JSON file?')) {
      localStorage.removeItem('dummyUsersData');
      setData(dummyUsersData);
      setSnackbar({ open: true, message: 'Data reset to original JSON file!', severity: 'success' });
    }
  };

  const handleOpenChapterDialog = () => {
    setNewChapterId('');
    setOpenChapterDialog(true);
  };

  const handleCloseChapterDialog = () => {
    setOpenChapterDialog(false);
    setNewChapterId('');
  };

  const handleAddChapter = () => {
    if (!newChapterId.trim()) {
      setSnackbar({ open: true, message: 'Please enter a chapter ID', severity: 'error' });
      return;
    }

    if (data[newChapterId]) {
      setSnackbar({ open: true, message: 'Chapter ID already exists!', severity: 'error' });
      return;
    }

    // Initialize with default values (copy from default chapter)
    const defaultUsers = data.default ? [...data.default] : [];
    
    const newData = {
      ...data,
      [newChapterId]: defaultUsers,
    };

    setData(newData);
    localStorage.setItem('dummyUsersData', JSON.stringify(newData));
    
    // Switch to the new chapter tab
    const newChapterIndex = Object.keys(newData).indexOf(newChapterId);
    setTab(newChapterIndex);
    
    handleCloseChapterDialog();
    setSnackbar({ open: true, message: `Chapter "${newChapterId}" added successfully with default values!`, severity: 'success' });
  };

  const handleDeleteChapter = (chapterId) => {
    if (chapterId === 'default') {
      setSnackbar({ open: true, message: 'Cannot delete the default chapter!', severity: 'error' });
      return;
    }

    if (window.confirm(`Are you sure you want to delete chapter "${chapterId}"?`)) {
      const newData = { ...data };
      delete newData[chapterId];
      setData(newData);
      localStorage.setItem('dummyUsersData', JSON.stringify(newData));
      
      // Switch to default tab if we deleted the current tab
      const chapters = Object.keys(newData);
      if (chapters.length > 0) {
        setTab(0);
      }
      
      setSnackbar({ open: true, message: `Chapter "${chapterId}" deleted successfully!`, severity: 'success' });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Dummy Users Management</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleOpenChapterDialog}
          >
            Add Chapter
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleReset}
          >
            Reset to Default
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleDownload}
          >
            Download JSON
          </Button>
        </Box>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tab} onChange={handleChange} aria-label="chapter tabs" variant="scrollable" scrollButtons="auto">
          {chapters.map((chapterId, index) => (
            <Tab
              key={chapterId}
              label={chapterId === 'default' ? 'Default' : chapterId}
              id={`misc-tab-${index}`}
              aria-controls={`misc-tabpanel-${index}`}
            />
          ))}
        </Tabs>
      </Box>

      {chapters.map((chapterId, index) => (
        <TabPanel key={chapterId} value={tab} index={index}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6">
                {chapterId === 'default' ? 'Default Chapter' : `Chapter: ${chapterId}`}
              </Typography>
              {chapterId !== 'default' && (
                <IconButton
                  size="small"
                  onClick={() => handleDeleteChapter(chapterId)}
                  color="error"
                  title="Delete Chapter"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog(chapterId)}
            >
              Add User
            </Button>
          </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>User ID</TableCell>
                  <TableCell>Full Name</TableCell>
                  <TableCell>Rating</TableCell>
                  <TableCell>Avatar Color</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data[chapterId]?.map((user, idx) => (
                  <TableRow key={user.userId || idx} hover>
                    <TableCell>{user.userId}</TableCell>
                    <TableCell>{user.fullName}</TableCell>
                    <TableCell>
                      <Chip label={user.userRating} color="primary" size="small" />
                    </TableCell>
                    <TableCell>
                      <Box
                        sx={{
                          width: 30,
                          height: 30,
                          borderRadius: '50%',
                          backgroundColor: user.avatarBgColor,
                          border: '1px solid #ccc',
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(chapterId, user)}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(chapterId, user.userId)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {(!data[chapterId] || data[chapterId].length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No users found. Click "Add User" to create one.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      ))}

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingUser?.user ? 'Edit User' : 'Add New User'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="User ID"
              name="userId"
              value={formData.userId}
              onChange={handleFormChange}
              fullWidth
              required
              disabled={!!editingUser?.user}
            />
            <TextField
              label="Full Name"
              name="fullName"
              value={formData.fullName}
              onChange={handleFormChange}
              fullWidth
              required
            />
            <TextField
              label="User Rating"
              name="userRating"
              type="number"
              value={formData.userRating}
              onChange={handleFormChange}
              fullWidth
              required
              inputProps={{ min: 0 }}
            />
            <TextField
              label="Avatar Background Color"
              name="avatarBgColor"
              value={formData.avatarBgColor}
              onChange={handleFormChange}
              fullWidth
              required
              placeholder="rgba(70, 130, 180, 0.8)"
              helperText="Use rgba format, e.g., rgba(70, 130, 180, 0.8)"
            />
            {formData.avatarBgColor && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2">Preview:</Typography>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    backgroundColor: formData.avatarBgColor,
                    border: '1px solid #ccc',
                  }}
                />
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={!formData.userId || !formData.fullName || !formData.userRating || !formData.avatarBgColor}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openChapterDialog} onClose={handleCloseChapterDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Chapter</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Chapter ID"
              value={newChapterId}
              onChange={(e) => setNewChapterId(e.target.value)}
              fullWidth
              required
              placeholder="e.g., YOUR_CHAPTER_ID_3"
              helperText="Enter the chapter ID. This will be initialized with default user values."
            />
            <Alert severity="info">
              The new chapter will be initialized with the same users as the "default" chapter. You can then edit or add users as needed.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseChapterDialog}>Cancel</Button>
          <Button
            onClick={handleAddChapter}
            variant="contained"
            startIcon={<AddIcon />}
            disabled={!newChapterId.trim()}
          >
            Add Chapter
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

