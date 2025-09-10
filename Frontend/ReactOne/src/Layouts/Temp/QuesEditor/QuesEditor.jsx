import React, { useState } from 'react';
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
import { InlineMath } from 'react-katex';
import { 
  QuizContainer,
  QuestionCard,
  OptionCard,
  quizStyles
} from '../../../theme/quizTheme';

const QuesEditor = () => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [gridSize, setGridSize] = useState({ xs: 12, sm: 6, md: 3 }); // Default: 4 per row on desktop, 2 on tablet, 1 on mobile
  const [questionImages, setQuestionImages] = useState([{ file: null, url: '', caption: '', width: 200, height: 150, lockRatio: true, originalRatio: 1 }]);
  const [optionImages, setOptionImages] = useState([
    [{ file: null, url: '', caption: '', width: 200, height: 150, lockRatio: true, originalRatio: 1 }],
    [{ file: null, url: '', caption: '', width: 200, height: 150, lockRatio: true, originalRatio: 1 }],
    [{ file: null, url: '', caption: '', width: 200, height: 150, lockRatio: true, originalRatio: 1 }],
    [{ file: null, url: '', caption: '', width: 200, height: 150, lockRatio: true, originalRatio: 1 }]
  ]);

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
        newImages[index] = { 
          ...newImages[index], 
          file, 
          url, 
          width: 200, 
          height: Math.round(200 / originalRatio),
          lockRatio: true,
          originalRatio 
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
          newImages[index] = { 
            ...newImages[index], 
            file, 
            url, 
            width: 200, 
            height: Math.round(200 / originalRatio),
            lockRatio: true,
            originalRatio 
          };
          setQuestionImages(newImages);
        };
        img.src = url;
        break;
      }
    }
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
        newOptionImages[optionIndex][imageIndex] = { 
          ...newOptionImages[optionIndex][imageIndex], 
          file, 
          url, 
          width: 200, 
          height: Math.round(200 / originalRatio),
          lockRatio: true,
          originalRatio 
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
            originalRatio 
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
    if (newOptionImages[optionIndex].length > 1) {
      newOptionImages[optionIndex].splice(imageIndex, 1);
      setOptionImages(newOptionImages);
    }
  };

  const addImage = () => {
    setQuestionImages([...questionImages, { file: null, url: '', caption: '', width: 200, height: 150, lockRatio: true, originalRatio: 1 }]);
  };

  const removeImage = (index) => {
    if (questionImages.length > 1) {
      const newImages = questionImages.filter((_, i) => i !== index);
      setQuestionImages(newImages);
    }
  };

  const renderTextWithLatex = (text) => {
    if (!text) return null;

    // Split text by <tx> tags first
    const latexParts = text.split(/(<tx>.*?<\/tx>)/g);
    
    return latexParts.map((latexPart, latexIndex) => {
      // Check if this part is a LaTeX expression
      if (latexPart.startsWith('<tx>') && latexPart.endsWith('</tx>')) {
        const latexContent = latexPart.slice(4, -5); // Remove <tx> and </tx>
        try {
          return (
            <InlineMath key={`latex-${latexIndex}`} math={latexContent} />
          );
        } catch (error) {
          // If LaTeX parsing fails, show the original text
          return (
            <span key={`latex-error-${latexIndex}`} style={{ color: 'red', fontStyle: 'italic' }}>
              [LaTeX Error: {latexPart}]
            </span>
          );
        }
      }
      
      // For non-LaTeX parts, process nested HTML formatting tags recursively
      const parseNestedHtml = (textPart, keyPrefix = '') => {
        if (!textPart) return null;
        
        // Find the first opening tag
        const tagRegex = /<([biu])>/;
        const match = textPart.match(tagRegex);
        
        if (!match) {
          // No more tags, handle as regular text with line breaks
          return (
            <span key={`text-${keyPrefix}`}>
              {textPart.split('\n').map((line, lineIndex) => (
                <React.Fragment key={lineIndex}>
                  {line}
                  {lineIndex < textPart.split('\n').length - 1 && <br />}
                </React.Fragment>
              ))}
            </span>
          );
        }
        
        const tagType = match[1];
        const tagStart = match.index;
        const openTag = `<${tagType}>`;
        const closeTag = `</${tagType}>`;
        
        // Find the matching closing tag
        let depth = 0;
        let closeIndex = -1;
        
        for (let i = tagStart + openTag.length; i < textPart.length; i++) {
          if (textPart.substring(i, i + openTag.length) === openTag) {
            depth++;
          } else if (textPart.substring(i, i + closeTag.length) === closeTag) {
            if (depth === 0) {
              closeIndex = i;
              break;
            }
            depth--;
          }
        }
        
        if (closeIndex === -1) {
          // No matching closing tag, treat as regular text
          return (
            <span key={`text-${keyPrefix}`}>
              {textPart.split('\n').map((line, lineIndex) => (
                <React.Fragment key={lineIndex}>
                  {line}
                  {lineIndex < textPart.split('\n').length - 1 && <br />}
                </React.Fragment>
              ))}
            </span>
          );
        }
        
        // Extract content between tags
        const content = textPart.substring(tagStart + openTag.length, closeIndex);
        const afterContent = textPart.substring(closeIndex + closeTag.length);
        
        // Parse the content recursively
        const parsedContent = parseNestedHtml(content, `${keyPrefix}-${tagType}-${tagStart}`);
        
        // Parse the remaining text after the closing tag
        const parsedAfter = parseNestedHtml(afterContent, `${keyPrefix}-after-${closeIndex}`);
        
        // Wrap content in appropriate tag
        let WrapperComponent;
        switch (tagType) {
          case 'b':
            WrapperComponent = 'strong';
            break;
          case 'i':
            WrapperComponent = 'em';
            break;
          case 'u':
            WrapperComponent = 'u';
            break;
          default:
            WrapperComponent = 'span';
        }
        
        return (
          <React.Fragment key={`fragment-${keyPrefix}`}>
            {tagStart > 0 && parseNestedHtml(textPart.substring(0, tagStart), `${keyPrefix}-before-${tagStart}`)}
            <WrapperComponent key={`${tagType}-${keyPrefix}-${tagStart}`}>
              {parsedContent}
            </WrapperComponent>
            {parsedAfter}
          </React.Fragment>
        );
      };
      
      return parseNestedHtml(latexPart, `latex-${latexIndex}`);
    });
  };

  return (
    <QuizContainer>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Question Editor
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Create your question with LaTeX and formatting support
        </Typography>
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
          
          {questionImages.map((image, index) => (
            <Box key={index} sx={{ mb: 3, p: 2, border: '1px solid', borderColor: 'grey.300', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                  Image {index + 1}
                </Typography>
                {questionImages.length > 1 && (
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
                )}
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
                  
                  {optionImages[optionIndex].map((image, imageIndex) => (
                    <Box key={imageIndex} sx={{ mb: 2, p: 1.5, border: '1px solid', borderColor: 'grey.300', borderRadius: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                          Image {imageIndex + 1}
                        </Typography>
                        {optionImages[optionIndex].length > 1 && (
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
                        )}
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
              <Chip 
                label="Sample Topic" 
                size="small" 
                sx={{
                  backgroundColor: theme => theme.palette.mode === 'dark' ? '#444' : '#1F1F1F',
                  color: theme => theme.palette.mode === 'dark' ? 'white' : 'white',
                  '&:hover': {
                    backgroundColor: theme => theme.palette.mode === 'dark' ? '#555' : '#2A2A2A',
                  }
                }}
              />
            </Box>
            {question ? (
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
          </CardContent>
        </QuestionCard>

        {/* Options Preview */}
        <Grid container spacing={3} sx={{ mt: 2 }}>
          {options.map((option, optionIndex) => (
            <Grid size={{xs: gridSize.xs, sm: gridSize.sm, md: gridSize.md}} key={optionIndex}>
              <OptionCard>
                <CardContent>
                  {option ? (
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
                    <Typography 
                      variant="body1" 
                      align="center"
                      sx={{ 
                        color: 'text.secondary',
                        fontStyle: 'italic' 
                      }}
                    >
                    </Typography>
                  )}
                  
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
        {!question && !options.some(opt => opt) && (
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
