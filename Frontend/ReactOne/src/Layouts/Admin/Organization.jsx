import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tabs,
  Tab,
  Chip,
  Alert,
  Snackbar,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import { Edit, Delete, Add, People, Person } from '@mui/icons-material';
import {
  useGetOrganizationsQuery,
  useCreateOrganizationMutation,
  useUpdateOrganizationMutation,
  useDeleteOrganizationMutation,
  useGetBatchesByOrgQuery,
  useCreateBatchMutation,
  useUpdateBatchMutation,
  useDeleteBatchMutation,
  useSearchUsersByEmailQuery
} from '../../features/api/adminAPI';

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index} style={{ padding: '20px 0' }}>
      {value === index && children}
    </div>
  );
}

export default function OrganizationAdmin() {
  const [tab, setTab] = useState(0);
  const [orgDialog, setOrgDialog] = useState(false);
  const [batchDialog, setBatchDialog] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const [editingBatch, setEditingBatch] = useState(null);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Organization form state
  const [orgForm, setOrgForm] = useState({ name: '', description: '' });
  
  // Batch form state
  const [batchForm, setBatchForm] = useState({ 
    name: '', 
    description: '', 
    orgId: '', 
    userIds: [] 
  });

  // User search state
  const [userSearchEmail, setUserSearchEmail] = useState('');
  const [showUserSearch, setShowUserSearch] = useState(false);

  // API hooks
  const { data: organizations = [], isLoading: orgsLoading } = useGetOrganizationsQuery();
  const { data: batches = [], isLoading: batchesLoading } = useGetBatchesByOrgQuery(selectedOrg?._id || selectedOrg?.id, {
    skip: !(selectedOrg?._id || selectedOrg?.id)
  });

  const [createOrg] = useCreateOrganizationMutation();
  const [updateOrg] = useUpdateOrganizationMutation();
  const [deleteOrg] = useDeleteOrganizationMutation();
  const [createBatch] = useCreateBatchMutation();
  const [updateBatch] = useUpdateBatchMutation();
  const [deleteBatch] = useDeleteBatchMutation();

  // User search query
  const { data: searchResults, isLoading: searchLoading } = useSearchUsersByEmailQuery(userSearchEmail, {
    skip: !userSearchEmail || userSearchEmail.length < 3
  });

  const handleTabChange = (event, newValue) => {
    setTab(newValue);
    if (newValue === 1 && organizations.length > 0) {
      setSelectedOrg(organizations[0]);
    }
  };

  const handleOrgSubmit = async () => {
    try {
      if (editingOrg) {
        await updateOrg({ id: editingOrg._id || editingOrg.id, ...orgForm }).unwrap();
        setSnackbar({ open: true, message: 'Organization updated successfully!', severity: 'success' });
      } else {
        await createOrg(orgForm).unwrap();
        setSnackbar({ open: true, message: 'Organization created successfully!', severity: 'success' });
      }
      handleCloseOrgDialog();
    } catch (error) {
      setSnackbar({ open: true, message: error.data?.message || 'Error occurred', severity: 'error' });
    }
  };

  const handleBatchSubmit = async () => {
    try {
      if (editingBatch) {
        await updateBatch({ id: editingBatch._id || editingBatch.id, ...batchForm }).unwrap();
        setSnackbar({ open: true, message: 'Batch updated successfully!', severity: 'success' });
      } else {
        await createBatch(batchForm).unwrap();
        setSnackbar({ open: true, message: 'Batch created successfully!', severity: 'success' });
      }
      handleCloseBatchDialog();
    } catch (error) {
      setSnackbar({ open: true, message: error.data?.message || 'Error occurred', severity: 'error' });
    }
  };

  const handleEditOrg = (org) => {
    setEditingOrg(org);
    setOrgForm({ name: org.name, description: org.description });
    setOrgDialog(true);
  };

  const handleEditBatch = (batch) => {
    setEditingBatch(batch);
    setBatchForm({ 
      name: batch.name, 
      description: batch.description, 
      orgId: batch.orgId?._id || batch.orgId || '', 
      userIds: batch.userIds || [] 
    });
    setBatchDialog(true);
  };

  const handleDeleteOrg = async (id) => {
    if (window.confirm('Are you sure you want to delete this organization?')) {
      try {
        await deleteOrg(id).unwrap();
        setSnackbar({ open: true, message: 'Organization deleted successfully!', severity: 'success' });
      } catch (error) {
        setSnackbar({ open: true, message: error.data?.message || 'Error occurred', severity: 'error' });
      }
    }
  };

  const handleDeleteBatch = async (id) => {
    if (window.confirm('Are you sure you want to delete this batch?')) {
      try {
        await deleteBatch(id).unwrap();
        setSnackbar({ open: true, message: 'Batch deleted successfully!', severity: 'success' });
      } catch (error) {
        setSnackbar({ open: true, message: error.data?.message || 'Error occurred', severity: 'error' });
      }
    }
  };

  const handleCloseOrgDialog = () => {
    setOrgDialog(false);
    setEditingOrg(null);
    setOrgForm({ name: '', description: '' });
  };

  const handleCloseBatchDialog = () => {
    setBatchDialog(false);
    setEditingBatch(null);
    setBatchForm({ name: '', description: '', orgId: '', userIds: [] });
    setUserSearchEmail('');
    setShowUserSearch(false);
  };

  const openNewOrgDialog = () => {
    setEditingOrg(null);
    setOrgForm({ name: '', description: '' });
    setOrgDialog(true);
  };

  const openNewBatchDialog = () => {
    setEditingBatch(null);
    setBatchForm({ 
      name: '', 
      description: '', 
      orgId: selectedOrg?._id || selectedOrg?.id || '', 
      userIds: [] 
    });
    setUserSearchEmail('');
    setShowUserSearch(false);
    setBatchDialog(true);
  };

  const addUserToBatch = (user) => {
    // Check if user already exists in batch
    const userExists = batchForm.userIds.some(existingUser => {
      const existingId = typeof existingUser === 'object' ? existingUser.userId : existingUser;
      return existingId === user.userId;
    });
    
    if (!userExists) {
      setBatchForm({
        ...batchForm,
        userIds: [...batchForm.userIds, user.userId]
      });
    }
    setUserSearchEmail('');
    setShowUserSearch(false);
  };

  const removeUserFromBatch = (userId) => {
    setBatchForm({
      ...batchForm,
      userIds: batchForm.userIds.filter(user => {
        const id = typeof user === 'object' ? user.userId : user;
        return id !== userId;
      })
    });
  };

  const getUserDisplayInfo = (user) => {
    // Handle both populated user objects and userId strings
    if (typeof user === 'object' && user !== null) {
      return {
        name: user.fullName || user.username || user.email || 'Unknown User',
        email: user.email || 'No email'
      };
    }
    
    // Fallback for userId strings
    if (typeof user === 'string') {
      // Try to find user in search results first
      if (searchResults?.data) {
        const foundUser = searchResults.data.find(u => u.userId === user);
        if (foundUser) {
          return {
            name: foundUser.fullName || foundUser.username || 'Unknown User',
            email: foundUser.email || 'No email'
          };
        }
      }
      return {
        name: 'Unknown User',
        email: user
      };
    }
    
    return {
      name: 'Unknown User',
      email: 'No email'
    };
  };

  // Helper function to check if a user exists in the batch
  const isUserInBatch = (userId) => {
    return batchForm.userIds.some(existingUser => {
      const existingId = typeof existingUser === 'object' ? existingUser.userId : existingUser;
      return existingId === userId;
    });
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>Organization & Batch Management</Typography>
      
      <Tabs value={tab} onChange={handleTabChange} sx={{ mb: 2 }}>
        <Tab label="Organizations" />
        <Tab label="Batches" />
      </Tabs>

      {/* Organizations Tab */}
      <TabPanel value={tab} index={0}>
        <Box sx={{ mb: 2 }}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={openNewOrgDialog}
          >
            Add Organization
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
                             {organizations.map((org) => (
                 <TableRow key={org._id || org.id}>
                   <TableCell>{org.name}</TableCell>
                   <TableCell>{org.description}</TableCell>
                   <TableCell>{new Date(org.createdAt).toLocaleDateString()}</TableCell>
                   <TableCell>
                     <IconButton onClick={() => handleEditOrg(org)} color="primary">
                       <Edit />
                     </IconButton>
                     <IconButton onClick={() => handleDeleteOrg(org._id || org.id)} color="error">
                       <Delete />
                     </IconButton>
                   </TableCell>
                 </TableRow>
               ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Batches Tab */}
      <TabPanel value={tab} index={1}>
        <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
          <Typography variant="subtitle1">Organization:</Typography>
                     <FormControl size="small" sx={{ minWidth: 200 }}>
                       <InputLabel>Select Organization</InputLabel>
                       <Select
                         value={selectedOrg?._id || selectedOrg?.id || ''}
                         onChange={(e) => {
                           const org = organizations.find(o => (o._id || o.id) === e.target.value);
                           setSelectedOrg(org);
                         }}
                         label="Select Organization"
                         sx={{
                           '& .MuiOutlinedInput-root': {
                             '& fieldset': {
                               borderColor: 'divider'
                             },
                             '&:hover fieldset': {
                               borderColor: 'primary.main'
                             },
                             '&.Mui-focused fieldset': {
                               borderColor: 'primary.main'
                             }
                           }
                         }}
                       >
                         {organizations.map((org) => (
                           <MenuItem key={org._id || org.id} value={org._id || org.id}>
                             {org.name}
                           </MenuItem>
                         ))}
                       </Select>
                     </FormControl>
          
          {selectedOrg && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={openNewBatchDialog}
            >
              Add Batch
            </Button>
          )}
        </Box>

                 {selectedOrg && (
           <Box>
             {/* Debug info */}
             <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
               Debug: Selected Org ID: {selectedOrg._id || selectedOrg.id} | 
               Batches Count: {batches.length} 
             </Typography>
             
             {batchesLoading ? (
               <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                 Loading batches...
               </Typography>
             ) : batches.length === 0 ? (
               <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                 No batches found for this organization.
               </Typography>
             ) : (
               <TableContainer component={Paper}>
                 <Table>
                   <TableHead>
                     <TableRow>
                       <TableCell>Name</TableCell>
                       <TableCell>Description</TableCell>
                       <TableCell>Users</TableCell>
                       <TableCell>Created</TableCell>
                       <TableCell>Actions</TableCell>
                     </TableRow>
                   </TableHead>
                   <TableBody>
                     {batches.map((batch) => (
                       <TableRow key={batch._id || batch.id}>
                         <TableCell>{batch.name}</TableCell>
                         <TableCell>{batch.description}</TableCell>
                         <TableCell>
                           {batch.userIds && batch.userIds.length > 0 ? (
                             <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                               <Chip 
                                 icon={<People />} 
                                 label={`${batch.userIds.length} users`} 
                                 size="small"
                                 color="primary"
                                 variant="outlined"
                               />
                               <Box sx={{ maxHeight: 100, overflowY: 'auto' }}>
                                 {batch.userIds.map((user, index) => (
                                   <Box
                                     key={user._id || user.userId || index}
                                     sx={{
                                       display: 'flex',
                                       alignItems: 'center',
                                       gap: 0.5,
                                       fontSize: '0.75rem',
                                       color: 'text.secondary'
                                     }}
                                   >
                                     <Person fontSize="inherit" />
                                     <span>
                                       {user.fullName || user.username || user.email || 'Unknown User'}
                                     </span>
                                   </Box>
                                 ))}
                               </Box>
                             </Box>
                           ) : (
                             <Chip 
                               icon={<People />} 
                               label="0 users" 
                               size="small"
                               color="default"
                               variant="outlined"
                             />
                           )}
                         </TableCell>
                         <TableCell>{new Date(batch.createdAt).toLocaleDateString()}</TableCell>
                         <TableCell>
                           <IconButton onClick={() => handleEditBatch(batch)} color="primary">
                             <Edit />
                           </IconButton>
                           <IconButton onClick={() => handleDeleteBatch(batch._id || batch.id)} color="error">
                             <Delete />
                           </IconButton>
                         </TableCell>
                       </TableRow>
                     ))}
                   </TableBody>
                 </Table>
               </TableContainer>
             )}
           </Box>
         )}
      </TabPanel>

      {/* Organization Dialog */}
      <Dialog open={orgDialog} onClose={handleCloseOrgDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingOrg ? 'Edit Organization' : 'Add Organization'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            fullWidth
            variant="outlined"
            value={orgForm.name}
            onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={orgForm.description}
            onChange={(e) => setOrgForm({ ...orgForm, description: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseOrgDialog}>Cancel</Button>
          <Button onClick={handleOrgSubmit} variant="contained">
            {editingOrg ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Batch Dialog */}
      <Dialog open={batchDialog} onClose={handleCloseBatchDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingBatch ? 'Edit Batch' : 'Add Batch'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            fullWidth
            variant="outlined"
            value={batchForm.name}
            onChange={(e) => setBatchForm({ ...batchForm, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={batchForm.description}
            onChange={(e) => setBatchForm({ ...batchForm, description: e.target.value })}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth margin="dense" sx={{ mb: 3 }}>
            <InputLabel>Organization</InputLabel>
            <Select
              value={batchForm.orgId}
              onChange={(e) => setBatchForm({ ...batchForm, orgId: e.target.value })}
              label="Organization"
              disabled={!!selectedOrg}
            >
              {organizations.map((org) => (
                <MenuItem key={org._id || org.id} value={org._id || org.id}>
                  {org.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* User Management Section */}
          <Typography variant="h6" sx={{ mb: 2 }}>Users in Batch</Typography>
          
                     {/* Current Users */}
           {batchForm.userIds.length > 0 && (
             <Box sx={{ mb: 2 }}>
               <Typography variant="subtitle2" sx={{ mb: 1 }}>Current Users:</Typography>
               <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                 {batchForm.userIds.map((user) => {
                   const userInfo = getUserDisplayInfo(user);
                   const userId = typeof user === 'object' ? user.userId : user;
                   return (
                     <Box
                       key={userId}
                       sx={{
                         display: 'flex',
                         justifyContent: 'space-between',
                         alignItems: 'center',
                         p: 1.5,
                         borderRadius: 1,
                         border: '1px solid',
                         borderColor: 'divider',
                         backgroundColor: 'background.paper',
                         '&:hover': {
                           backgroundColor: 'action.hover'
                         }
                       }}
                     >
                       <Box>
                         <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                           {userInfo.name}
                         </Typography>
                         <Typography variant="caption" color="text.secondary">
                           {userInfo.email}
                         </Typography>
                       </Box>
                       <IconButton
                         size="small"
                         onClick={() => removeUserFromBatch(userId)}
                         sx={{
                           color: 'error.main',
                           '&:hover': {
                             backgroundColor: 'error.light',
                             color: 'error.contrastText'
                           }
                         }}
                       >
                         <Delete fontSize="small" />
                       </IconButton>
                     </Box>
                   );
                 })}
               </Box>
             </Box>
           )}

          {/* Add User Section */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Add Users:</Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                size="small"
                placeholder="Search by email..."
                value={userSearchEmail}
                onChange={(e) => {
                  setUserSearchEmail(e.target.value);
                  setShowUserSearch(e.target.value.length >= 3);
                }}
                sx={{ flexGrow: 1 }}
              />
              <Button
                size="small"
                variant="outlined"
                onClick={() => setShowUserSearch(!showUserSearch)}
              >
                {showUserSearch ? 'Hide' : 'Search'}
              </Button>
            </Box>
          </Box>

          {/* Search Results */}
          {showUserSearch && userSearchEmail.length >= 3 && (
            <Box sx={{ mb: 2 }}>
              {searchLoading ? (
                <Typography variant="body2" color="text.secondary">Searching...</Typography>
              ) : searchResults?.data && searchResults.data.length > 0 ? (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Search Results:</Typography>
                                     <Box sx={{ 
                     maxHeight: 200, 
                     overflowY: 'auto', 
                     border: '1px solid',
                     borderColor: 'divider',
                     borderRadius: 1, 
                     p: 1,
                     backgroundColor: 'background.paper'
                   }}>
                     {searchResults.data.map((user) => (
                       <Box
                         key={user.userId}
                         sx={{
                           display: 'flex',
                           justifyContent: 'space-between',
                           alignItems: 'center',
                           p: 1.5,
                           borderBottom: '1px solid',
                           borderColor: 'divider',
                           '&:last-child': { borderBottom: 'none' },
                           '&:hover': {
                             backgroundColor: 'action.hover'
                           }
                         }}
                       >
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {user.fullName || user.username}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {user.email} • {user.role}
                          </Typography>
                        </Box>
                                                 <Button
                           size="small"
                           variant="contained"
                           onClick={() => addUserToBatch(user)}
                           disabled={isUserInBatch(user.userId)}
                           sx={{
                             backgroundColor: isUserInBatch(user.userId) ? 'success.main' : 'primary.main',
                             color: 'white',
                             '&:hover': {
                               backgroundColor: isUserInBatch(user.userId) ? 'success.dark' : 'primary.dark'
                             },
                             '&:disabled': {
                               backgroundColor: 'success.main',
                               color: 'white'
                             }
                           }}
                         >
                           {isUserInBatch(user.userId) ? 'Added' : 'Add'}
                         </Button>
                      </Box>
                    ))}
                  </Box>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No users found with that email.
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseBatchDialog}>Cancel</Button>
          <Button sx={{backgroundColor: 'background.paper'}} onClick={handleBatchSubmit} variant="contained">
            {editingBatch ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
