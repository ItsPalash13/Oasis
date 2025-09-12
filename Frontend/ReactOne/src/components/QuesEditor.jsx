import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Typography,
  Paper,
  Container,
  Divider,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  IconButton,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import { CloudUpload, Image, Lock, LockOpen } from '@mui/icons-material';
import 'katex/dist/katex.min.css';
import { 
  QuizContainer,
  QuestionCard,
  OptionCard,
  quizStyles
} from '../theme/quizTheme';
import { renderTextWithLatex } from '../utils/quesUtils.jsx';

const QuesEditor = ({ selectedChapter, selectedSection, selectedTopics = [], editingQuestion = null, onSave }) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [gridSize, setGridSize] = useState({ xs: 12, sm: 6, md: 3 }); // Default: 4 per row on desktop, 2 on tablet, 1 on mobile
  const [questionImages, setQuestionImages] = useState([]);
  const [solutionImages, setSolutionImages] = useState([]);
  const [correctOptions, setCorrectOptions] = useState([0]);
  const [solution, setSolution] = useState('');
  const [xpCorrect, setXpCorrect] = useState(2);
  const [xpIncorrect, setXpIncorrect] = useState(0);
  const [mu, setMu] = useState(0);
  const [sigma, setSigma] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [optionImages, setOptionImages] = useState([[], [], [], []]);

  // Check if question has content (either text or images)
  const hasQuestionText = question && question.trim() !== '';
  const hasQuestionImages = questionImages.some(img => 
    (img.url && img.url.trim() !== '') || (img.existingUrl && img.existingUrl.trim() !== '') || img.isModified
  );
  const hasQuestionContent = hasQuestionText || hasQuestionImages;

  // Check if all options have content (either text or images)
  const hasValidOptions = options.every((option, index) => {
    const hasOptionText = option && option.trim() !== '';
    const hasOptionImages = optionImages[index].some(img => 
      (img.url && img.url.trim() !== '') || (img.existingUrl && img.existingUrl.trim() !== '') || img.isModified
    );
    return hasOptionText || hasOptionImages;
  });

  const handleSave = async () => {
    if (!selectedChapter || !hasQuestionContent || !hasValidOptions) {
      return;
    }

    try {
      setIsSaving(true);

      // Prepare files array for upload
      const files = [];
      
      // Add question image files
      questionImages.forEach(img => {
        if (img.file && img.isModified) {
          files.push(img.file);
        }
      });

      // Add solution image files
      solutionImages.forEach(img => {
        if (img.file && img.isModified) {
          files.push(img.file);
        }
      });

      // Add option image files
      optionImages.forEach(optImgs => {
        optImgs.forEach(img => {
          if (img.file && img.isModified) {
            files.push(img.file);
          }
        });
      });

      console.log('Files to upload:', files);
      console.log('Question images:', questionImages);
      console.log('Solution images:', solutionImages);
      console.log('Option images:', optionImages);

      // Create FormData
      const formData = new FormData();
      
      // Add files
      files.forEach((file, index) => {
        formData.append('files', file);
      });

      // Prepare question data
      const data = {
        ques: question,
        options,
        correct: correctOptions,
        chapterId: selectedChapter,
        sectionId: selectedSection || undefined,
        topics: selectedTopics.map(topic => ({
          id: topic._id,
          name: topic.topic
        })),
        solution,
        xpCorrect,
        xpIncorrect,
        mu,
        sigma,
        quesImages: questionImages.map(img => ({
          caption: img.caption,
          width: img.width,
          height: img.height,
          lockRatio: img.lockRatio,
          originalRatio: img.originalRatio,
          existingUrl: img.existingUrl || '',
          isModified: !!img.file
        })),
        solutionImages: solutionImages.map(img => ({
          caption: img.caption,
          width: img.width,
          height: img.height,
          lockRatio: img.lockRatio,
          originalRatio: img.originalRatio,
          existingUrl: img.existingUrl || '',
          isModified: !!img.file
        })),
        optionImages: optionImages.map(optImgs => 
          optImgs.map(img => ({
            caption: img.caption,
            width: img.width,
            height: img.height,
            lockRatio: img.lockRatio,
            originalRatio: img.originalRatio,
            existingUrl: img.existingUrl || '',
            isModified: !!img.file
          }))
        ),
        gridSize,
        ...(editingQuestion && { _id: editingQuestion._id }) // Include ID when editing
      };

      // Add data to FormData
      formData.append('data', JSON.stringify(data));

      console.log('Sending FormData:', formData);
      console.log('Files array:', files);
      await onSave(formData, files);

      // Reset form
      setQuestion('');
      setOptions(['', '', '', '']);
      setCorrectOptions([0]);
      setSolution('');
      setXpCorrect(2);
      setXpIncorrect(0);
      setMu(0);
      setSigma(1);
      setQuestionImages([]);
      setSolutionImages([]);
      setOptionImages([[], [], [], []]);
      setGridSize({ xs: 12, sm: 6, md: 3 });

    } catch (error) {
      console.error('Error saving question:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Populate form when editingQuestion changes
  useEffect(() => {
    if (editingQuestion) {
      setQuestion(editingQuestion.ques || '');
      setOptions(editingQuestion.options || ['', '', '', '']);
      setCorrectOptions(Array.isArray(editingQuestion.correct) ? editingQuestion.correct : [editingQuestion.correct || 0]);
      setSolution(editingQuestion.solution || '');
      setXpCorrect(editingQuestion.xpCorrect || 2);
      setXpIncorrect(editingQuestion.xpIncorrect || 0);
      setMu(editingQuestion.questionTs?.difficulty?.mu || 0);
      setSigma(editingQuestion.questionTs?.difficulty?.sigma || 1);
      setGridSize(editingQuestion.gridSize || { xs: 12, sm: 6, md: 3 });
      
      // Set question images
      if (editingQuestion.quesImages && editingQuestion.quesImages.length > 0) {
        setQuestionImages(editingQuestion.quesImages.map(img => ({
          file: null,
          url: img.url || '',
          caption: img.caption || '',
          width: img.width || 200,
          height: img.height || 150,
          lockRatio: img.lockRatio !== undefined ? img.lockRatio : true,
          originalRatio: img.originalRatio || 1,
          existingUrl: img.url || '',
          isModified: false
        })));
      } else {
        setQuestionImages([]);
      }
      
      // Set solution images
      if (editingQuestion.solutionImages && editingQuestion.solutionImages.length > 0) {
        setSolutionImages(editingQuestion.solutionImages.map(img => ({
          file: null,
          url: img.url || '',
          caption: img.caption || '',
          width: img.width || 200,
          height: img.height || 150,
          lockRatio: img.lockRatio !== undefined ? img.lockRatio : true,
          originalRatio: img.originalRatio || 1,
          existingUrl: img.url || '',
          isModified: false
        })));
      } else {
        setSolutionImages([]);
      }
      
      // Set option images
      if (editingQuestion.optionImages && editingQuestion.optionImages.length > 0) {
        setOptionImages(editingQuestion.optionImages.map(optImgs => 
          optImgs.map(img => ({
            file: null,
            url: img.url || '',
            caption: img.caption || '',
            width: img.width || 200,
            height: img.height || 150,
            lockRatio: img.lockRatio !== undefined ? img.lockRatio : true,
            originalRatio: img.originalRatio || 1,
            existingUrl: img.url || '',
            isModified: false
          }))
        ));
      } else {
        setOptionImages([[], [], [], []]);
      }
    } else {
      // Reset form when not editing
      setQuestion('');
      setOptions(['', '', '', '']);
      setCorrectOptions([0]);
      setSolution('');
      setXpCorrect(2);
      setXpIncorrect(0);
      setMu(0);
      setSigma(1);
      setGridSize({ xs: 12, sm: 6, md: 3 });
      setQuestionImages([]);
      setSolutionImages([]);
      setOptionImages([[], [], [], []]);
    }
  }, [editingQuestion]);

  const handleQuestionChange = (event) => {
    setQuestion(event.target.value);
  };

  const handleOptionChange = (index, event) => {
    const newOptions = [...options];
    newOptions[index] = event.target.value;
    setOptions(newOptions);
  };

  const handleImageFileChange = (index, event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      const img = document.createElement('img');
      img.onload = () => {
        const originalRatio = img.width / img.height;
        const newImages = [...questionImages];
        const currentImage = newImages[index];
        newImages[index] = { 
          ...currentImage, 
          file, 
          url, 
          width: 200, 
          height: Math.round(200 / originalRatio),
          lockRatio: true,
          originalRatio,
          isModified: true,
          existingUrl: currentImage.existingUrl || ''  // Preserve existing URL
        };
        setQuestionImages(newImages);
      };
      img.src = url;
    }
  };

  const handleImageCaptionChange = (index, event) => {
    const newImages = [...questionImages];
    newImages[index].caption = event.target.value;
    setQuestionImages(newImages);
  };

  const handlePasteImage = (index, event) => {
    const items = event.clipboardData.items;
    for (let item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        const url = URL.createObjectURL(file);
        const img = document.createElement('img');
        img.onload = () => {
          const originalRatio = img.width / img.height;
          const newImages = [...questionImages];
          const currentImage = newImages[index];
          newImages[index] = { 
            ...currentImage, 
            file, 
            url, 
            width: 200, 
            height: Math.round(200 / originalRatio),
            lockRatio: true,
            originalRatio,
            isModified: true,
            existingUrl: currentImage.existingUrl || ''  // Preserve existing URL
          };
          setQuestionImages(newImages);
        };
        img.src = url;
        break;
      }
    }
  };

  // Solution image handlers
  const handleSolutionImageFileChange = (index, event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      const img = document.createElement('img');
      img.onload = () => {
        const originalRatio = img.width / img.height;
        const newImages = [...solutionImages];
        const currentImage = newImages[index];
        newImages[index] = { 
          ...currentImage, 
          file, 
          url, 
          width: 200, 
          height: Math.round(200 / originalRatio),
          lockRatio: true,
          originalRatio,
          isModified: true,
          existingUrl: currentImage.existingUrl || ''  // Preserve existing URL
        };
        setSolutionImages(newImages);
      };
      img.src = url;
    }
  };

  const handleSolutionImageCaptionChange = (index, event) => {
    const newImages = [...solutionImages];
    newImages[index].caption = event.target.value;
    setSolutionImages(newImages);
  };

  const handleSolutionPasteImage = (index, event) => {
    const items = event.clipboardData.items;
    for (let item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        const url = URL.createObjectURL(file);
        const img = document.createElement('img');
        img.onload = () => {
          const originalRatio = img.width / img.height;
          const newImages = [...solutionImages];
          newImages[index] = { 
            ...newImages[index], 
            file, 
            url, 
            width: 200, 
            height: Math.round(200 / originalRatio),
            lockRatio: true,
            originalRatio,
            isModified: true
          };
          setSolutionImages(newImages);
        };
        img.src = url;
        break;
      }
    }
  };

  const handleSolutionImageWidthChange = (index, event) => {
    const newWidth = parseInt(event.target.value) || 0;
    const newImages = [...solutionImages];
    const image = newImages[index];
    
    if (image.lockRatio && image.originalRatio) {
      image.height = Math.round(newWidth / image.originalRatio);
    }
    image.width = newWidth;
    setSolutionImages(newImages);
  };

  const handleSolutionImageHeightChange = (index, event) => {
    const newHeight = parseInt(event.target.value) || 0;
    const newImages = [...solutionImages];
    const image = newImages[index];
    
    if (image.lockRatio && image.originalRatio) {
      image.width = Math.round(newHeight * image.originalRatio);
    }
    image.height = newHeight;
    setSolutionImages(newImages);
  };

  const handleSolutionLockRatioToggle = (index) => {
    const newImages = [...solutionImages];
    newImages[index].lockRatio = !newImages[index].lockRatio;
    setSolutionImages(newImages);
  };

  const addSolutionImage = () => {
    setSolutionImages([...solutionImages, { file: null, url: '', caption: '', width: 200, height: 150, lockRatio: true, originalRatio: 1 }]);
  };

  const removeSolutionImage = (index) => {
    const newImages = solutionImages.filter((_, i) => i !== index);
    setSolutionImages(newImages);
  };

  const handleImageWidthChange = (index, event) => {
    const newWidth = parseInt(event.target.value) || 0;
    const newImages = [...questionImages];
    const image = newImages[index];
    
    if (image.lockRatio && image.originalRatio) {
      image.height = Math.round(newWidth / image.originalRatio);
    }
    image.width = newWidth;
    setQuestionImages(newImages);
  };

  const handleImageHeightChange = (index, event) => {
    const newHeight = parseInt(event.target.value) || 0;
    const newImages = [...questionImages];
    const image = newImages[index];
    
    if (image.lockRatio && image.originalRatio) {
      image.width = Math.round(newHeight * image.originalRatio);
    }
    image.height = newHeight;
    setQuestionImages(newImages);
  };

  const handleLockRatioToggle = (index) => {
    const newImages = [...questionImages];
    newImages[index].lockRatio = !newImages[index].lockRatio;
    setQuestionImages(newImages);
  };

  // Option image handlers
  const handleOptionImageFileChange = (optionIndex, imageIndex, event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      const img = document.createElement('img');
      img.onload = () => {
        const originalRatio = img.width / img.height;
        const newOptionImages = [...optionImages];
        const currentImage = newOptionImages[optionIndex][imageIndex];
        newOptionImages[optionIndex][imageIndex] = { 
          ...currentImage, 
          file, 
          url, 
          width: 200, 
          height: Math.round(200 / originalRatio),
          lockRatio: true,
          originalRatio,
          isModified: true,
          existingUrl: currentImage.existingUrl || ''  // Preserve existing URL
        };
        setOptionImages(newOptionImages);
      };
      img.src = url;
    }
  };

  const handleOptionImageCaptionChange = (optionIndex, imageIndex, event) => {
    const newOptionImages = [...optionImages];
    newOptionImages[optionIndex][imageIndex].caption = event.target.value;
    setOptionImages(newOptionImages);
  };

  const handleOptionPasteImage = (optionIndex, imageIndex, event) => {
    const items = event.clipboardData.items;
    for (let item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        const url = URL.createObjectURL(file);
        const img = document.createElement('img');
        img.onload = () => {
          const originalRatio = img.width / img.height;
          const newOptionImages = [...optionImages];
          newOptionImages[optionIndex][imageIndex] = { 
            ...newOptionImages[optionIndex][imageIndex], 
            file, 
            url, 
            width: 200, 
            height: Math.round(200 / originalRatio),
            lockRatio: true,
            originalRatio,
            isModified: true
          };
          setOptionImages(newOptionImages);
        };
        img.src = url;
        break;
      }
    }
  };

  const handleOptionImageWidthChange = (optionIndex, imageIndex, event) => {
    const newWidth = parseInt(event.target.value) || 0;
    const newOptionImages = [...optionImages];
    const image = newOptionImages[optionIndex][imageIndex];
    
    if (image.lockRatio && image.originalRatio) {
      image.height = Math.round(newWidth / image.originalRatio);
    }
    image.width = newWidth;
    setOptionImages(newOptionImages);
  };

  const handleOptionImageHeightChange = (optionIndex, imageIndex, event) => {
    const newHeight = parseInt(event.target.value) || 0;
    const newOptionImages = [...optionImages];
    const image = newOptionImages[optionIndex][imageIndex];
    
    if (image.lockRatio && image.originalRatio) {
      image.width = Math.round(newHeight * image.originalRatio);
    }
    image.height = newHeight;
    setOptionImages(newOptionImages);
  };

  const handleOptionLockRatioToggle = (optionIndex, imageIndex) => {
    const newOptionImages = [...optionImages];
    newOptionImages[optionIndex][imageIndex].lockRatio = !newOptionImages[optionIndex][imageIndex].lockRatio;
    setOptionImages(newOptionImages);
  };

  const addOptionImage = (optionIndex) => {
    const newOptionImages = [...optionImages];
    newOptionImages[optionIndex].push({ file: null, url: '', caption: '', width: 200, height: 150, lockRatio: true, originalRatio: 1 });
    setOptionImages(newOptionImages);
  };

  const removeOptionImage = (optionIndex, imageIndex) => {
    const newOptionImages = [...optionImages];
    newOptionImages[optionIndex].splice(imageIndex, 1);
    setOptionImages(newOptionImages);
  };

  const addImage = () => {
    setQuestionImages([...questionImages, { file: null, url: '', caption: '', width: 200, height: 150, lockRatio: true, originalRatio: 1 }]);
  };

  const removeImage = (index) => {
    const newImages = questionImages.filter((_, i) => i !== index);
    setQuestionImages(newImages);
  };


  return (
    <QuizContainer>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              {editingQuestion ? 'Edit Question' : 'Question Editor'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {editingQuestion ? 'Edit your question with LaTeX and formatting support' : 'Create your question with LaTeX and formatting support'}
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="primary"
            disabled={!selectedChapter || !hasQuestionContent || !hasValidOptions || isSaving}
            onClick={handleSave}
            sx={{ height: 'fit-content' }}
          >
{isSaving ? 'Saving...' : (editingQuestion ? 'Update Question' : 'Save Question')}
          </Button>
        </Box>

        {/* Selected Chapter and Section Info */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Chip
            label={`Chapter: ${selectedChapter ? 'Selected' : 'Not Selected'}`}
            color={selectedChapter ? 'primary' : 'default'}
            variant="outlined"
          />
          <Chip
            label={`Section: ${selectedSection ? 'Selected' : 'None'}`}
            color={selectedSection ? 'secondary' : 'default'}
            variant="outlined"
          />
        </Box>
      </Box>


      {/* Question Editor */}
      <QuestionCard>
        <CardContent sx={quizStyles.questionCardContent}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Chip 
              label="Question" 
              size="small" 
              sx={quizStyles.questionChip}
            />
          </Box>
          <TextField
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            label="Question Text"
            placeholder="Enter your question here... Use <tx>formula</tx> for LaTeX, <b>bold</b>, <i>italic</i>, <u>underline</u> for formatting."
            value={question}
            onChange={handleQuestionChange}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'background.paper',
              }
            }}
          />
        </CardContent>
      </QuestionCard>

      {/* Question Images Editor */}
      <QuestionCard>
        <CardContent sx={quizStyles.questionCardContent}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Chip 
              label="Question Images" 
              size="small" 
              sx={quizStyles.questionChip}
            />
            <Button
              variant="outlined"
              size="small"
              onClick={addImage}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontSize: '0.875rem'
              }}
            >
              + Add Image
            </Button>
          </Box>
          
          {questionImages.length > 0 && questionImages.map((image, index) => (
            <Box key={index} sx={{ mb: 3, p: 2, border: '1px solid', borderColor: 'grey.300', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                  Image {index + 1}
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  color="error"
                  onClick={() => removeImage(index)}
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    fontSize: '0.75rem',
                    minWidth: 'auto',
                    px: 1
                  }}
                >
                  Remove
                </Button>
              </Box>
              
              {/* File Upload Area */}
              <Box 
                sx={{ 
                  border: '2px dashed', 
                  borderColor: 'grey.300',
                  borderRadius: 2,
                  p: 3,
                  textAlign: 'center',
                  mb: 2,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    borderColor: 'primary.main',
                    backgroundColor: 'action.hover'
                  }
                }}
                onPaste={(e) => handlePasteImage(index, e)}
                onClick={() => document.getElementById(`file-input-${index}`).click()}
              >
                <input
                  id={`file-input-${index}`}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => handleImageFileChange(index, e)}
                />
                
                {image.url ? (
                  <Box>
                    <img
                      src={image.url}
                      alt="Preview"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '150px',
                        objectFit: 'contain',
                        borderRadius: 4
                      }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Click to change image or Ctrl+V to paste
                    </Typography>
                  </Box>
                ) : (
                  <Box>
                    <CloudUpload sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Click to upload image or Ctrl+V to paste
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Supports JPG, PNG, GIF, WebP
                    </Typography>
                  </Box>
                )}
              </Box>
              
              {/* Image Size Controls */}
              {image.url && (
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    {image.lockRatio ? <Lock sx={{ fontSize: 16, color: 'primary.main' }} /> : <LockOpen sx={{ fontSize: 16, color: 'text.secondary' }} />}
                    <FormControlLabel
                      control={
                        <Switch
                          checked={image.lockRatio}
                          onChange={() => handleLockRatioToggle(index)}
                          size="small"
                        />
                      }
                      label="Lock Ratio"
                      sx={{ m: 0 }}
                    />
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                      label="Width (px)"
                      type="number"
                      value={image.width}
                      onChange={(e) => handleImageWidthChange(index, e)}
                      size="small"
                      sx={{ flex: 1 }}
                      inputProps={{ min: 50, max: 800 }}
                    />
                    <TextField
                      label="Height (px)"
                      type="number"
                      value={image.height}
                      onChange={(e) => handleImageHeightChange(index, e)}
                      size="small"
                      sx={{ flex: 1 }}
                      inputProps={{ min: 50, max: 600 }}
                      disabled={image.lockRatio}
                    />
                  </Box>
                </Box>
              )}
              
              <TextField
                fullWidth
                variant="outlined"
                label="Image Caption"
                placeholder="Enter image caption..."
                value={image.caption}
                onChange={(e) => handleImageCaptionChange(index, e)}
              />
            </Box>
          ))}
        </CardContent>
      </QuestionCard>

      {/* Options Editors */}
      <QuestionCard>
        <CardContent sx={quizStyles.questionCardContent}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Chip 
              label="Options Layout" 
              size="small" 
              sx={quizStyles.questionChip}
            />
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>Mobile (xs)</InputLabel>
              <Select
                value={gridSize.xs}
                label="Mobile (xs)"
                onChange={(e) => setGridSize({...gridSize, xs: e.target.value})}
              >
                <MenuItem value={12}>1 per row</MenuItem>
                <MenuItem value={6}>2 per row</MenuItem>
                <MenuItem value={3}>4 per row</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>Tablet (sm)</InputLabel>
              <Select
                value={gridSize.sm}
                label="Tablet (sm)"
                onChange={(e) => setGridSize({...gridSize, sm: e.target.value})}
              >
                <MenuItem value={12}>1 per row</MenuItem>
                <MenuItem value={6}>2 per row</MenuItem>
                <MenuItem value={3}>4 per row</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>Desktop (md)</InputLabel>
              <Select
                value={gridSize.md}
                label="Desktop (md)"
                onChange={(e) => setGridSize({...gridSize, md: e.target.value})}
              >
                <MenuItem value={12}>1 per row</MenuItem>
                <MenuItem value={6}>2 per row</MenuItem>
                <MenuItem value={3}>4 per row</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </QuestionCard>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {options.map((option, optionIndex) => (
          <Grid size={{xs: gridSize.xs, sm: gridSize.sm, md: gridSize.md}} key={optionIndex}>
            <OptionCard>
              <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Chip 
                    label={`Option ${optionIndex + 1}`}
                    size="small" 
                    sx={quizStyles.questionChip}
                  />
                </Box>
                
                {/* Option Text */}
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  variant="outlined"
                  label={`Option ${optionIndex + 1}`}
                  placeholder={`Enter option ${optionIndex + 1}...`}
                  value={option}
                  onChange={(e) => handleOptionChange(optionIndex, e)}
                  sx={{
                    mb: 2,
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'background.paper',
                    }
                  }}
                />

                {/* Option Images */}
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>
                      Images
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => addOptionImage(optionIndex)}
                      sx={{
                        borderRadius: 1,
                        textTransform: 'none',
                        fontSize: '0.75rem',
                        minWidth: 'auto',
                        px: 1
                      }}
                    >
                      + Add
                    </Button>
                  </Box>
                  
                  {optionImages[optionIndex].length > 0 && optionImages[optionIndex].map((image, imageIndex) => (
                    <Box key={imageIndex} sx={{ mb: 2, p: 1.5, border: '1px solid', borderColor: 'grey.300', borderRadius: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                          Image {imageIndex + 1}
                        </Typography>
                        <Button
                          variant="outlined"
                          size="small"
                          color="error"
                          onClick={() => removeOptionImage(optionIndex, imageIndex)}
                          sx={{
                            borderRadius: 1,
                            textTransform: 'none',
                            fontSize: '0.7rem',
                            minWidth: 'auto',
                            px: 0.5,
                            py: 0.25
                          }}
                        >
                          Remove
                        </Button>
                      </Box>
                      
                      {/* File Upload Area */}
                      <Box 
                        sx={{ 
                          border: '2px dashed', 
                          borderColor: 'grey.300',
                          borderRadius: 1,
                          p: 2,
                          textAlign: 'center',
                          mb: 1,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease-in-out',
                          '&:hover': {
                            borderColor: 'primary.main',
                            backgroundColor: 'action.hover'
                          }
                        }}
                        onPaste={(e) => handleOptionPasteImage(optionIndex, imageIndex, e)}
                        onClick={() => document.getElementById(`option-file-input-${optionIndex}-${imageIndex}`).click()}
                      >
                        <input
                          id={`option-file-input-${optionIndex}-${imageIndex}`}
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => handleOptionImageFileChange(optionIndex, imageIndex, e)}
                        />
                        
                        {image.url ? (
                          <Box>
                            <img
                              src={image.url}
                              alt="Preview"
                              style={{
                                maxWidth: '100%',
                                maxHeight: '100px',
                                objectFit: 'contain',
                                borderRadius: 4
                              }}
                            />
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                              Click to change or Ctrl+V to paste
                            </Typography>
                          </Box>
                        ) : (
                          <Box>
                            <CloudUpload sx={{ fontSize: 32, color: 'grey.400', mb: 0.5 }} />
                            <Typography variant="caption" color="text.secondary">
                              Click to upload or Ctrl+V to paste
                            </Typography>
                          </Box>
                        )}
                      </Box>
                      
                      {/* Size Controls */}
                      {image.url && (
                        <Box sx={{ mb: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            {image.lockRatio ? <Lock sx={{ fontSize: 14, color: 'primary.main' }} /> : <LockOpen sx={{ fontSize: 14, color: 'text.secondary' }} />}
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={image.lockRatio}
                                  onChange={() => handleOptionLockRatioToggle(optionIndex, imageIndex)}
                                  size="small"
                                />
                              }
                              label="Lock Ratio"
                              sx={{ m: 0 }}
                            />
                          </Box>
                          
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <TextField
                              label="Width"
                              type="number"
                              value={image.width}
                              onChange={(e) => handleOptionImageWidthChange(optionIndex, imageIndex, e)}
                              size="small"
                              sx={{ flex: 1 }}
                              inputProps={{ min: 50, max: 300 }}
                            />
                            <TextField
                              label="Height"
                              type="number"
                              value={image.height}
                              onChange={(e) => handleOptionImageHeightChange(optionIndex, imageIndex, e)}
                              size="small"
                              sx={{ flex: 1 }}
                              inputProps={{ min: 50, max: 300 }}
                              disabled={image.lockRatio}
                            />
                          </Box>
                        </Box>
                      )}
                      
                      <TextField
                        fullWidth
                        variant="outlined"
                        label="Caption"
                        placeholder="Enter image caption..."
                        value={image.caption}
                        onChange={(e) => handleOptionImageCaptionChange(optionIndex, imageIndex, e)}
                        size="small"
                      />
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </OptionCard>
          </Grid>
        ))}
      </Grid>

      {/* Correct Option Selection */}
      <QuestionCard>
        <CardContent sx={quizStyles.questionCardContent}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Chip 
              label="Correct Answer" 
              size="small" 
              sx={quizStyles.questionChip}
            />
          </Box>
          
          <FormControl fullWidth>
            <InputLabel>Select Correct Options</InputLabel>
            <Select
              multiple
              value={correctOptions}
              onChange={(e) => setCorrectOptions(e.target.value)}
              label="Select Correct Options"
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={`Option ${value + 1}`} size="small" />
                  ))}
                </Box>
              )}
            >
              {options.map((option, index) => (
                <MenuItem key={index} value={index}>
                  Option {index + 1}: {option || 'Empty option'}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </CardContent>
      </QuestionCard>

      {/* Solution Section */}
      <QuestionCard>
        <CardContent sx={quizStyles.questionCardContent}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Chip 
              label="Solution" 
              size="small" 
              sx={quizStyles.questionChip}
            />
          </Box>
          
          <TextField
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            label="Solution"
            placeholder="Enter solution explanation... Use <tx>formula</tx> for LaTeX, <b>bold</b>, <i>italic</i>, <u>underline</u> for formatting."
            value={solution}
            onChange={(e) => setSolution(e.target.value)}
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'background.paper',
              }
            }}
          />

          {/* Solution Images Editor */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>
                Solution Images
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={addSolutionImage}
                sx={{
                  borderRadius: 1,
                  textTransform: 'none',
                  fontSize: '0.75rem',
                  minWidth: 'auto',
                  px: 1
                }}
              >
                + Add Image
              </Button>
            </Box>
            
            {solutionImages.length > 0 && solutionImages.map((image, index) => (
              <Box key={index} sx={{ mb: 2, p: 1.5, border: '1px solid', borderColor: 'grey.300', borderRadius: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                    Image {index + 1}
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    color="error"
                    onClick={() => removeSolutionImage(index)}
                    sx={{
                      borderRadius: 1,
                      textTransform: 'none',
                      fontSize: '0.7rem',
                      minWidth: 'auto',
                      px: 0.5,
                      py: 0.25
                    }}
                  >
                    Remove
                  </Button>
                </Box>
                
                {/* File Upload Area */}
                <Box 
                  sx={{ 
                    border: '2px dashed', 
                    borderColor: 'grey.300',
                    borderRadius: 1,
                    p: 2,
                    textAlign: 'center',
                    mb: 1,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      borderColor: 'primary.main',
                      backgroundColor: 'action.hover'
                    }
                  }}
                  onPaste={(e) => handleSolutionPasteImage(index, e)}
                  onClick={() => document.getElementById(`solution-file-input-${index}`).click()}
                >
                  <input
                    id={`solution-file-input-${index}`}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => handleSolutionImageFileChange(index, e)}
                  />
                  
                  {image.url ? (
                    <Box>
                      <img
                        src={image.url}
                        alt="Preview"
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100px',
                          objectFit: 'contain',
                          borderRadius: 4
                        }}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        Click to change or Ctrl+V to paste
                      </Typography>
                    </Box>
                  ) : (
                    <Box>
                      <CloudUpload sx={{ fontSize: 32, color: 'grey.400', mb: 0.5 }} />
                      <Typography variant="caption" color="text.secondary">
                        Click to upload or Ctrl+V to paste
                      </Typography>
                    </Box>
                  )}
                </Box>
                
                {/* Size Controls */}
                {image.url && (
                  <Box sx={{ mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      {image.lockRatio ? <Lock sx={{ fontSize: 14, color: 'primary.main' }} /> : <LockOpen sx={{ fontSize: 14, color: 'text.secondary' }} />}
                      <FormControlLabel
                        control={
                          <Switch
                            checked={image.lockRatio}
                            onChange={() => handleSolutionLockRatioToggle(index)}
                            size="small"
                          />
                        }
                        label="Lock Ratio"
                        sx={{ m: 0 }}
                      />
                    </Box>
                    
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <TextField
                        label="Width"
                        type="number"
                        value={image.width}
                        onChange={(e) => handleSolutionImageWidthChange(index, e)}
                        size="small"
                        sx={{ flex: 1 }}
                        inputProps={{ min: 50, max: 300 }}
                      />
                      <TextField
                        label="Height"
                        type="number"
                        value={image.height}
                        onChange={(e) => handleSolutionImageHeightChange(index, e)}
                        size="small"
                        sx={{ flex: 1 }}
                        inputProps={{ min: 50, max: 300 }}
                        disabled={image.lockRatio}
                      />
                    </Box>
                  </Box>
                )}
                
                <TextField
                  fullWidth
                  variant="outlined"
                  label="Caption"
                  placeholder="Enter image caption..."
                  value={image.caption}
                  onChange={(e) => handleSolutionImageCaptionChange(index, e)}
                  size="small"
                />
              </Box>
            ))}
          </Box>
        </CardContent>
      </QuestionCard>

      {/* XP and Difficulty Settings */}
      <QuestionCard>
        <CardContent sx={quizStyles.questionCardContent}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Chip 
              label="XP & Difficulty" 
              size="small" 
              sx={quizStyles.questionChip}
            />
          </Box>
          
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="XP for Correct Answer"
                type="number"
                value={xpCorrect}
                onChange={(e) => setXpCorrect(parseInt(e.target.value) || 0)}
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="XP for Incorrect Answer"
                type="number"
                value={xpIncorrect}
                onChange={(e) => setXpIncorrect(parseInt(e.target.value) || 0)}
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Mu (Difficulty)"
                type="number"
                step="0.1"
                value={mu}
                onChange={(e) => setMu(parseFloat(e.target.value) || 0)}
                helperText="Average difficulty level"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Sigma (Variance)"
                type="number"
                step="0.1"
                value={sigma}
                onChange={(e) => setSigma(parseFloat(e.target.value) || 1)}
                helperText="Difficulty variance"
              />
            </Grid>
          </Grid>
        </CardContent>
      </QuestionCard>

      <Divider sx={{ my: 3 }} />

      {/* Preview Section */}
      <Box>
        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
          Preview
        </Typography>
        
        {/* Question Preview */}
        <QuestionCard>
          <CardContent sx={quizStyles.questionCardContent}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Chip 
                label="Question" 
                size="small" 
                sx={quizStyles.questionChip}
              />
            </Box>
            {/* Topic chips */}
            <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
              {selectedTopics.map((topic) => (
                <Chip 
                  key={topic._id}
                  label={topic.topic} 
                  size="small" 
                  sx={{
                    backgroundColor: theme => theme.palette.mode === 'dark' ? '#444' : '#1F1F1F',
                    color: theme => theme.palette.mode === 'dark' ? 'white' : 'white',
                    '&:hover': {
                      backgroundColor: theme => theme.palette.mode === 'dark' ? '#555' : '#2A2A2A',
                    }
                  }}
                />
              ))}
              {selectedTopics.length === 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  No topics selected. Please select topics from the dropdown above.
                </Typography>
              )}
            </Box>
            {(hasQuestionText || hasQuestionImages) ? (
              hasQuestionText ? (
                <Typography 
                  gutterBottom
                  sx={quizStyles.questionTitle}
                >
                  {renderTextWithLatex(question)}
                </Typography>
              ) : (
                <Typography 
                  gutterBottom
                  sx={{
                    ...quizStyles.questionTitle,
                    color: 'text.secondary',
                    fontStyle: 'italic'
                  }}
                >
                  [Image-only question]
                </Typography>
              )
            ) : (
              <Typography 
                gutterBottom
                sx={{
                  ...quizStyles.questionTitle,
                  color: 'text.secondary',
                  fontStyle: 'italic'
                }}
              >
                Please add question text or images
              </Typography>
            )}
            
            {/* Question Images Preview */}
            {questionImages.some(img => img.url) && (
              <Box sx={{ mt: 2 }}>
                <Box sx={{ 
                  display: 'flex', 
                  gap: 2, 
                  flexWrap: 'wrap',
                  alignItems: 'flex-start'
                }}>
                  {questionImages.map((image, index) => (
                    image.url && (
                      <Box key={index} sx={{ 
                        flex: '0 0 auto',
                        width: `${image.width}px`,
                        height: `${image.height}px`,
                        minWidth: '50px',
                        minHeight: '50px'
                      }}>
                        <img
                          src={image.url}
                          alt={image.caption || `Question image ${index + 1}`}
                          style={{ 
                            width: '100%', 
                            height: '100%',
                            objectFit: 'cover', 
                            borderRadius: 8 
                          }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                        {image.caption && image.caption.trim() && (
                          <Typography 
                            variant="caption" 
                            color="text.secondary" 
                            sx={{ 
                              display: 'block', 
                              mt: 1, 
                              fontStyle: 'italic',
                              textAlign: 'center',
                              fontSize: '0.75rem',
                              lineHeight: 1
                            }}
                          >
                            {image.caption}
                          </Typography>
                        )}
                      </Box>
                    )
                  ))}
                </Box>
              </Box>
            )}

            {/* Solution Preview */}
            {solution && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Solution:
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    '& .katex': {
                      fontSize: '1em'
                    }
                  }}
                >
                  {renderTextWithLatex(solution)}
                </Typography>
                
                {/* Solution Images Preview */}
                {solutionImages.some(img => img.url) && (
                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ 
                      display: 'flex', 
                      gap: 2, 
                      flexWrap: 'wrap',
                      alignItems: 'flex-start'
                    }}>
                      {solutionImages.map((image, index) => (
                        image.url && (
                          <Box key={index} sx={{ 
                            flex: '0 0 auto',
                            width: `${image.width}px`,
                            height: `${image.height}px`,
                            minWidth: '50px',
                            minHeight: '50px'
                          }}>
                            <img
                              src={image.url}
                              alt={image.caption || `Solution image ${index + 1}`}
                              style={{ 
                                width: '100%', 
                                height: '100%',
                                objectFit: 'cover', 
                                borderRadius: 8 
                              }}
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                            {image.caption && image.caption.trim() && (
                              <Typography 
                                variant="caption" 
                                color="text.secondary" 
                                sx={{ 
                                  display: 'block', 
                                  mt: 1, 
                                  fontStyle: 'italic',
                                  textAlign: 'center',
                                  fontSize: '0.75rem',
                                  lineHeight: 1
                                }}
                              >
                                {image.caption}
                              </Typography>
                            )}
                          </Box>
                        )
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            )}
          </CardContent>
        </QuestionCard>

        {/* Options Preview */}
        <Grid container spacing={3} sx={{ mt: 2 }}>
          {options.map((option, optionIndex) => (
            <Grid size={{xs: gridSize.xs, sm: gridSize.sm, md: gridSize.md}} key={optionIndex}>
              <OptionCard sx={{
                border: correctOptions.includes(optionIndex) ? '2px solid' : 'none',
                borderColor: correctOptions.includes(optionIndex) ? 'success.main' : 'transparent',
                backgroundColor: correctOptions.includes(optionIndex) ? 'success.50' : 'inherit'
              }}>
                <CardContent>
                  {correctOptions.includes(optionIndex) && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                      <Chip 
                        label="Correct Answer" 
                        size="small" 
                        color="success"
                        variant="filled"
                      />
                    </Box>
                  )}
                  {(() => {
                    const hasOptionText = option && option.trim() !== '';
                    const hasOptionImages = optionImages[optionIndex].some(img => img.url && img.url.trim() !== '');
                    
                    if (hasOptionText || hasOptionImages) {
                      return hasOptionText ? (
                        <Typography 
                          variant="body1" 
                          align="center"
                          sx={{
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            '& .katex': {
                              fontSize: '1em'
                            }
                          }}
                        >
                          {renderTextWithLatex(option)}
                        </Typography>
                      ) : (
                        <></>
                      );
                    } else {
                      return (
                        <Typography 
                          variant="body1" 
                          align="center"
                          sx={{ 
                            color: 'text.secondary',
                            fontStyle: 'italic' 
                          }}
                        >
                          Please add option text or images
                        </Typography>
                      );
                    }
                  })()}
                  
                  {/* Option Images Preview */}
                  {optionImages[optionIndex].some(img => img.url) && (
                    <Box sx={{ mt: 2 }}>
                      <Box sx={{ 
                        display: 'flex', 
                        gap: 1, 
                        flexWrap: 'wrap',
                        alignItems: 'flex-start',
                        justifyContent: 'center'
                      }}>
                        {optionImages[optionIndex].map((image, imageIndex) => (
                          image.url && (
                            <Box key={imageIndex} sx={{ 
                              flex: '0 0 auto',
                              width: `${image.width}px`,
                              height: `${image.height}px`,
                              minWidth: '50px',
                              minHeight: '50px'
                            }}>
                              <img
                                src={image.url}
                                alt={image.caption || `Option ${optionIndex + 1} image ${imageIndex + 1}`}
                                style={{ 
                                  width: '100%', 
                                  height: '100%',
                                  objectFit: 'cover', 
                                  borderRadius: 8 
                                }}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                              {image.caption && image.caption.trim() && (
                                <Typography 
                                  variant="caption" 
                                  color="text.secondary" 
                                  sx={{ 
                                    display: 'block', 
                                    mt: 0.5, 
                                    fontStyle: 'italic',
                                    textAlign: 'center',
                                    fontSize: '0.7rem',
                                    lineHeight: 1
                                  }}
                                >
                                  {image.caption}
                                </Typography>
                              )}
                            </Box>
                          )
                        ))}
                      </Box>
                    </Box>
                  )}
                </CardContent>
              </OptionCard>
            </Grid>
          ))}
        </Grid>

        {/* Formatting Examples */}
        {!hasQuestionContent && !hasValidOptions && (
          <Paper
            elevation={1}
            sx={{
              p: 3,
              mt: 3,
              backgroundColor: 'grey.50',
              border: '1px solid',
              borderColor: 'grey.300'
            }}
          >
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontStyle: 'italic' }}
            >
              <strong>Formatting Examples:</strong>
              <br />
              <strong>LaTeX:</strong>
              <br />
              • <code>{'<tx>x^2 + y^2 = z^2</tx>'}</code>
              <br />
              • <code>{'<tx>\\frac{a}{b}</tx>'}</code>
              <br />
              • <code>{'<tx>\\sum_{i=1}^{n} x_i</tx>'}</code>
              <br />
              <br />
              <strong>Text Formatting:</strong>
              <br />
              • <code>{'<b>bold text</b>'}</code>
              <br />
              • <code>{'<i>italic text</i>'}</code>
              <br />
              • <code>{'<u>underlined text</u>'}</code>
            </Typography>
          </Paper>
        )}
      </Box>
    </QuizContainer>
  );
};

export default QuesEditor;
