import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabaseClient';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import TicketDetailPage from './pages/TicketDetailPage';

// MUI Imports
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AppBar from '@mui/material/AppBar';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import LogoutIcon from '@mui/icons-material/Logout';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Fade from '@mui/material/Fade';
import Slide from '@mui/material/Slide';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#6366f1',
      light: '#818cf8',
      dark: '#4f46e5',
    },
    secondary: {
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706',
    },
    background: {
      default: '#0f0f23',
      paper: '#1a1a2e',
    },
    grey: {
      900: '#16213e',
      800: '#1f2937',
      700: '#374151',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
      letterSpacing: '-0.025em',
    },
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 600,
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 8px 25px rgba(99, 102, 241, 0.3)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRadius: '0 20px 20px 0',
          background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
          borderRight: '1px solid rgba(255, 255, 255, 0.1)',
        },
      },
    },
  },
  shape: {
    borderRadius: 12,
  },
});

const DRAWER_WIDTH = 260;

// Navigation component for authenticated users
function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const isTicketDetail = location.pathname.includes('/tickets/');

  return (
    <List sx={{ px: 2, py: 1 }}>
      <ListItem disablePadding>
        <ListItemButton
          onClick={() => navigate('/')}
          sx={{
            borderRadius: 3,
            mb: 1,
            backgroundColor: !isTicketDetail ? 'primary.main' : 'transparent',
            '&:hover': {
              backgroundColor: !isTicketDetail ? 'primary.dark' : 'rgba(99, 102, 241, 0.1)',
              transform: 'translateX(4px)',
            },
            transition: 'all 0.2s ease-in-out',
          }}
        >
          <ListItemIcon sx={{ color: !isTicketDetail ? 'white' : 'primary.main' }}>
            <DashboardIcon />
          </ListItemIcon>
          <ListItemText 
            primary="Dashboard" 
            sx={{ 
              '& .MuiListItemText-primary': { 
                fontWeight: !isTicketDetail ? 600 : 500,
                color: !isTicketDetail ? 'white' : 'inherit'
              } 
            }} 
          />
        </ListItemButton>
      </ListItem>
    </List>
  );
}

// Header component
function Header({ user, onSignOut }: { user: any; onSignOut: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isTicketDetail = location.pathname.includes('/tickets/');

  return (
    <AppBar 
      position="fixed" 
      sx={{ 
        zIndex: (theme) => theme.zIndex.drawer + 1,
        background: 'linear-gradient(90deg, rgba(15, 15, 35, 0.95) 0%, rgba(26, 26, 46, 0.95) 100%)',
        backdropFilter: 'blur(20px)',
        border: 'none',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {isTicketDetail && (
            <Slide direction="right" in={isTicketDetail}>
              <IconButton 
                onClick={() => navigate('/')}
                sx={{ 
                  color: 'primary.light',
                  '&:hover': { 
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    transform: 'scale(1.1)'
                  },
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                <ArrowBackIcon />
              </IconButton>
            </Slide>
          )}
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'white' }}>
            Support Hub
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar 
            src={user?.user_metadata?.avatar_url}
            sx={{ 
              width: 36, 
              height: 36,
              border: '2px solid',
              borderColor: 'primary.main',
            }}
          >
            {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
          </Avatar>
          <Button
            variant="outlined"
            size="small"
            onClick={onSignOut}
            startIcon={<LogoutIcon />}
            sx={{
              borderColor: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              '&:hover': {
                borderColor: 'error.main',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: 'error.light',
              },
            }}
          >
            Sign Out
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
    };
    
    fetchSession();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <Box 
        sx={{ 
          minHeight: '100vh', 
          background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }} 
      />
    );
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      {!session ? (
        <Fade in timeout={800}>
          <Box>
            <LandingPage onLogin={handleGoogleLogin} />
          </Box>
        </Fade>
      ) : (
        <Router>
          <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            <Header user={session.user} onSignOut={handleSignOut} />
            
            <Slide direction="right" in timeout={600}>
              <Drawer
                variant="permanent"
                sx={{
                  width: DRAWER_WIDTH,
                  flexShrink: 0,
                  [`& .MuiDrawer-paper`]: {
                    width: DRAWER_WIDTH,
                    boxSizing: 'border-box',
                  },
                }}
              >
                <Toolbar />
                <Box sx={{ overflow: 'auto', pt: 2 }}>
                  <Navigation />
                </Box>
              </Drawer>
            </Slide>

            <Box 
              component="main" 
              sx={{ 
                flexGrow: 1, 
                p: 3,
                background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
                minHeight: '100vh',
              }}
            >
              <Toolbar />
              <Fade in timeout={400}>
                <Box>
                  <Routes>
                    <Route path="/tickets/:ticketId" element={<TicketDetailPage user={session.user} />} />
                    <Route path="/" element={<DashboardPage user={session.user} />} />
                    <Route path="*" element={<Navigate to="/" />} />
                  </Routes>
                </Box>
              </Fade>
            </Box>
          </Box>
        </Router>
      )}
    </ThemeProvider>
  );
}

export default App;