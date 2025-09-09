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
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Fade from '@mui/material/Fade';
import Slide from '@mui/material/Slide';
import Zoom from '@mui/material/Zoom';
import InputAdornment from '@mui/material/InputAdornment';
import { keyframes } from '@mui/system';

// Icons
import PersonIcon from '@mui/icons-material/Person';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import StatusIcon from '@mui/icons-material/RadioButtonChecked';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CheckIcon from '@mui/icons-material/Check';
import DoneAllIcon from '@mui/icons-material/DoneAll';

const messageSlide = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`;

const typing = keyframes`
  0%, 60%, 100% { opacity: 0.4; }
  30% { opacity: 1; }
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
`;

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

function MessageBubble({ message, isAgent, agentInitial, senderInitial, index }: {
  message: Message;
  isAgent: boolean;
  agentInitial: string;
  senderInitial: string;
  index: number;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), index * 100);
    return () => clearTimeout(timer);
  }, [index]);

  return (
    <Slide direction="up" in={visible} timeout={400}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: isAgent ? 'flex-end' : 'flex-start',
          mb: 3,
          animation: `${messageSlide} 0.4s ease-out`,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 1.5,
            flexDirection: isAgent ? 'row-reverse' : 'row',
            maxWidth: '75%',
          }}
        >
          <Avatar
            sx={{
              bgcolor: isAgent ? 'primary.main' : 'secondary.main',
              width: 40,
              height: 40,
              fontSize: '1rem',
              fontWeight: 600,
              border: '2px solid',
              borderColor: isAgent ? 'primary.light' : 'secondary.light',
              boxShadow: `0 4px 12px ${isAgent ? 'rgba(99, 102, 241, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
            }}
          >
            {isAgent ? agentInitial : senderInitial}
          </Avatar>

          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: isAgent ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
              background: isAgent 
                ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                : 'linear-gradient(135deg, rgba(26, 26, 46, 0.9) 0%, rgba(22, 33, 62, 0.8) 100%)',
              color: 'white',
              wordBreak: 'break-word',
              position: 'relative',
              backdropFilter: 'blur(20px)',
              border: isAgent ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: isAgent 
                ? '0 8px 32px rgba(99, 102, 241, 0.3)'
                : '0 8px 32px rgba(0, 0, 0, 0.2)',
              '&::before': isAgent ? {} : {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, transparent 100%)',
                borderRadius: 'inherit',
                pointerEvents: 'none',
              }
            }}
          >
            <Typography 
              variant="body1" 
              sx={{ 
                whiteSpace: 'pre-wrap',
                lineHeight: 1.5,
                fontSize: '0.95rem',
              }}
            >
              {message.body}
            </Typography>
            
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'flex-end',
              mt: 1.5,
              gap: 0.5
            }}>
              <Typography 
                variant="caption" 
                sx={{ 
                  opacity: 0.8,
                  fontSize: '0.75rem',
                  fontWeight: 500,
                }}
              >
                {new Date(message.created_at).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </Typography>
              {isAgent && (
                <DoneAllIcon sx={{ fontSize: '0.9rem', opacity: 0.8, color: '#4ade80' }} />
              )}
            </Box>
          </Paper>
        </Box>
      </Box>
    </Slide>
  );
}

function TicketHeader({ ticket }: { ticket: Ticket }) {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'open': return 'success';
      case 'pending': return 'warning';
      case 'closed': return 'default';
      default: return 'default';
    }
  };

  return (
    <Fade in timeout={600}>
      <Paper
        elevation={0}
        sx={{
          p: 4,
          mb: 4,
          background: 'linear-gradient(135deg, rgba(26, 26, 46, 0.8) 0%, rgba(22, 33, 62, 0.6) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 4,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ flex: 1 }}>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 800, 
                mb: 1,
                background: 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {ticket.ticket_id_text 
                ? `Ticket ${ticket.ticket_id_text}` 
                : `Ticket ${ticket.ticket_number ?? ticket.id?.slice(0, 8)}`
              }
            </Typography>
            
            <Typography variant="h6" sx={{ color: 'grey.300', mb: 2 }}>
              {ticket.subject}
            </Typography>
          </Box>
          
          <Chip 
            label={ticket.status ?? 'unknown'} 
            color={getStatusColor(ticket.status) as any}
            sx={{ 
              fontWeight: 600,
              px: 2,
              py: 1,
              '& .MuiChip-label': {
                textTransform: 'capitalize',
                fontSize: '0.9rem',
              }
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonIcon sx={{ color: 'primary.light', fontSize: '1.2rem' }} />
            <Typography variant="body2" sx={{ color: 'grey.300', fontWeight: 500 }}>
              Customer: <span style={{ color: 'white' }}>{ticket.sender_name}</span>
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <StatusIcon sx={{ color: 'secondary.light', fontSize: '1.2rem' }} />
            <Typography variant="body2" sx={{ color: 'grey.300', fontWeight: 500 }}>
              Status: <span style={{ color: 'white', textTransform: 'capitalize' }}>{ticket.status}</span>
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Fade>
  );
}

export default function TicketDetailPage({ user }: { user: User | null }) {
  const { ticketId } = useParams<{ ticketId: string }>();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [showTyping, setShowTyping] = useState(false);

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
        .order('created_at', { foreignTable: 'messages', ascending: true })
        .single();

      if (!mounted) return;
      if (error) {
        console.error('Error fetching ticket details:', error);
        setTicket(null);
      } else if (data) {
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
    const id = window.setTimeout(() => {
      containerRef.current?.scrollTo({ 
        top: containerRef.current.scrollHeight, 
        behavior: 'smooth' 
      });
    }, 100);
    return () => clearTimeout(id);
  }, [ticket?.messages?.length]);

  const handleReply = async (e: FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !ticket) return;

    setIsReplying(true);
    setShowTyping(true);
    
    const agentName = (user?.email || user?.user_metadata?.full_name || 'Support Agent') as string;

    const idText =
      ticket.ticket_id_text ??
      (typeof ticket.ticket_number !== 'undefined' && ticket.ticket_number !== null
        ? `#${ticket.ticket_number}`
        : ticket.id?.slice(0, 8));

    const fullReplyText = `Reply on ${idText}: ${replyText.trim()}`;

    try {
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
      setShowTyping(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '60vh',
        gap: 2
      }}>
        <CircularProgress 
          size={60} 
          thickness={4}
          sx={{
            color: 'primary.main',
            animation: `${pulse} 2s ease-in-out infinite`,
          }}
        />
        <Typography variant="h6" sx={{ color: 'grey.400' }}>
          Loading ticket details...
        </Typography>
      </Box>
    );
  }

  if (!ticket) {
    return (
      <Fade in timeout={600}>
        <Paper
          elevation={0}
          sx={{
            p: 6,
            textAlign: 'center',
            background: 'linear-gradient(135deg, rgba(26, 26, 46, 0.6) 0%, rgba(22, 33, 62, 0.4) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 4,
          }}
        >
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
            Ticket not found
          </Typography>
          <Typography variant="body1" sx={{ color: 'grey.400' }}>
            The requested ticket could not be found or you don't have access to it.
          </Typography>
        </Paper>
      </Fade>
    );
  }

  const senderInitial = ticket.sender_name ? ticket.sender_name.charAt(0).toUpperCase() : '?';
  const agentInitial = (user?.user_metadata?.full_name || user?.email || 'A').charAt(0).toUpperCase();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: 'calc(100vh - 120px)' }}>
      <TicketHeader ticket={ticket} />

      {/* Messages Container */}
      <Paper
        elevation={0}
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, rgba(15, 15, 35, 0.6) 0%, rgba(26, 26, 46, 0.4) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        {/* Messages */}
        <Box 
          ref={containerRef} 
          sx={{ 
            flexGrow: 1, 
            overflowY: 'auto', 
            p: 3,
            '&::-webkit-scrollbar': {
              width: '6px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '3px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'rgba(99, 102, 241, 0.5)',
              borderRadius: '3px',
              '&:hover': {
                background: 'rgba(99, 102, 241, 0.7)',
              },
            },
          }}
        >
          {(ticket.messages ?? []).map((message, index) => (
            <MessageBubble
              key={message.id}
              message={message}
              isAgent={message.source === 'agent'}
              agentInitial={agentInitial}
              senderInitial={senderInitial}
              index={index}
            />
          ))}
          
          {/* Typing Indicator */}
          {showTyping && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: '20px 20px 20px 4px',
                  backgroundColor: 'grey.800',
                  display: 'flex',
                  gap: 0.5,
                }}
              >
                {[0, 1, 2].map((i) => (
                  <Box
                    key={i}
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: 'grey.500',
                      animation: `${typing} 1.5s infinite`,
                      animationDelay: `${i * 0.2}s`,
                    }}
                  />
                ))}
              </Paper>
            </Box>
          )}
        </Box>

        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

        {/* Reply Form */}
        <Zoom in timeout={800}>
          <Box 
            component="form" 
            onSubmit={handleReply} 
            sx={{ 
              p: 3,
              display: 'flex', 
              gap: 2, 
              alignItems: 'flex-end',
            }}
          >
            <TextField
              fullWidth
              multiline
              maxRows={4}
              variant="outlined"
              placeholder="Type your reply..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              disabled={isReplying}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: 6,
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(99, 102, 241, 0.5)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'primary.main',
                  },
                },
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="Add emoji">
                      <IconButton size="small" sx={{ color: 'grey.400' }}>
                        <EmojiEmotionsIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Attach file">
                      <IconButton size="small" sx={{ color: 'grey.400' }}>
                        <AttachFileIcon />
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
            />
            
            <Button 
              type="submit" 
              variant="contained" 
              endIcon={isReplying ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
              disabled={isReplying || !replyText.trim()} 
              sx={{ 
                py: 2,
                px: 3,
                borderRadius: 6,
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5855eb 0%, #7c3aed 100%)',
                  transform: 'translateY(-1px)',
                },
                '&:disabled': {
                  background: 'rgba(99, 102, 241, 0.3)',
                },
                minWidth: '100px',
              }}
            >
              {isReplying ? 'Sending...' : 'Send'}
            </Button>
          </Box>
        </Zoom>
      </Paper>
    </Box>
  );
}