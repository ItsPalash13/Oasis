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
  Chip,
  IconButton,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Grid,
  Paper,
  Divider,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Tooltip
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Delete as DeleteIcon, Upload as UploadIcon, Search as SearchIcon } from '@mui/icons-material';
import {
  useGetQuestionsQuery,
  useCreateQuestionMutation,
  useUpdateQuestionMutation,
  useMultiAddQuestionsMutation,
  useDeleteQuestionMutation,
  useGetChaptersQuery,
  useGetTopicsQuery,
  useGetSectionsQuery,
  useBulkAssignSectionMutation
} from '../../features/api/adminAPI';
import { useUploadQuestionImageMutation } from '../../features/api/adminAPI';
import { saveAs } from 'file-saver';
import QuesEditor from '../../components/QuesEditor';

const Questions = () => {
  const [openMultiAddDialog, setOpenMultiAddDialog] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopicsForEditor, setSelectedTopicsForEditor] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [multiAddData, setMultiAddData] = useState({
    questions: '',
    chapterId: '',
    sectionId: '',
    topicIds: [],
    xpCorrect: 2,
    xpIncorrect: 0,
    mu: 0,
    sigma: 1
  });

  const { data: chaptersData } = useGetChaptersQuery();
  const { data: sectionsData } = useGetSectionsQuery(selectedChapter, { skip: !selectedChapter });
  const { data: questionsData, isLoading } = useGetQuestionsQuery(
    { chapterId: selectedChapter, sectionId: selectedSection }, 
    { skip: !selectedChapter }
  );
  const { data: topicsData } = useGetTopicsQuery(selectedChapter, { skip: !selectedChapter });

  // Filter questions based on search query and topic filter
  const filteredQuestions = React.useMemo(() => {
    if (!questionsData?.data) {
      return [];
    }
    
    let filtered = questionsData.data;
    
    // Apply search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(question => {
        const questionMatch = question.ques.toLowerCase().includes(query);
        const optionsMatch = question.options.some(option => option.toLowerCase().includes(query));
        const topicsMatch = question.topics?.some(topic => {
          const topicName = topic.name || topic.topic || '';
          return topicName.toLowerCase().includes(query);
        });
        return questionMatch || optionsMatch || topicsMatch;
      });
    }
    
    // Apply topic filter
    if (selectedTopicsForEditor.length > 0) {
      filtered = filtered.filter(question => {
        const questionTopics = question.topics?.map(topic => topic.name || topic.topic || '') || [];
        const selectedTopicNames = selectedTopicsForEditor.map(topic => topic.topic);
        return selectedTopicNames.every(selectedTopic => 
          questionTopics.includes(selectedTopic)
        );
      });
    }
    
    // Apply section filter (if a section is selected)
    if (selectedSection) {
      filtered = filtered.filter(question => {
        const questionSectionId = question.sectionId?._id || question.sectionId;
        if (selectedSection === 'no-section') {
          return !questionSectionId;
        }
        return questionSectionId === selectedSection;
      });
    }
    
    return filtered;
  }, [questionsData?.data, searchQuery, selectedTopicsForEditor, selectedSection]);
  
  const [createQuestion] = useCreateQuestionMutation();
  const [updateQuestion] = useUpdateQuestionMutation();
  const [multiAddQuestions] = useMultiAddQuestionsMutation();
  const [deleteQuestion] = useDeleteQuestionMutation();
  const [uploadQuestionImage] = useUploadQuestionImageMutation();
  const [bulkAssignSection] = useBulkAssignSectionMutation();

  // Bulk assign section dialog state
  const [bulkAssignDialogOpen, setBulkAssignDialogOpen] = useState(false);
  const [selectedSectionForBulk, setSelectedSectionForBulk] = useState('');
  const [isBulkAssigning, setIsBulkAssigning] = useState(false);

  // Image upload dialog state
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageDialogTarget, setImageDialogTarget] = useState(null);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const openImageDialog = (row) => {
    setImageDialogTarget(row);
    setImageDialogOpen(true);
    setSelectedImageFile(null);
    setSelectedImagePreview('');
  };

  const closeImageDialog = () => {
    setImageDialogOpen(false);
    setImageDialogTarget(null);
    setSelectedImageFile(null);
    setSelectedImagePreview('');
  };

  const onPickImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedImageFile(file);
    setSelectedImagePreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const attachImage = async () => {
    if (!imageDialogTarget?._id || !selectedImageFile) return;
    try {
      setIsUploadingImage(true);
      await uploadQuestionImage({ id: imageDialogTarget._id, file: selectedImageFile }).unwrap();
      closeImageDialog();
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setIsUploadingImage(false);
    }
  };


  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this question?')) {
      try {
        await deleteQuestion(id).unwrap();
      } catch (error) {
        console.error('Error deleting question:', error);
      }
    }
  };

  const handleMultiDelete = async () => {
    if (selectedRows.length === 0) {
      alert('Please select questions to delete');
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${selectedRows.length} selected questions?`)) {
      try {
        // Delete questions one by one
        const deletePromises = selectedRows.map(id => deleteQuestion(id).unwrap());
        await Promise.all(deletePromises);
        setSelectedRows([]); // Clear selection after deletion
      } catch (error) {
        console.error('Error deleting questions:', error);
      }
    }
  };

  const handleBulkAssignSection = async () => {
    if (selectedRows.length === 0) {
      alert('Please select questions to assign section');
      return;
    }

    if (!selectedSectionForBulk) {
      alert('Please select a section');
      return;
    }

    try {
      setIsBulkAssigning(true);
      await bulkAssignSection({
        questionIds: selectedRows,
        sectionId: selectedSectionForBulk === 'no-section' ? null : selectedSectionForBulk,
        chapterId: selectedChapter
      }).unwrap();
      
      setBulkAssignDialogOpen(false);
      setSelectedSectionForBulk('');
      setSelectedRows([]); // Clear selection after successful assignment
      alert(`Successfully assigned section to ${selectedRows.length} questions`);
    } catch (error) {
      console.error('Error bulk assigning section:', error);
      alert('Error assigning section to questions');
    } finally {
      setIsBulkAssigning(false);
    }
  };

  const handleRowClick = (params) => {
    // Set the question to edit and switch to editor tab
    setEditingQuestion(params.row);
    setActiveTab(1);
  };

  // Helper function to parse CSV line
  const parseCSVLine = (line) => {
    const parts = [];
    let current = '';
    let inSlashQuotes = false;
    let inRegularQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      // Check for /" pattern (start of slash-quoted field)
      if (char === '/' && nextChar === '"' && !inSlashQuotes && !inRegularQuotes) {
        inSlashQuotes = true;
        current = '';
        i++; // Skip the next quote character
        continue;
      }
      
      // Check for "/ pattern (end of slash-quoted field)
      if (char === '"' && nextChar === '/' && inSlashQuotes) {
        inSlashQuotes = false;
        parts.push(current.trim());
        current = '';
        i++; // Skip the next slash character
        continue;
      }
      
      // Handle regular quotes (for backward compatibility)
      if (char === '"' && !inSlashQuotes) {
        inRegularQuotes = !inRegularQuotes;
        if (!inRegularQuotes) {
          parts.push(current.trim());
          current = '';
        }
        continue;
      }
      
      // Handle comma separators (only when not in quotes)
      if (char === ',' && !inSlashQuotes && !inRegularQuotes) {
        if (current.trim()) {
          parts.push(current.trim());
        }
        current = '';
        continue;
      }
      
      // Add character to current field
      if (inSlashQuotes || inRegularQuotes || char !== ',') {
        current += char;
      }
    }
    
    // Add the last part
    if (current.trim()) {
      parts.push(current.trim());
    }
    
    return parts;
  };

  // Parse CSV data for preview
  const parseCSVPreview = (csvText) => {
    if (!csvText.trim()) return [];
    
    const lines = csvText.split('\n').filter(line => line.trim());
    return lines.map((line, index) => {
      const parts = parseCSVLine(line);
      
      return {
        id: index,
        question: parts[0] || '',
        option1: parts[1] || '',
        option2: parts[2] || '',
        option3: parts[3] || '',
        option4: parts[4] || '',
        correctIndex: parts[5] || '',
        solution: parts[6] || '',
        isValid: parts.length >= 6 && parts[0] && parts[1] && parts[2] && parts[3] && parts[4] && parts[5]
      };
    });
  };

  const csvPreviewData = parseCSVPreview(multiAddData.questions);

  const handleMultiAdd = async () => {
    try {
      // Parse the questions text into the required format
      const questionsText = multiAddData.questions.trim();
      const lines = questionsText.split('\n').filter(line => line.trim());
      
      const parsedQuestions = lines.map(line => {
        const parts = parseCSVLine(line);
        if (parts.length < 6) {
          throw new Error(`Invalid format. Each line should have: /\"question\"/,/\"option1\"/,/\"option2\"/,/\"option3\"/,/\"option4\"/,correctIndex,/\"solution\"/`);
        }
        
        let [question, option1, option2, option3, option4, correctIndex, solution] = parts;
        // Extract content from /"text"/ format
        const extractContent = (str) => {
          if (!str) return '';
          str = str.trim();
          // Remove /" from start and "/ from end
          return str.replace(/^\/"/, '').replace(/"\/$/, '');
        };
        question = extractContent(question);
        option1 = extractContent(option1);
        option2 = extractContent(option2);
        option3 = extractContent(option3);
        option4 = extractContent(option4);
        solution = solution ? extractContent(solution) : '';
        // Parse correct index(es) - handle both single and multiple
        const correctAnswers = correctIndex.includes(';') ? 
          correctIndex.split(';').map(idx => parseInt(idx.trim())) : 
          [parseInt(correctIndex)];
        return [question, option1, option2, option3, option4, correctAnswers, solution];
      });

      await multiAddQuestions({
        questions: parsedQuestions,
        chapterId: selectedChapter,
        sectionId: multiAddData.sectionId || undefined,
        topicIds: multiAddData.topicIds,
        xpCorrect: multiAddData.xpCorrect,
        xpIncorrect: multiAddData.xpIncorrect,
        mu: multiAddData.mu,
        sigma: multiAddData.sigma
      }).unwrap();

      setOpenMultiAddDialog(false);
      setMultiAddData({
        questions: '',
        chapterId: '',
        sectionId: '',
        topicIds: [],
        xpCorrect: 2,
        xpIncorrect: 0,
        mu: 0,
        sigma: 1
      });
    } catch (error) {
      console.error('Error multi-adding questions:', error);
    }
  };

  // Helper to escape CSV fields
  const escapeCSV = (value) => {
    if (value == null) return '';
    const str = String(value);
    if (str.includes('"')) {
      // Escape quotes by doubling them
      return '"' + str.replace(/"/g, '""') + '"';
    }
    if (str.includes(',') || str.includes('\n') || str.includes('\r')) {
      return '"' + str + '"';
    }
    return str;
  };

  // Helper to convert filtered questions to CSV
  const downloadFilteredQuestionsCSV = () => {
    if (!filteredQuestions.length) return;
    const csvRows = filteredQuestions.map(q => {
      // Compose the /"question"/ part
      const question = escapeCSV(`/"${q.ques}"/`);
      // Options (ensure 4, each wrapped as /"option"/)
      const options = (q.options || []).map(opt => escapeCSV(`/"${opt}"/`)).slice(0, 4);
      while (options.length < 4) options.push(escapeCSV('/""/'));
      // Correct index(es) - handle both single and multiple correct answers
      const correctIndex = Array.isArray(q.correct) ? q.correct.join(';') : q.correct;
      // Mu and Sigma
      const mu = escapeCSV(q.questionTs?.difficulty?.mu ?? '');
      const sigma = escapeCSV(q.questionTs?.difficulty?.sigma ?? '');
      // Solution
      const solution = escapeCSV(`/"${q.solution || ''}"/`);
      // Topics as JSON array of topic names
      const topicsArr = (q.topics || []).map(t => t.name || t.topic || '').filter(Boolean);
      const topicsJson = escapeCSV(JSON.stringify(topicsArr));
      // Join all fields
      return [question, ...options, correctIndex, mu, sigma, solution, topicsJson].join(',');
    });
    // Add header
    const header = '/question/,option1,option2,option3,option4,correctIndex(es),mu,sigma,solution,topics';
    const csvContent = [header, ...csvRows].join('\n');
    // Download as file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'filtered_questions.csv');
  };

  const columns = [
    { field: 'ques', headerName: 'Question', flex: 1, minWidth: 200 },
    { 
      field: 'options', 
      headerName: 'Options', 
      flex: 1, 
      minWidth: 300,
      renderCell: (params) => (
        <Box>
          {params.value?.map((option, index) => (
            <Chip 
              key={index} 
              label={`${index + 1}. ${option}`} 
              size="small" 
              variant={Array.isArray(params.row.correct) ? 
                (params.row.correct.includes(index) ? "filled" : "outlined") : 
                (params.row.correct === index ? "filled" : "outlined")}
              color={Array.isArray(params.row.correct) ? 
                (params.row.correct.includes(index) ? "success" : "default") : 
                (params.row.correct === index ? "success" : "default")}
              sx={{ mr: 0.5, mb: 0.5 }}
            />
          ))}
        </Box>
      )
    },
    {
      field: 'quesImages',
      headerName: 'Images',
      width: 200,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {params.value?.length > 0 ? (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'nowrap', overflow: 'hidden' }}>
              {params.value.map((img, idx) => (
                <Box key={idx} sx={{ position: 'relative' }}>
                  <img 
                    src={img.url} 
                    alt={img.caption || `image ${idx + 1}`} 
                    style={{ 
                      width: 56, 
                      height: 40, 
                      objectFit: 'cover', 
                      borderRadius: 4 
                    }} 
                  />
                  {img.caption && (
                    <Tooltip title={img.caption}>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          position: 'absolute', 
                          bottom: 0, 
                          left: 0, 
                          right: 0, 
                          bgcolor: 'rgba(0,0,0,0.6)', 
                          color: 'white', 
                          textAlign: 'center',
                          fontSize: '0.6rem',
                          borderBottomLeftRadius: 4,
                          borderBottomRightRadius: 4
                        }}
                      >
                        {img.caption.slice(0, 10)}{img.caption.length > 10 ? '...' : ''}
                      </Typography>
                    </Tooltip>
                  )}
                </Box>
              ))}
              {params.value.length > 2 && (
                <Chip 
                  label={`+${params.value.length - 2}`} 
                  size="small" 
                  sx={{ height: 40 }}
                />
              )}
            </Box>
          ) : (
            <Typography variant="caption" color="text.secondary">No images</Typography>
          )}
        </Box>
      )
    },
    {
      field: 'optionImages',
      headerName: 'Option Images',
      width: 200,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {params.value?.some(arr => arr.length > 0) ? (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'nowrap' }}>
              {params.value.map((optImgs, optIdx) => 
                optImgs.length > 0 && (
                  <Box key={optIdx} sx={{ position: 'relative' }}>
                    <Chip 
                      avatar={
                        <img 
                          src={optImgs[0].url} 
                          alt={`option ${optIdx + 1}`}
                          style={{ 
                            width: 24, 
                            height: 24, 
                            objectFit: 'cover',
                            borderRadius: '50%'
                          }}
                        />
                      }
                      label={`Opt ${optIdx + 1}: ${optImgs.length}`}
                      size="small"
                    />
                  </Box>
                )
              )}
            </Box>
          ) : (
            <Typography variant="caption" color="text.secondary">No images</Typography>
          )}
        </Box>
      )
    },
    {
      field: 'gridSize',
      headerName: 'Layout',
      width: 150,
      renderCell: (params) => {
        const grid = params.value || { xs: 12, sm: 6, md: 3 };
        return (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Chip 
              label={`xs: ${12/grid.xs}`} 
              size="small" 
              variant="outlined"
            />
            <Chip 
              label={`sm: ${12/grid.sm}`} 
              size="small" 
              variant="outlined"
            />
            <Chip 
              label={`md: ${12/grid.md}`} 
              size="small" 
              variant="outlined"
            />
          </Box>
        );
      }
    },
    { 
      field: 'chapterId', 
      headerName: 'Chapter', 
      width: 150,
      renderCell: (params) => (
        <Typography>
          {params.value?.name || 'N/A'}
        </Typography>
      )
    },
    { 
      field: 'sectionId', 
      headerName: 'Section', 
      width: 120,
      renderCell: (params) => (
        <Typography>
          {params.value?.name || 'N/A'}
        </Typography>
      )
    },
    { 
      field: 'topics', 
      headerName: 'Topics', 
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <Box>
          {params.value?.map((topic, index) => (
            <Chip 
              key={index} 
              label={topic.name || topic.topic} 
              size="small" 
              sx={{ mr: 0.5, mb: 0.5 }}
            />
          ))}
        </Box>
      ),
      filterable: true,
      getApplyQuickFilterFn: (value) => {
        if (!value || value.length === 0) {
          return null;
        }
        return ({ field, id, value: cellValue }) => {
          if (field !== 'topics') {
            return false;
          }
          const searchValue = value.toLowerCase();
          
          const result = cellValue?.some(topic => {
            const topicName = topic.name || topic.topic || '';
            const match = topicName.toLowerCase().includes(searchValue);
            return match;
          }) || false;
          
          return result;
        };
      }
    },
    { 
      field: 'mu', 
      headerName: 'Mu', 
      width: 80,
      renderCell: (params) => (
        <Typography variant="body2">
          {params.row.questionTs?.difficulty?.mu || 'N/A'}
        </Typography>
      )
    },
    { 
      field: 'sigma', 
      headerName: 'Sigma', 
      width: 80,
      renderCell: (params) => (
        <Typography variant="body2">
          {params.row.questionTs?.difficulty?.sigma || 'N/A'}
        </Typography>
      )
    },
    { 
      field: 'solution', 
      headerName: 'Solution', 
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ 
          overflow: 'hidden', 
          textOverflow: 'ellipsis', 
          whiteSpace: 'nowrap',
          maxWidth: '100%'
        }}>
          {params.value || 'No solution'}
        </Typography>
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      renderCell: (params) => (
        <Box>
          <IconButton onClick={() => handleDelete(params.row._id)} size="small" color="error">
            <DeleteIcon />
          </IconButton>
          <IconButton onClick={() => openImageDialog(params.row)} size="small" title="Attach Image">
            <UploadIcon />
          </IconButton>
        </Box>
      )
    }
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* High Level Filters */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel id="chapter-select-label">Chapter</InputLabel>
          <Select
            labelId="chapter-select-label"
            label="Chapter"
            value={selectedChapter}
            onChange={(e) => {
              setSelectedChapter(e.target.value);
              setSelectedSection(''); // Reset section when chapter changes
              setSelectedTopicsForEditor([]); // Reset topics when chapter changes
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
          <InputLabel id="section-select-label">Section (Optional)</InputLabel>
          <Select
            labelId="section-select-label"
            label="Section (Optional)"
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            disabled={!selectedChapter}
          >
            <MenuItem value="">
              <em>No Section</em>
            </MenuItem>
            {sectionsData?.data?.map((section) => (
              <MenuItem key={section._id} value={section._id}>
                {section.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 300 }}>
          <InputLabel id="topics-label">Topics</InputLabel>
          <Select
            labelId="topics-label"
            label="Topics"
            multiple
            value={selectedTopicsForEditor}
            onChange={(e) => {
              setSelectedTopicsForEditor(e.target.value);
            }}
            disabled={!selectedChapter}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((topic) => (
                  <Chip key={topic._id} label={topic.topic} size="small" />
                ))}
              </Box>
            )}
          >
            {topicsData?.data?.map((topic) => (
              <MenuItem key={topic._id} value={topic}>
                {topic.topic}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {!selectedChapter && (
          <Alert severity="info" sx={{ flex: 1 }}>
            Please select a chapter to start adding or editing questions
          </Alert>
        )}
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Questions List" />
          <Tab label="Question Editor" disabled={!selectedChapter} />
        </Tabs>
      </Box>
      {activeTab === 1 ? (
        
        <QuesEditor 
          selectedChapter={selectedChapter}
          selectedSection={selectedSection}
          selectedTopics={selectedTopicsForEditor}
          editingQuestion={editingQuestion}
          onSave={async (formData, files) => {
            try {
              // If we received raw data and files instead of FormData
              if (!(formData instanceof FormData)) {
                const newFormData = new FormData();
                newFormData.append('data', JSON.stringify(formData));
                if (files && Array.isArray(files)) {
                  files.forEach(file => {
                    newFormData.append('files', file);
                  });
                }
                formData = newFormData;
              }

              if (editingQuestion) {
                // For updates, we need to pass the ID and formData
                // For updates, send the ID in the URL and formData directly
                await updateQuestion({
                  id: editingQuestion._id,
                  method: 'PUT',
                  body: formData,
                  formData: true // Signal to RTK Query that this is FormData
                }).unwrap();
              } else {
                await createQuestion(formData).unwrap();
              }
              
              setActiveTab(0); // Switch back to list view after save
              setEditingQuestion(null); // Clear editing question
            } catch (error) {
              console.error('Error saving question:', error);
            }
          }}
        />
      ) : (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <TextField
              placeholder="Search questions, options, or topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ minWidth: 300 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              onClick={() => setOpenMultiAddDialog(true)}
              disabled={!selectedChapter}
            >
              Multi Add
            </Button>
            <Button
              variant="outlined"
              onClick={downloadFilteredQuestionsCSV}
              disabled={filteredQuestions.length === 0}
              sx={{ ml: 1 }}
            >
              Download CSV
            </Button>
            {selectedRows.length > 0 && (
              <Button
                variant="contained"
                color="error"
                onClick={handleMultiDelete}
                disabled={selectedRows.length === 0}
              >
                Delete Selected ({selectedRows.length})
              </Button>
            )}
            {selectedRows.length > 0 && (
              <Button
                variant="contained"
                color="primary"
                onClick={() => setBulkAssignDialogOpen(true)}
                disabled={selectedRows.length === 0}
              >
                Assign Section ({selectedRows.length})
              </Button>
            )}
          </Box>

      {/* Filter Summary */}
      {(selectedChapter || selectedSection || selectedTopicsForEditor.length > 0) && (
        <Box sx={{ 
          mb: 2, 
          p: 2, 
          bgcolor: 'background.paper', 
          borderRadius: 1, 
          border: '1px solid', 
          borderColor: 'divider' 
        }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
            Active Filters:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {selectedChapter && (
              <Chip
                label={`Chapter: ${chaptersData?.data?.find(c => c._id === selectedChapter)?.name}`}
                color="primary"
                variant="outlined"
                onDelete={() => setSelectedChapter('')}
                deleteIcon={<span style={{ cursor: 'pointer' }}>×</span>}
              />
            )}
            {selectedSection && (
              <Chip
                label={`Section: ${sectionsData?.data?.find(s => s._id === selectedSection)?.name}`}
                color="secondary"
                variant="outlined"
                onDelete={() => setSelectedSection('')}
                deleteIcon={<span style={{ cursor: 'pointer' }}>×</span>}
              />
            )}
            {selectedTopicsForEditor.map((topic, index) => (
              <Chip
                key={topic._id}
                label={`Topic: ${topic.topic}`}
                color="info"
                variant="outlined"
                onDelete={() => {
                  const newTopics = selectedTopicsForEditor.filter((_, i) => i !== index);
                  setSelectedTopicsForEditor(newTopics);
                }}
                deleteIcon={<span style={{ cursor: 'pointer' }}>×</span>}
              />
            ))}
            <Button
              size="small"
              variant="text"
              onClick={() => {
                setSelectedChapter('');
                setSelectedSection('');
                setSelectedTopicsForEditor([]);
                setSearchQuery('');
              }}
              sx={{ ml: 1 }}
            >
              Clear All Filters
            </Button>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Showing {filteredQuestions.length} of {questionsData?.data?.length || 0} questions
          </Typography>
        </Box>
      )}

      {/* Section Overview - Show when chapter is selected but no specific section */}
      {selectedChapter && !selectedSection && questionsData?.data && (
        <Box sx={{ 
          mb: 2, 
          p: 2, 
          bgcolor: 'primary.50', 
          borderRadius: 1, 
          border: '1px solid', 
          borderColor: 'primary.200',
          '& .MuiChip-root': {
            '&:hover': {
              bgcolor: 'primary.100',
            }
          }
        }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', color: 'primary.800' }}>
            Questions by Section:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {sectionsData?.data?.map((section) => {
              const questionCount = questionsData.data.filter(q => {
                const questionSectionId = q.sectionId?._id || q.sectionId;
                return questionSectionId === section._id;
              }).length;
              
              return (
                <Chip
                  key={section._id}
                  label={`${section.name}: ${questionCount} questions`}
                  color={questionCount > 0 ? "primary" : "default"}
                  variant={questionCount > 0 ? "filled" : "outlined"}
                  onClick={() => setSelectedSection(section._id)}
                  sx={{ cursor: 'pointer' }}
                />
              );
            })}
            <Chip
              label={`No Section: ${questionsData.data.filter(q => !q.sectionId?._id && !q.sectionId).length} questions`}
              color="default"
              variant="outlined"
              onClick={() => setSelectedSection('no-section')}
              sx={{ cursor: 'pointer' }}
            />
          </Box>
          <Typography variant="caption" color="primary.700" sx={{ mt: 1, display: 'block' }}>
            Click on a section to filter questions by that section
          </Typography>
        </Box>
      )}

      <Box>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {filteredQuestions.length} question{filteredQuestions.length !== 1 ? 's' : ''} 
            {selectedSection && selectedSection !== 'no-section' && ` in ${sectionsData?.data?.find(s => s._id === selectedSection)?.name}`}
            {selectedSection === 'no-section' && ' without section'}
            {selectedTopicsForEditor.length > 0 && ` matching ${selectedTopicsForEditor.length} topic filter${selectedTopicsForEditor.length !== 1 ? 's' : ''}`}
          </Typography>
        </Box>
        <DataGrid
          rows={filteredQuestions}
          columns={columns}
          getRowId={(row) => row._id}
          loading={isLoading}
          checkboxSelection
          disableRowSelectionOnClick
          getRowHeight={() => 'auto'}
          filterMode="client"
          quickFilterOperator="or"
          slots={{
            toolbar: 'GridToolbar',
          }}
          slotProps={{
            toolbar: {
              showQuickFilter: true,
              quickFilterProps: { debounceMs: 500 },
            },
          }}
          onRowSelectionModelChange={(newSelectionModel) => {
            setSelectedRows([...newSelectionModel.ids]);
          }}
          onRowClick={handleRowClick}
          selectionModel={selectedRows}
          initialState={{
            pagination: {
              paginationModel: { page: 0, pageSize: 10 },
            },
          }}
          pageSizeOptions={[10, 25, 50]}
          sx={{
            minHeight: 400,
            '& .MuiDataGrid-root': {
              border: 'none',
            },
            '& .MuiDataGrid-cell': {
              borderBottom: '1px solid',
              borderColor: 'divider',
            },
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: 'background.paper',
              borderBottom: '2px solid',
              borderColor: 'divider',
            },
            '& .MuiDataGrid-row': {
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            },
          }}
        />
      </Box>


      {/* Multi Add Dialog */}
      <Dialog open={openMultiAddDialog} onClose={() => setOpenMultiAddDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Multi Add Questions</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Format: /"question"/,/"option1"/,/"option2"/,/"option3"/,/"option4"/,correctIndex(es),/"solution"/ (one per line)<br/>
            Note: Solution is optional. You can omit it or leave it empty by using /""/. For multiple correct answers, separate indices with semicolon (e.g., 0;2). Mu and Sigma values are set below for all questions.
          </Alert>
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Questions (CSV format)"
                multiline
                rows={10}
                value={multiAddData.questions}
                onChange={(e) => setMultiAddData({ ...multiAddData, questions: e.target.value })}
                placeholder={'Format: /"question"/,/"option1"/,/"option2"/,/"option3"/,/"option4"/,correctIndex(es),/"solution"/'}
              />
            </Grid>

            {/* CSV Preview Table */}
            {csvPreviewData.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Preview ({csvPreviewData.length} questions)
                </Typography>
                <TableContainer component={Paper} sx={{ maxHeight: 300, overflow: 'auto' }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>#</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Question</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Option 1</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Option 2</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Option 3</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Option 4</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Correct</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Solution</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {csvPreviewData.map((row) => (
                        <TableRow 
                          key={row.id}
                          sx={{ 
                            backgroundColor: row.isValid ? 'inherit' : '#ffebee',
                            '&:hover': { backgroundColor: row.isValid ? '#f5f5f5' : '#ffcdd2' }
                          }}
                        >
                          <TableCell>{row.id + 1}</TableCell>
                          <TableCell sx={{ maxWidth: 200, wordBreak: 'break-word' }}>
                            {row.question}
                          </TableCell>
                          <TableCell sx={{ maxWidth: 100, wordBreak: 'break-word' }}>
                            {row.option1}
                          </TableCell>
                          <TableCell sx={{ maxWidth: 100, wordBreak: 'break-word' }}>
                            {row.option2}
                          </TableCell>
                          <TableCell sx={{ maxWidth: 100, wordBreak: 'break-word' }}>
                            {row.option3}
                          </TableCell>
                          <TableCell sx={{ maxWidth: 100, wordBreak: 'break-word' }}>
                            {row.option4}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                              {row.correctIndex.split(';').map((idx, i) => (
                                <Chip 
                                  key={i}
                                  label={idx.trim()} 
                                  size="small" 
                                  color={parseInt(idx.trim()) >= 0 && parseInt(idx.trim()) <= 3 ? "success" : "error"}
                                />
                              ))}
                            </Box>
                          </TableCell>
                          <TableCell sx={{ maxWidth: 150, wordBreak: 'break-word' }}>
                            {row.solution || 'No solution'}
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={row.isValid ? "Valid" : "Invalid"} 
                              size="small" 
                              color={row.isValid ? "success" : "error"}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                {csvPreviewData.some(row => !row.isValid) && (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    Some rows have invalid format. Each row should have: /"question"/,/"option1"/,/"option2"/,/"option3"/,/"option4"/,correctIndex(es),/"solution"/
                  </Alert>
                )}
              </Grid>
            )}

            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Chapter: {chaptersData?.data?.find(c => c._id === selectedChapter)?.name}
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Section (Optional)</InputLabel>
                <Select
                  value={multiAddData.sectionId}
                  onChange={(e) => setMultiAddData({ ...multiAddData, sectionId: e.target.value })}
                  label="Section (Optional)"
                >
                  <MenuItem value="">
                    <em>No Section</em>
                  </MenuItem>
                  {sectionsData?.data?.map((section) => (
                    <MenuItem key={section._id} value={section._id}>
                      {section.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Autocomplete
                multiple
                options={topicsData?.data || []}
                getOptionLabel={(option) => option.topic}
                value={multiAddData.topicIds.map(id => topicsData?.data?.find(t => t._id === id)).filter(Boolean)}
                onChange={(e, newValue) => setMultiAddData({ 
                  ...multiAddData, 
                  topicIds: newValue.map(v => v._id) 
                })}
                renderInput={(params) => (
                  <TextField {...params} label="Topics" />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      label={option.topic}
                      {...getTagProps({ index })}
                      key={option._id}
                    />
                  ))
                }
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label="XP for Correct Answer"
                type="number"
                value={multiAddData.xpCorrect}
                onChange={(e) => setMultiAddData({ ...multiAddData, xpCorrect: parseInt(e.target.value) })}
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label="XP for Incorrect Answer"
                type="number"
                value={multiAddData.xpIncorrect}
                onChange={(e) => setMultiAddData({ ...multiAddData, xpIncorrect: parseInt(e.target.value) })}
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Mu (Difficulty)"
                type="number"
                step="0.1"
                value={multiAddData.mu}
                onChange={(e) => setMultiAddData({ ...multiAddData, mu: parseFloat(e.target.value) })}
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Sigma (Variance)"
                type="number"
                step="0.1"
                value={multiAddData.sigma}
                onChange={(e) => setMultiAddData({ ...multiAddData, sigma: parseFloat(e.target.value) })}
              />
            </Grid>

          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenMultiAddDialog(false)}>Cancel</Button>
          <Button onClick={handleMultiAdd} variant="contained">
            Add Questions
          </Button>
        </DialogActions>
      </Dialog>

      {/* Image Attach Dialog */}
      <Dialog open={imageDialogOpen} onClose={closeImageDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Attach Image</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {imageDialogTarget?.ques}
            </Typography>
            <Divider />
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" gutterBottom>Current</Typography>
                {imageDialogTarget?.quesImage ? (
                  <img
                    src={imageDialogTarget.quesImage}
                    alt="current"
                    style={{ width: '100%', maxHeight: 220, objectFit: 'contain', borderRadius: 6, border: '1px solid #eee' }}
                  />
                ) : (
                  <Typography variant="caption" color="text.secondary">No image</Typography>
                )}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" gutterBottom>Preview</Typography>
                {selectedImagePreview ? (
                  <img
                    src={selectedImagePreview}
                    alt="preview"
                    style={{ width: '100%', maxHeight: 220, objectFit: 'contain', borderRadius: 6, border: '1px solid #eee' }}
                  />
                ) : (
                  <Typography variant="caption" color="text.secondary">Pick an image to preview</Typography>
                )}
              </Box>
            </Box>

            <Box>
              <Button variant="outlined" component="label" startIcon={<UploadIcon />}>
                Choose Image
                <input type="file" accept="image/*" hidden onChange={onPickImage} />
              </Button>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeImageDialog} disabled={isUploadingImage}>Cancel</Button>
          <Button onClick={attachImage} variant="contained" disabled={!selectedImageFile || isUploadingImage}>
            {isUploadingImage ? 'Uploading...' : 'Attach'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Assign Section Dialog */}
      <Dialog open={bulkAssignDialogOpen} onClose={() => setBulkAssignDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Assign Section to Selected Questions</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" sx={{ mb: 2 }}>
              You are about to assign a section to {selectedRows.length} selected question{selectedRows.length !== 1 ? 's' : ''}.
            </Typography>
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Select Section</InputLabel>
              <Select
                value={selectedSectionForBulk}
                onChange={(e) => setSelectedSectionForBulk(e.target.value)}
                label="Select Section"
              >
                <MenuItem value="">
                  <em>No Section</em>
                </MenuItem>
                {sectionsData?.data?.map((section) => (
                  <MenuItem key={section._id} value={section._id}>
                    {section.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Alert severity="info">
              <Typography variant="body2">
                <strong>Note:</strong> This action will update all selected questions to have the same section assignment.
                {selectedSectionForBulk && selectedSectionForBulk !== 'no-section' && 
                  ` Questions will be assigned to "${sectionsData?.data?.find(s => s._id === selectedSectionForBulk)?.name}".`
                }
                {selectedSectionForBulk === 'no-section' && 
                  ' Questions will have no section assignment.'
                }
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkAssignDialogOpen(false)} disabled={isBulkAssigning}>
            Cancel
          </Button>
          <Button 
            onClick={handleBulkAssignSection} 
            variant="contained" 
            disabled={!selectedSectionForBulk || isBulkAssigning}
          >
            {isBulkAssigning ? 'Assigning...' : 'Assign Section'}
          </Button>
        </DialogActions>
      </Dialog>
        </>
      )}
    </Box>
  );
};

export default Questions;
