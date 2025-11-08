import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import VolunteerPage from './pages/VolunteerPage';

// Add these imports for dashboard UI
import {
  Container,
  AppBar,
  Toolbar,
  Typography,
  Box,
  CssBaseline,
  ThemeProvider,
  createTheme,
} from '@mui/material';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import { AppProvider } from './context/AppContext';
import StatusIndicator from './components/StatusIndicator';
import NeedsList from './components/NeedsList';

// Create theme for dashboard route
const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    success: { main: '#2e7d32' },
    warning: { main: '#ed6c02' },
    error: { main: '#d32f2f' },
  },
});

// Inline dashboard component for routing
function DashboardPage() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppProvider>
        <Box sx={{ flexGrow: 1 }}>
          {/* Header */}
          <AppBar position="static">
            <Toolbar>
              <LocalHospitalIcon sx={{ mr: 2 }} />
              <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                Disaster Response - Volunteer Dashboard
              </Typography>
            </Toolbar>
          </AppBar>
          {/* Main Content */}
          <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <StatusIndicator />
            <NeedsList />
          </Container>
          {/* Footer */}
          <Box
            component="footer"
            sx={{
              py: 3,
              px: 2,
              mt: 'auto',
              backgroundColor: 'grey.100',
              textAlign: 'center',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Disaster Response Resource Optimization Platform
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Built for emergency response teams
            </Typography>
          </Box>
        </Box>
      </AppProvider>
    </ThemeProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Route for volunteer PWA */}
        <Route path="/" element={<VolunteerPage />} />
        {/* Route for dashboard */}
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
    </BrowserRouter>
  );
}
export default App;
