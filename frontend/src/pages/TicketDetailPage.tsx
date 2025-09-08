import { useState, useEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import type { RealtimeChannel, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

// MUI
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import SendIcon from '@mui/icons-material/Send';
import Avatar from '@mui/material/Avatar';

interface Message {
  id: string;
  body: string;
  source: 'user' | 'agent';
  created_at: string;
}

interface Ticket {
  id: string;
  ticket_id_text?: string;
  ticket_number?: number;
  subject?: string;
  status?: string;
  sender_name?: string;
  messages?: Message[];
}

export default function TicketDetailPage({ user }: { user: User | null }) {
  const { ticketId } = useParams<{ ticketId: string }>();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Fetch ticket & messages
  useEffect(() => {
    let mounted = true;

    const fetchTicketDetails = async () => {
      if (!ticketId) return;
      setLoading(true);

      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          messages ( * )
        `)
        .eq('id', ticketId)
        // ensure messages are ordered ascending by created_at
        .order('created_at', { foreignTable: 'messages', ascending: true })
        .single();

      if (!mounted) return;
      if (error) {
        console.error('Error fetching ticket details:', error);
        setTicket(null);
      } else if (data) {
        // ensure messages array exists
        setTicket({ ...data, messages: data.messages ?? [] });
      }
      setLoading(false);
    };

    fetchTicketDetails();

    return () => {
      mounted = false;
    };
  }, [ticketId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (!containerRef.current) return;
    // small timeout to let DOM update
    const id = window.setTimeout(() => {
      containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' });
    }, 50);
    return () => clearTimeout(id);
  }, [ticket?.messages?.length]);

  const handleReply = async (e: FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !ticket) return;

    setIsReplying(true);
    const agentName = (user?.email || user?.user_metadata?.full_name || 'Support Agent') as string;

    // build id text (prefer ticket_id_text)
    const idText =
      ticket.ticket_id_text ??
      (typeof ticket.ticket_number !== 'undefined' && ticket.ticket_number !== null
        ? `#${ticket.ticket_number}`
        : ticket.id?.slice(0, 8));

    const fullReplyText = `Reply on ${idText}: ${replyText.trim()}`;

    try {
      // Send to backend
      const res = await fetch(`http://localhost:3001/tickets/${ticket.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentName, text: fullReplyText }),
      });

      if (!res.ok) {
        throw new Error('Failed to send reply');
      }

      // Optimistically update UI
      const newMsg: Message = {
        id: new Date().toISOString(),
        body: fullReplyText,
        source: 'agent',
        created_at: new Date().toISOString(),
      };

      setTicket((prev) => (prev ? { ...prev, messages: [...(prev.messages ?? []), newMsg] } : prev));
      setReplyText('');
    } catch (err) {
      console.error('Error sending reply:', err);
      alert('Could not send reply.');
    } finally {
      setIsReplying(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!ticket) {
    return <Typography variant="h6">Ticket not found.</Typography>;
  }

  const senderInitial = ticket.sender_name ? ticket.sender_name.charAt(0).toUpperCase() : '?';
  const agentInitial = (user?.user_metadata?.full_name || user?.email || 'A').charAt(0).toUpperCase();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box sx={{ mb: 2, flexShrink: 0 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          {ticket.ticket_id_text ? `Ticket ${ticket.ticket_id_text}` : `Ticket ${ticket.ticket_number ?? ticket.id?.slice(0, 8)}`}
        </Typography>
        <Typography variant="h6" color="text.secondary">
          {ticket.subject}
        </Typography>
        <Chip label={ticket.status ?? 'unknown'} color={ticket.status === 'open' ? 'success' : 'default'} size="small" sx={{ mt: 1 }} />
      </Box>

      {/* Messages */}
      <Box ref={containerRef} sx={{ flexGrow: 1, overflowY: 'auto', pr: 2, pb: 2 }}>
        {(ticket.messages ?? []).map((message) => {
          const isAgent = message.source === 'agent';
          return (
            <Box
              key={message.id}
              sx={{
                display: 'flex',
                justifyContent: isAgent ? 'flex-end' : 'flex-start',
                mb: 2,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1.5,
                  flexDirection: isAgent ? 'row-reverse' : 'row',
                  maxWidth: '75%',
                }}
              >
                <Avatar
                  sx={{
                    bgcolor: isAgent ? 'primary.main' : 'secondary.main',
                    width: 36,
                    height: 36,
                    fontSize: '0.9rem',
                  }}
                >
                  {isAgent ? agentInitial : senderInitial}
                </Avatar>

                <Paper
                  elevation={2}
                  sx={{
                    p: 1.5,
                    borderRadius: isAgent ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    bgcolor: isAgent ? 'primary.main' : 'grey.700',
                    color: 'white',
                    wordBreak: 'break-word',
                  }}
                >
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {message.body}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', textAlign: 'right', mt: 1, opacity: 0.75 }}>
                    {new Date(message.created_at).toLocaleTimeString()}
                  </Typography>
                </Paper>
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Reply Form */}
      <Box component="form" onSubmit={handleReply} sx={{ mt: 'auto', display: 'flex', gap: 1, pt: 2, alignItems: 'center', flexShrink: 0 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Type your reply..."
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          disabled={isReplying}
        />
        <Button type="submit" variant="contained" endIcon={<SendIcon />} disabled={isReplying || !replyText.trim()} sx={{ py: '12px' }}>
          Send
        </Button>
      </Box>
    </Box>
  );
}
