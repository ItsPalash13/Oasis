import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  IconButton,
  Box,
  Typography,
  Zoom,
  Fade,
  Backdrop
} from '@mui/material';
import {
  Close as CloseIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  FullscreenExit as ResetIcon,
  Fullscreen as FullscreenIcon
} from '@mui/icons-material';

const ImageDialog = ({ 
  open, 
  onClose, 
  imageSrc, 
  imageAlt, 
  caption,
  maxWidth = '90vw',
  maxHeight = '90vh'
}) => {
  const [zoomLevel, setZoomLevel] = useState(0.8);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Reset zoom and position when dialog opens/closes
  useEffect(() => {
    if (open) {
      setZoomLevel(0.8);
      setPosition({ x: 0, y: 0 });
    }
  }, [open]);

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev * 1.2, 5)); // Max zoom 5x
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev / 1.2, 0.5)); // Min zoom 0.5x
  };

  const handleReset = () => {
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && zoomLevel > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullWidth
      BackdropComponent={Backdrop}
      BackdropProps={{
        sx: {
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          backdropFilter: 'blur(4px)'
        }
      }}
      PaperProps={{
        sx: {
          backgroundColor: 'transparent',
          boxShadow: 'none',
          maxWidth: 'none',
          maxHeight: 'none',
          width: '100vw',
          height: '100vh',
          margin: 0,
          borderRadius: 0
        }
      }}
    >
      <DialogContent
        sx={{
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          position: 'relative',
          overflow: 'hidden',
          cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
        }}
        onMouseDown={(e) => {
          // If clicking on backdrop (not on image), close dialog
          if (e.target === e.currentTarget) {
            onClose();
          } else {
            handleMouseDown(e);
          }
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* Close Button */}
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 1000,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            color: 'white',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.7)'
            }
          }}
        >
          <CloseIcon />
        </IconButton>

        {/* Zoom Controls */}
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            zIndex: 1000,
            display: 'flex',
            gap: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            borderRadius: 2,
            padding: 1
          }}
        >
          <IconButton
            onClick={handleZoomOut}
            disabled={zoomLevel <= 0.5}
            sx={{
              color: 'white',
              '&:disabled': {
                color: 'rgba(255, 255, 255, 0.3)'
              }
            }}
          >
            <ZoomOutIcon />
          </IconButton>
          
          <IconButton
            onClick={handleReset}
            sx={{ color: 'white' }}
          >
            <ResetIcon />
          </IconButton>
          
          <IconButton
            onClick={handleZoomIn}
            disabled={zoomLevel >= 5}
            sx={{
              color: 'white',
              '&:disabled': {
                color: 'rgba(255, 255, 255, 0.3)'
              }
            }}
          >
            <ZoomInIcon />
          </IconButton>
        </Box>

        {/* Zoom Level Indicator */}
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            color: 'white',
            padding: '4px 12px',
            borderRadius: 2,
            fontSize: '0.875rem'
          }}
        >
          {Math.round(zoomLevel * 100)}%
        </Box>

        {/* Image Container */}
        <Box
          sx={{
            position: 'relative',
            transform: `scale(${zoomLevel}) translate(${position.x / zoomLevel}px, ${position.y / zoomLevel}px)`,
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            maxWidth: maxWidth,
            maxHeight: maxHeight,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          <img
            src={imageSrc}
            alt={imageAlt}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              borderRadius: 8,
              userSelect: 'none',
              pointerEvents: 'none'
            }}
            draggable={false}
          />
          
          {/* Caption */}
          {caption && (
            <Fade in={true} timeout={500}>
              <Typography
                variant="body2"
                sx={{
                  color: 'white',
                  textAlign: 'center',
                  marginTop: 2,
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  padding: '8px 16px',
                  borderRadius: 2,
                  maxWidth: '80%',
                  fontSize: '0.875rem'
                }}
              >
                {caption}
              </Typography>
            </Fade>
          )}
        </Box>

        {/* Instructions */}
        <Fade in={zoomLevel === 1} timeout={500}>
          <Box
            sx={{
              position: 'absolute',
              bottom: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              color: 'white',
              padding: '8px 16px',
              borderRadius: 2,
              fontSize: '0.75rem',
              textAlign: 'center',
              opacity: zoomLevel === 1 ? 1 : 0,
              transition: 'opacity 0.3s ease'
            }}
          >
            Scroll to zoom • Drag to pan when zoomed
          </Box>
        </Fade>
      </DialogContent>
    </Dialog>
  );
};

export default ImageDialog;
