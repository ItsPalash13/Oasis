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
  TableRow
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Upload as UploadIcon, Search as SearchIcon } from '@mui/icons-material';
import {
  useGetQuestionsQuery,
  useCreateQuestionMutation,
  useMultiAddQuestionsMutation,
  useUpdateQuestionMutation,
  useDeleteQuestionMutation,
  useGetChaptersQuery,
  useGetTopicsQuery,
  useGetSectionsQuery,
  useBulkAssignSectionMutation
} from '../../features/api/adminAPI';
import { useUploadQuestionImageMutation } from '../../features/api/adminAPI';
import { saveAs } from 'file-saver';

const Questions = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const [openMultiAddDialog, setOpenMultiAddDialog] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopicFilters, setSelectedTopicFilters] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [multiAddData, setMultiAddData] = useState({
    questions: '',
    chapterId: '',
    sectionId: '',
    topicIds: [],
    xpCorrect: 2,
    xpIncorrect: 0,
    mu: 0,
    sigma: 1,
    solutionType: 'text'
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
    if (selectedTopicFilters.length > 0) {
      filtered = filtered.filter(question => {
        const questionTopics = question.topics?.map(topic => topic.name || topic.topic || '') || [];
        return selectedTopicFilters.every(selectedTopic => 
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
  }, [questionsData?.data, searchQuery, selectedTopicFilters, selectedSection]);
  
  const [createQuestion] = useCreateQuestionMutation();
  const [multiAddQuestions] = useMultiAddQuestionsMutation();
  const [updateQuestion] = useUpdateQuestionMutation();
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

  const [formData, setFormData] = useState({
    ques: '',
    options: ['', '', '', ''],
    correct: 0,
    chapterId: '',
    sectionId: '',
    topics: [],
    solution: '',
    solutionType: 'text'
  });

  const handleOpenDialog = (question = null) => {
    if (question) {
      setEditingQuestion(question);
      setFormData({
        ques: question.ques,
        options: question.options,
        correct: question.correct,
        chapterId: question.chapterId?._id || question.chapterId,
        sectionId: question.sectionId?._id || question.sectionId || '',
        topics: question.topics || [],
        solution: question.solution || '',
        solutionType: question.solutionType || 'text'
      });
    } else {
      setEditingQuestion(null);
      setFormData({
        ques: '',
        options: ['', '', '', ''],
        correct: 0,
        chapterId: selectedChapter,
        sectionId: selectedSection,
        topics: [],
        solution: '',
        solutionType: 'text'
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingQuestion(null);
    setFormData({
      ques: '',
      options: ['', '', '', ''],
      correct: 0,
      chapterId: '',
      sectionId: '',
      topics: [],
      solution: '',
      solutionType: 'text'
    });
  };

  const handleSubmit = async () => {
    try {
      if (editingQuestion) {
        await updateQuestion({ id: editingQuestion._id, ...formData }).unwrap();
      } else {
        await createQuestion(formData).unwrap();
      }
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving question:', error);
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
        isValid: parts.length >= 6 && parts[0] && parts[1] && parts[2] && parts[3] && parts[4]
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
        return [question, option1, option2, option3, option4, parseInt(correctIndex), solution];
      });

      await multiAddQuestions({
        questions: parsedQuestions,
        chapterId: selectedChapter,
        sectionId: multiAddData.sectionId || undefined,
        topicIds: multiAddData.topicIds,
        xpCorrect: multiAddData.xpCorrect,
        xpIncorrect: multiAddData.xpIncorrect,
        mu: multiAddData.mu,
        sigma: multiAddData.sigma,
        solutionType: multiAddData.solutionType
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
        sigma: 1,
        solutionType: 'text'
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
      // Correct index
      const correctIndex = escapeCSV(q.correct);
      // Mu and Sigma
      const mu = escapeCSV(q.questionTs?.difficulty?.mu ?? '');
      const sigma = escapeCSV(q.questionTs?.difficulty?.sigma ?? '');
      // Solution
      const solution = escapeCSV(`/"${q.solution || ''}"/`);
      // Solution Type
      const solutionType = escapeCSV(q.solutionType || 'text');
      // Topics as JSON array of topic names
      const topicsArr = (q.topics || []).map(t => t.name || t.topic || '').filter(Boolean);
      const topicsJson = escapeCSV(JSON.stringify(topicsArr));
      // Join all fields
      return [question, ...options, correctIndex, mu, sigma, solution, solutionType, topicsJson].join(',');
    });
    // Add header
    const header = '/question/,option1,option2,option3,option4,correctIndex,mu,sigma,solution,solutionType,topics';
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
              variant={params.row.correct === index ? "filled" : "outlined"}
              color={params.row.correct === index ? "success" : "default"}
              sx={{ mr: 0.5, mb: 0.5 }}
            />
          ))}
        </Box>
      )
    },
    {
      field: 'quesImage',
      headerName: 'Image',
      width: 120,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {params.value ? (
            <img src={params.value} alt="question" style={{ width: 56, height: 40, objectFit: 'cover', borderRadius: 4 }} />
          ) : (
            <Typography variant="caption" color="text.secondary">None</Typography>
          )}
        </Box>
      )
    },
    {
      field: 'quesImageUrl',
      headerName: 'Image URL',
      flex: 1,
      minWidth: 260,
      renderCell: (params) => (
        params.row.quesImage ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
            <a href={params.row.quesImage} target="_blank" rel="noreferrer" style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'inline-block',
              maxWidth: '100%'
            }}>
              {params.row.quesImage}
            </a>
          </Box>
        ) : (
          <Typography variant="caption" color="text.secondary">N/A</Typography>
        )
      )
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
      field: 'solutionType', 
      headerName: 'Solution Type', 
      width: 120,
      renderCell: (params) => (
        <Chip 
          label={params.value || 'text'} 
          size="small" 
          color={params.value === 'latex' ? 'secondary' : 'default'}
          variant={params.value === 'latex' ? 'filled' : 'outlined'}
        />
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 220,
      renderCell: (params) => (
        <Box>
          <IconButton onClick={() => handleOpenDialog(params.row)} size="small">
            <EditIcon />
          </IconButton>
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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel id="chapter-select-label">Chapter</InputLabel>
          <Select
            labelId="chapter-select-label"
            label="Chapter"
            value={selectedChapter}
            onChange={(e) => {
              setSelectedChapter(e.target.value);
              setSelectedSection(''); // Reset section when chapter changes
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
            title="Filter questions by section"
          >
            <MenuItem value="">
              <em>All Sections</em>
            </MenuItem>
            {sectionsData?.data?.map((section) => (
              <MenuItem key={section._id} value={section._id}>
                {section.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 300 }}>
          <InputLabel id="topic-filter-label">Filter by Topics</InputLabel>
          <Select
            labelId="topic-filter-label"
            label="Filter by Topics"
            multiple
            value={selectedTopicFilters}
            onChange={(e) => setSelectedTopicFilters(e.target.value)}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value) => (
                  <Chip key={value} label={value} size="small" />
                ))}
              </Box>
            )}
          >
            {topicsData?.data?.map((topic) => (
              <MenuItem key={topic._id} value={topic.topic}>
                {topic.topic}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
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
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          disabled={!selectedChapter}
        >
          Add Question
        </Button>
      </Box>

      {/* Filter Summary */}
      {(selectedChapter || selectedSection || selectedTopicFilters.length > 0) && (
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
            {selectedTopicFilters.map((topic, index) => (
              <Chip
                key={index}
                label={`Topic: ${topic}`}
                color="info"
                variant="outlined"
                onDelete={() => {
                  const newFilters = selectedTopicFilters.filter((_, i) => i !== index);
                  setSelectedTopicFilters(newFilters);
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
                setSelectedTopicFilters([]);
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
            {selectedTopicFilters.length > 0 && ` matching ${selectedTopicFilters.length} topic filter${selectedTopicFilters.length !== 1 ? 's' : ''}`}
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
            console.log('Selected rows changed:', newSelectionModel.ids);
            setSelectedRows([...newSelectionModel.ids]);
          }}
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
          }}
        />
      </Box>

      {/* Single Question Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingQuestion ? 'Edit Question' : 'Add New Question'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Question"
                multiline
                rows={3}
                value={formData.ques}
                onChange={(e) => setFormData({ ...formData, ques: e.target.value })}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Chapter: {chaptersData?.data?.find(c => c._id === selectedChapter)?.name}
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Section (Optional)</InputLabel>
                <Select
                  value={formData.sectionId}
                  onChange={(e) => setFormData({ ...formData, sectionId: e.target.value })}
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
                value={formData.topics}
                onChange={(e, newValue) => setFormData({ ...formData, topics: newValue })}
                renderInput={(params) => (
                  <TextField {...params} label="Topics" />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      label={option.name}
                      {...getTagProps({ index })}
                      key={option._id}
                    />
                  ))
                }
              />
            </Grid>

            {formData.options.map((option, index) => (
              <Grid item xs={12} key={index}>
                <TextField
                  fullWidth
                  label={`Option ${index + 1}`}
                  value={option}
                  onChange={(e) => {
                    const newOptions = [...formData.options];
                    newOptions[index] = e.target.value;
                    setFormData({ ...formData, options: newOptions });
                  }}
                />
              </Grid>
            ))}

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Correct Answer</InputLabel>
                <Select
                  value={formData.correct}
                  onChange={(e) => setFormData({ ...formData, correct: e.target.value })}
                >
                  {formData.options.map((option, index) => (
                    <MenuItem key={index} value={index}>
                      Option {index + 1}: {option}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Solution (Optional)"
                multiline
                rows={3}
                value={formData.solution}
                onChange={(e) => setFormData({ ...formData, solution: e.target.value })}
                placeholder="Provide detailed explanation for the correct answer..."
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Solution Type</InputLabel>
                <Select
                  value={formData.solutionType}
                  onChange={(e) => setFormData({ ...formData, solutionType: e.target.value })}
                  label="Solution Type"
                >
                  <MenuItem value="text">Text</MenuItem>
                  <MenuItem value="latex">LaTeX</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingQuestion ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Multi Add Dialog */}
      <Dialog open={openMultiAddDialog} onClose={() => setOpenMultiAddDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Multi Add Questions</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Format: /"question"/,/"option1"/,/"option2"/,/"option3"/,/"option4"/,correctIndex,/"solution"/ (one per line)<br/>
            Note: Solution is optional. You can omit it or leave it empty by using /""/. Mu and Sigma values are set below for all questions.
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
                placeholder={'Format: /"question"/,/"option1"/,/"option2"/,/"option3"/,/"option4"/,correctIndex,/"solution"/'}
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
                            <Chip 
                              label={row.correctIndex} 
                              size="small" 
                              color={row.correctIndex >= 0 && row.correctIndex <= 3 ? "success" : "error"}
                            />
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
                    Some rows have invalid format. Each row should have: /"question"/,/"option1"/,/"option2"/,/"option3"/,/"option4"/,correctIndex,/"solution"/
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

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Solution Type</InputLabel>
                <Select
                  value={multiAddData.solutionType}
                  onChange={(e) => setMultiAddData({ ...multiAddData, solutionType: e.target.value })}
                  label="Solution Type"
                >
                  <MenuItem value="text">Text</MenuItem>
                  <MenuItem value="latex">LaTeX</MenuItem>
                </Select>
              </FormControl>
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
    </Box>
  );
};

export default Questions;
