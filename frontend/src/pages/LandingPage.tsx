import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import GoogleIcon from '@mui/icons-material/Google';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import { keyframes } from '@mui/system';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import SpeedIcon from '@mui/icons-material/Speed';
import SecurityIcon from '@mui/icons-material/Security';
import Fade from '@mui/material/Fade';
import Zoom from '@mui/material/Zoom';
import { useState, useEffect } from 'react';

// Floating animation keyframes
const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
`;

const glow = keyframes`
  0%, 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.3); }
  50% { box-shadow: 0 0 40px rgba(99, 102, 241, 0.6); }
`;

const gradientShift = keyframes`
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
`;

interface LandingPageProps {
  onLogin: () => void;
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
}

function FeatureCard({ icon, title, description, delay }: FeatureCardProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <Zoom in={visible} timeout={800}>
      <Paper
        elevation={0}
        sx={{
          p: 4,
          textAlign: 'center',
          height: '100%',
          background: 'linear-gradient(145deg, rgba(26, 26, 46, 0.8) 0%, rgba(22, 33, 62, 0.6) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 4,
          transition: 'all 0.3s ease-in-out',
          '&:hover': {
            transform: 'translateY(-8px) scale(1.02)',
            boxShadow: '0 20px 60px rgba(99, 102, 241, 0.2)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
          },
        }}
      >
        <Box
          sx={{
            mb: 3,
            color: 'primary.main',
            '& .MuiSvgIcon-root': {
              fontSize: '3rem',
              filter: 'drop-shadow(0 0 10px rgba(99, 102, 241, 0.3))',
            },
          }}
        >
          {icon}
        </Box>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'white' }}>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ color: 'grey.300', lineHeight: 1.6 }}>
          {description}
        </Typography>
      </Paper>
    </Zoom>
  );
}

function AnimatedBackground() {
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        zIndex: -1,
      }}
    >
      {/* Gradient orbs */}
      <Box
        sx={{
          position: 'absolute',
          top: '10%',
          left: '10%',
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%)',
          borderRadius: '50%',
          animation: `${float} 6s ease-in-out infinite`,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: '60%',
          right: '10%',
          width: '200px',
          height: '200px',
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.1) 0%, transparent 70%)',
          borderRadius: '50%',
          animation: `${float} 4s ease-in-out infinite reverse`,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '20%',
          left: '30%',
          width: '150px',
          height: '150px',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)',
          borderRadius: '50%',
          animation: `${float} 5s ease-in-out infinite`,
        }}
      />
    </Box>
  );
}

export default function LandingPage({ onLogin }: LandingPageProps) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(true);
  }, []);

  const features = [
    {
      icon: <WhatsAppIcon />,
      title: 'WhatsApp Integration',
      description: 'Seamlessly manage all your WhatsApp support conversations in one unified dashboard.',
    },
    {
      icon: <SpeedIcon />,
      title: 'Real-time Updates',
      description: 'Get instant notifications and live updates as new tickets arrive and conversations progress.',
    },
    {
      icon: <SupportAgentIcon />,
      title: 'Team Collaboration',
      description: 'Work together with your support team to provide exceptional customer service experiences.',
    },
    {
      icon: <SecurityIcon />,
      title: 'Secure & Reliable',
      description: 'Enterprise-grade security with reliable message delivery and data protection.',
    },
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 25%, #16213e 50%, #1a1a2e 75%, #0f0f23 100%)',
        backgroundSize: '400% 400%',
        animation: `${gradientShift} 15s ease infinite`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <AnimatedBackground />
      
      <Container component="main" maxWidth="lg">
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Hero Section */}
          <Fade in={loaded} timeout={1000}>
            <Box sx={{ mb: 8 }}>
              <Chip
                label="✨ New: Real-time collaboration"
                variant="outlined"
                sx={{
                  mb: 4,
                  borderColor: 'primary.main',
                  color: 'primary.light',
                  backgroundColor: 'rgba(99, 102, 241, 0.1)',
                  backdropFilter: 'blur(10px)',
                  fontWeight: 500,
                  animation: `${glow} 3s ease-in-out infinite`,
                }}
              />
              
              <Typography
                component="h1"
                variant="h2"
                sx={{
                  mb: 3,
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 50%, #cbd5e1 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  lineHeight: 1.1,
                  fontSize: { xs: '2.5rem', md: '3.5rem', lg: '4rem' },
                }}
              >
                Customer Support,{' '}
                <Box
                  component="span"
                  sx={{
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #f59e0b 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Simplified.
                </Box>
              </Typography>
              
              <Typography
                variant="h5"
                sx={{
                  mb: 6,
                  color: 'grey.300',
                  maxWidth: '600px',
                  mx: 'auto',
                  lineHeight: 1.6,
                  fontWeight: 400,
                }}
              >
                Transform your WhatsApp support workflow with an elegant, real-time dashboard
                that keeps your team connected and your customers happy.
              </Typography>

              <Zoom in={loaded} timeout={1200}>
                <Button
                  onClick={onLogin}
                  variant="contained"
                  size="large"
                  startIcon={<GoogleIcon />}
                  sx={{
                    py: 2,
                    px: 6,
                    fontSize: '1.2rem',
                    fontWeight: 600,
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    boxShadow: '0 8px 32px rgba(99, 102, 241, 0.3)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5855eb 0%, #7c3aed 100%)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 12px 40px rgba(99, 102, 241, 0.4)',
                    },
                    '&:active': {
                      transform: 'translateY(0px)',
                    },
                    transition: 'all 0.2s ease-in-out',
                  }}
                >
                  Get Started with Google
                </Button>
              </Zoom>
            </Box>
          </Fade>

          {/* Features Section */}
          <Box sx={{ width: '100%', mt: 8 }}>
            <Fade in={loaded} timeout={1400}>
              <Typography
                variant="h4"
                sx={{
                  mb: 6,
                  fontWeight: 700,
                  color: 'white',
                  textAlign: 'center',
                }}
              >
                Why Choose Support Hub?
              </Typography>
            </Fade>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mt: 2, justifyContent: 'center' }}>
              {features.map((feature, index) => (
                <Box key={feature.title} sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 22%' } }}>
                  <FeatureCard
                    icon={feature.icon}
                    title={feature.title}
                    description={feature.description}
                    delay={1600 + index * 200}
                  />
                </Box>
              ))}
            </Box>
          </Box>

          {/* Stats Section */}
          <Fade in={loaded} timeout={2400}>
            <Paper
              elevation={0}
              sx={{
                mt: 8,
                p: 4,
                background: 'rgba(26, 26, 46, 0.6)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 4,
                width: '100%',
                maxWidth: '600px',
              }}
            >
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, textAlign: 'center' }}>
                <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 30%' } }}>
                  <Typography variant="h3" sx={{ fontWeight: 700, color: 'primary.main', mb: 1 }}>
                    99%
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'grey.300' }}>
                    Uptime
                  </Typography>
                </Box>
                <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 30%' } }}>
                  <Typography variant="h3" sx={{ fontWeight: 700, color: 'secondary.main', mb: 1 }}>
                    {'<2s'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'grey.300' }}>
                    Response Time
                  </Typography>
                </Box>
                <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 30%' } }}>
                  <Typography variant="h3" sx={{ fontWeight: 700, color: 'success.main', mb: 1 }}>
                    24/7
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'grey.300' }}>
                    Support
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Fade>
        </Box>
      </Container>
    </Box>
  );
}