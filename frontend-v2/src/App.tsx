import { useState, useEffect, createContext } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import LandingPage from '@/pages/LandingPage';
import DashboardLayout from '@/components/DashboardLayout';

// --- CREATE AND EXPORT THEME CONTEXT ---
type Theme = 'light' | 'dark';
type ThemeContextType = { theme: Theme; setTheme: (theme: Theme) => void };
export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function App(): JSX.Element {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<Theme>('dark'); // default theme

  // Apply theme class on <html> so tailwind / css variables can react
  useEffect(() => {
    // remove any existing theme classes then add the current one
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, [theme]);

  // Fetch initial session and subscribe to auth changes
  useEffect(() => {
    let mounted = true;

    const fetchSession = async () => {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(currentSession);
      } catch (err) {
        console.error('Error fetching session:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleGoogleLogin = async () => {
    try {
      await supabase.auth.signInWithOAuth({ provider: 'google' });
    } catch (err) {
      console.error('Google sign-in error:', err);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <div className="min-h-screen bg-background text-foreground">
        {!session ? <LandingPage onLogin={handleGoogleLogin} /> : <DashboardLayout user={session.user} />}
      </div>
    </ThemeContext.Provider>
  );
}

export default App;
