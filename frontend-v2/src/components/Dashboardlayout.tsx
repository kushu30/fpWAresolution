import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import TicketsListPage from '@/pages/TicketsListPage';
import TicketDetailPage from '@/pages/TicketDetailPage';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LayoutDashboard, MessageSquare } from 'lucide-react';

export default function DashboardLayout({ user }: { user: User }) {
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <Router>
      <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
        {/* Sidebar */}
        <div className="hidden border-r bg-muted/40 md:block">
          <div className="flex h-full max-h-screen flex-col gap-2">
            <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
              <a href="/" className="flex items-center gap-2 font-semibold">
                <MessageSquare className="h-6 w-6" />
                <span>Support</span>
              </a>
            </div>

            <div className="flex-1">
              <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                <NavLink
                  to="/"
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${isActive ? 'bg-muted text-primary' : 'text-muted-foreground'}`
                  }
                  end
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Tickets
                </NavLink>
              </nav>
            </div>
          </div>
        </div>

        {/* Main area */}
        <div className="flex flex-col">
          <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
            <div className="w-full flex-1" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon" className="rounded-full">
                  <Avatar>
                    {/* safe access to avatar URL */}
                    <AvatarImage src={(user?.user_metadata as any)?.avatar_url} alt={user?.email ?? 'User'} />
                    <AvatarFallback>{user?.email?.substring(0, 2).toUpperCase() ?? 'US'}</AvatarFallback>
                  </Avatar>
                  <span className="sr-only">Toggle user menu</span>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleSignOut}>Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>

          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
            <Routes>
              <Route path="/tickets/:ticketId" element={<TicketDetailPage />} />
              <Route path="/" element={<TicketsListPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}
