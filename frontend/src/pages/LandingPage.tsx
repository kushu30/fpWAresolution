import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import GoogleIcon from '@mui/icons-material/Google';

interface LandingPageProps {
  onLogin: () => void;
}

export default function LandingPage({ onLogin }: LandingPageProps) {
  return (
    <Container component="main" maxWidth="md">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        <Typography component="h1" variant="h2" sx={{ mb: 2, fontWeight: 'bold', color: 'text.primary' }}>
          Customer Support, Simplified.
        </Typography>
        <Typography variant="h6" sx={{ mb: 4, color: 'text.secondary', maxWidth: '600px' }}>
          An elegant and minimalistic dashboard to manage all your WhatsApp support tickets in one place.
        </Typography>
        <Button
          onClick={onLogin}
          variant="contained"
          startIcon={<GoogleIcon />}
          sx={{
            py: 1.5,
            px: 4,
            borderRadius: '8px',
            textTransform: 'none',
            fontSize: '1.1rem',
            boxShadow: 'none',
          }}
        >
          Sign in with Google
        </Button>
      </Box>
    </Container>
  );
}