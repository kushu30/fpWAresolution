import { supabase } from '../lib/supabaseClient';

// MUI Imports
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import GoogleIcon from '@mui/icons-material/Google';
import Alert from '@mui/material/Alert';
import { useState } from 'react';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
    if (error) {
      setError(error.message);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h4" sx={{ mb: 1, fontWeight: 'bold' }}>
          Support Dashboard
        </Typography>
        <Typography component="h2" variant="subtitle1" sx={{ mb: 3, color: 'text.secondary' }}>
          Sign in to continue
        </Typography>
        <Button
          onClick={handleGoogleLogin}
          fullWidth
          variant="contained"
          startIcon={<GoogleIcon />}
          sx={{ mt: 3, mb: 2, py: 1.5, textTransform: 'none', fontSize: '1rem' }}
        >
          Sign in with Google
        </Button>
        {error && <Alert severity="error" sx={{ mt: 2, width: '100%' }}>{error}</Alert>}
      </Box>
    </Container>
  );
}