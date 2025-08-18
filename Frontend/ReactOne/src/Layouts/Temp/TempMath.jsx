import React, { useState } from 'react';
import { Box, Typography, Paper, Grid, Card, CardContent, Divider, TextField, Button } from '@mui/material';
import { BlockMath, InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import { colors } from '../../theme/colors';

const TempMath = () => {
  const [latexInput, setLatexInput] = useState('x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}');
  const [displayMode, setDisplayMode] = useState('block'); // 'block' or 'inline'

  const handleLatexChange = (event) => {
    setLatexInput(event.target.value);
  };

  const toggleDisplayMode = () => {
    setDisplayMode(displayMode === 'block' ? 'inline' : 'block');
  };

  const renderLatex = () => {
    try {
      if (displayMode === 'block') {
        return <BlockMath math={latexInput} />;
      } else {
        return <InlineMath math={latexInput} />;
      }
    } catch (error) {
      return (
        <Typography color="error" variant="body2">
          LaTeX Error: {error.message}
        </Typography>
      );
    }
  };

  const exampleFormulas = [
    { name: 'Quadratic Formula', latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' },
    { name: 'Pythagorean Theorem', latex: 'a^2 + b^2 = c^2' },
    { name: 'Euler\'s Identity', latex: 'e^{i\\pi} + 1 = 0' },
    { name: 'Derivative', latex: 'f\'(x) = \\lim_{h \\to 0} \\frac{f(x + h) - f(x)}{h}' },
    { name: 'Integration', latex: '\\int u \\, dv = uv - \\int v \\, du' },
    { name: 'Chemical Equation', latex: '2H_2 + O_2 \\rightarrow 2H_2O' },
    { name: 'Ideal Gas Law', latex: 'PV = nRT' },
    { name: 'Kinetic Energy', latex: 'KE = \\frac{1}{2}mv^2' },
    { name: 'Gravitational Force', latex: 'F = G\\frac{m_1m_2}{r^2}' },
    { name: 'Wave Equation', latex: 'v = f\\lambda' }
  ];

  const loadExample = (latex) => {
    setLatexInput(latex);
  };

  return (
    <Box sx={{ 
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      backgroundColor: 'background.default',
      p: 2
    }}>
      <Typography variant="h4" component="h1" align="center" gutterBottom sx={{ mb: 3 }}>
        LaTeX Editor
      </Typography>

      <Grid container spacing={3} sx={{ flex: 1 }}>
        {/* Left Panel - Input */}
        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h5" gutterBottom sx={{ color: colors.app.light.accent }}>
                LaTeX Input
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
                <Button 
                  variant={displayMode === 'block' ? 'contained' : 'outlined'}
                  onClick={toggleDisplayMode}
                  size="small"
                >
                  Block Mode
                </Button>
                <Button 
                  variant={displayMode === 'inline' ? 'contained' : 'outlined'}
                  onClick={toggleDisplayMode}
                  size="small"
                >
                  Inline Mode
                </Button>
              </Box>

              <TextField
                multiline
                rows={8}
                fullWidth
                value={latexInput}
                onChange={handleLatexChange}
                placeholder="Enter LaTeX code here..."
                variant="outlined"
                sx={{ 
                  flex: 1,
                  '& .MuiInputBase-root': {
                    fontFamily: 'monospace',
                    fontSize: '14px'
                  }
                }}
              />

              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Quick Examples
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {exampleFormulas.map((example, index) => (
                    <Button
                      key={index}
                      variant="outlined"
                      size="small"
                      onClick={() => loadExample(example.latex)}
                      sx={{ fontSize: '12px' }}
                    >
                      {example.name}
                    </Button>
                  ))}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Panel - Output */}
        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h5" gutterBottom sx={{ color: colors.app.light.accent }}>
                Rendered Output
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ 
                flex: 1, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                minHeight: '200px',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                p: 2,
                backgroundColor: 'background.paper'
              }}>
                {renderLatex()}
              </Box>

              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Display Mode:</strong> {displayMode === 'block' ? 'Block (centered, larger)' : 'Inline (text flow)'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  <strong>Tip:</strong> Use \\ for line breaks, \\frac{}{} for fractions, \\sqrt{} for square roots
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TempMath;
