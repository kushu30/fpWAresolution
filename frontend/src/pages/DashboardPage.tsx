import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from "../lib/supabaseClient";
import type { RealtimeChannel, User } from '@supabase/supabase-js';

// MUI Imports
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import TableContainer from '@mui/material/TableContainer';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import CircularProgress from '@mui/material/CircularProgress';

interface Ticket {
  id: string;
  ticket_id_text?: string;
  ticket_number?: number;
  group_name?: string;
  sender_name?: string;
  subject?: string;
  status?: string;
  created_at?: string;
}

export default function DashboardPage({ user }: { user: User | null }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const groupedTickets = useMemo(() => {
    const groups: { [key: string]: Ticket[] } = {};
    tickets.forEach(ticket => {
      const groupName = ticket.group_name || 'Unknown Group';
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(ticket);
    });
    return groups;
  }, [tickets]);

  useEffect(() => {
    let isMounted = true;

    const fetchTickets = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (!isMounted) return;
      if (error) {
        console.error('Error fetching tickets:', error);
      } else if (data) {
        setTickets(data as Ticket[]);
      }
      setLoading(false);
    };

    fetchTickets();

    const channel: RealtimeChannel = supabase
      .channel('realtime-tickets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
        // re-fetch on any change
        fetchTickets();
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Sign out error', err);
    }
  };

  return (
    <Box sx={{ color: 'white' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          Dashboard
        </Typography>
        <Button variant="contained" color="error" onClick={handleSignOut}>
          Sign Out
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        Object.entries(groupedTickets).map(([groupName, groupTickets]) => (
          <Accordion key={groupName} defaultExpanded sx={{ bgcolor: 'grey.900', color: 'white', mb: 2 }}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}
              aria-controls={`${groupName}-content`}
              id={`${groupName}-header`}
            >
              <Typography variant="h6">{groupName}</Typography>
              <Box sx={{ ml: 2 }}>
                <Chip label={`${groupTickets.length} tickets`} size="small" />
              </Box>
            </AccordionSummary>

            <AccordionDetails>
              <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: 2 }}>
                <TableContainer sx={{ maxHeight: 420 }}>
                  <Table stickyHeader aria-label={`${groupName} tickets table`}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Subject</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Sender</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Last Update</TableCell>
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {groupTickets.map((ticket) => {
                        const idText = ticket.ticket_id_text ?? (ticket.ticket_number ? `#${ticket.ticket_number}` : ticket.id.slice(0, 8));
                        return (
                          <TableRow
                            hover
                            key={ticket.id}
                            onClick={() => navigate(`/tickets/${ticket.id}`)}
                            onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/tickets/${ticket.id}`); }}
                            tabIndex={0}
                            sx={{ cursor: 'pointer' }}
                          >
                            <TableCell sx={{ fontFamily: 'monospace' }}>{idText}</TableCell>
                            <TableCell>{ticket.subject}</TableCell>
                            <TableCell>{ticket.sender_name}</TableCell>
                            <TableCell>
                              <Chip
                                label={ticket.status ?? 'unknown'}
                                color={ticket.status === 'open' ? 'success' : 'default'}
                                size="small"
                                sx={{ textTransform: 'capitalize' }}
                              />
                            </TableCell>
                            <TableCell>{ticket.created_at ? new Date(ticket.created_at).toLocaleString() : '-'}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </AccordionDetails>
          </Accordion>
        ))
      )}
    </Box>
  );
}
