import React from 'react';
import { Box, Typography, Paper, Grid, Card, CardContent, Divider } from '@mui/material';
import { BlockMath, InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import { colors } from '../../theme/colors';

const TempMath = () => {
  return (
    <Box sx={{ 
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      minHeight: '100vh',
      p: 3,
      backgroundColor: 'background.default'
    }}>
      <Typography variant="h4" component="h1" align="center" gutterBottom sx={{ mb: 4 }}>
        Math & Chemistry Formulas Demo
      </Typography>

      <Grid container spacing={3} maxWidth="1200px">
        
        {/* Chemistry Section */}
        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h5" gutterBottom sx={{ color: colors.app.light.accent }}>
                Chemistry Formulas
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>Chemical Equations</Typography>
                <BlockMath math="2H_2 + O_2 \rightarrow 2H_2O" />
                <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                  Hydrogen + Oxygen → Water
                </Typography>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>Ideal Gas Law</Typography>
                <BlockMath math="PV = nRT" />
                <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                  Where P = pressure, V = volume, n = moles, R = gas constant, T = temperature
                </Typography>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>pH Calculation</Typography>
                <BlockMath math=" pH = -\log[H^+]" />
                <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                  pH is the negative logarithm of hydrogen ion concentration
                </Typography>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>Molarity Formula</Typography>
                <BlockMath math="M = \frac{n}{V}" />
                <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                  Molarity = moles of solute / volume of solution in liters
                </Typography>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom>Balanced Equation</Typography>
                <BlockMath math="C_6H_{12}O_6 + 6O_2 \rightarrow 6CO_2 + 6H_2O" />
                <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                  Glucose + Oxygen → Carbon Dioxide + Water (Cellular Respiration)
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Mathematics Section */}
        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h5" gutterBottom sx={{ color: colors.app.light.accent }}>
                Mathematics Equations
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>Quadratic Formula</Typography>
                <BlockMath math="x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}" />
                <Typography variant="h6" sx={{ mt: 1, color: 'text.secondary' }}>
                  Solution to <InlineMath math="ax^2 + bx + c = 0" /> 
                  <br />
                  <InlineMath math="\text{Hi this is text } I = \sum m r^{2} \to \text{unit} = \mathrm{kg \cdot m^{2}}" />
                </Typography>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>Pythagorean Theorem</Typography>
                <BlockMath math="a^2 + b^2 = c^2" />
                <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                  For a right triangle with sides a, b and hypotenuse c
                </Typography>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>Euler's Identity</Typography>
                <BlockMath math="e^{i\pi} + 1 = 0" />
                <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                  Considered the most beautiful equation in mathematics
                </Typography>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>Derivative Definition</Typography>
                <BlockMath math="f'(x) = \lim_{h \to 0} \frac{f(x + h) - f(x)}{h}" />
                <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                  The limit definition of the derivative
                </Typography>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom>Integration by Parts</Typography>
                <BlockMath math="\int u \, dv = uv - \int v \, du" />
                <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                  A technique for integrating products of functions
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Physics Section */}
        <Grid item xs={12}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h5" gutterBottom sx={{ color: colors.app.light.accent }}>
                Physics Equations
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h6" gutterBottom>Newton's Second Law</Typography>
                    <BlockMath math="F = ma" />
                    <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                      Force equals mass times acceleration
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h6" gutterBottom>Einstein's Mass-Energy</Typography>
                    <BlockMath math="E = mc^2" />
                    <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                      Energy equals mass times speed of light squared
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h6" gutterBottom>Kinetic Energy</Typography>
                    <BlockMath math="KE = \frac{1}{2}mv^2" />
                    <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                      Kinetic energy of a moving object
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h6" gutterBottom>Gravitational Force</Typography>
                    <BlockMath math="F = G\frac{m_1m_2}{r^2}" />
                    <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                      Newton's law of universal gravitation
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h6" gutterBottom>Wave Equation</Typography>
                    <BlockMath math="v = f\lambda" />
                    <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                      Wave speed equals frequency times wavelength
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h6" gutterBottom>Ohm's Law</Typography>
                    <BlockMath math="V = IR" />
                    <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                      Voltage equals current times resistance
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Inline Math Examples */}
        <Grid item xs={12}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h5" gutterBottom sx={{ color: colors.app.light.accent }}>
                Inline Math Examples
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Typography variant="body1" paragraph>
                The quadratic equation <InlineMath math="ax^2 + bx + c = 0" /> has solutions given by the quadratic formula.
              </Typography>
              
              <Typography variant="body1" paragraph>
                In chemistry, the reaction <InlineMath math="2H_2 + O_2 \rightarrow 2H_2O" /> produces water from hydrogen and oxygen.
              </Typography>
              
              <Typography variant="body1" paragraph>
                The area of a circle is <InlineMath math="A = \pi r^2" /> where <InlineMath math="r" /> is the radius.
              </Typography>
              
              <Typography variant="body1" paragraph>
                The derivative of <InlineMath math="x^2" /> is <InlineMath math="2x" />, and the integral of <InlineMath math="2x" /> is <InlineMath math="x^2 + C" />.
              </Typography>
              
              <Typography variant="body1" paragraph>
                In physics, when an object moves with velocity <InlineMath math="v" /> and has mass <InlineMath math="m" />, its kinetic energy is <InlineMath math="KE = \frac{1}{2}mv^2" />.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TempMath;
