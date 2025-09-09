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
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import TableContainer from '@mui/material/TableContainer';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import CircularProgress from '@mui/material/CircularProgress';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Fade from '@mui/material/Fade';
import Zoom from '@mui/material/Zoom';
import Slide from '@mui/material/Slide';
import Badge from '@mui/material/Badge';
import LinearProgress from '@mui/material/LinearProgress';
import { keyframes } from '@mui/system';

// Icons
import TicketIcon from '@mui/icons-material/ConfirmationNumber';
import OpenIcon from '@mui/icons-material/MarkEmailUnread';
import ClosedIcon from '@mui/icons-material/TaskAlt';
import PendingIcon from '@mui/icons-material/Schedule';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PersonIcon from '@mui/icons-material/Person';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const shimmer = keyframes`
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
`;

interface Ticket {
  id: string;
  ticket_id_text?: string;
  ticket_number?: number;
  group_name?: string;
  sender_name?: string;
  subject?: string;
  status?: string;
  created_at?: string;
  priority?: 'low' | 'medium' | 'high';
}

interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  trend?: number;
  delay: number;
}

function StatsCard({ title, value, icon, color, trend, delay }: StatsCardProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <Zoom in={visible} timeout={600}>
      <Card
        elevation={0}
        sx={{
          background: `linear-gradient(135deg, ${color}15 0%, ${color}25 100%)`,
          backdropFilter: 'blur(20px)',
          border: `1px solid ${color}30`,
          borderRadius: 4,
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.3s ease-in-out',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: `0 12px 40px ${color}25`,
            border: `1px solid ${color}50`,
          },
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: '-200px',
            width: '200px',
            height: '100%',
            background: `linear-gradient(90deg, transparent, ${color}20, transparent)`,
            animation: `${shimmer} 2s infinite`,
          },
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 3,
                backgroundColor: `${color}20`,
                color: color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {icon}
            </Box>
            {trend && (
              <Chip
                size="small"
                icon={<TrendingUpIcon sx={{ fontSize: '0.8rem' }} />}
                label={`+${trend}%`}
                sx={{
                  backgroundColor: 'success.dark',
                  color: 'success.light',
                  fontWeight: 600,
                }}
              />
            )}
          </Box>
          
          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
              color: 'white',
              mb: 1,
              fontFamily: 'monospace',
            }}
          >
            {value.toLocaleString()}
          </Typography>
          
          <Typography variant="body2" sx={{ color: 'grey.300', fontWeight: 500 }}>
            {title}
          </Typography>
        </CardContent>
      </Card>
    </Zoom>
  );
}

function TicketRow({ ticket, index, onClick }: { ticket: Ticket; index: number; onClick: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), index * 50);
    return () => clearTimeout(timer);
  }, [index]);

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'open': return 'success';
      case 'pending': return 'warning';
      case 'closed': return 'default';
      default: return 'default';
    }
  };

  const idText = ticket.ticket_id_text ?? (ticket.ticket_number ? `#${ticket.ticket_number}` : ticket.id.slice(0, 8));

  return (
    <Slide direction="up" in={visible} timeout={400}>
      <TableRow
        hover
        onClick={onClick}
        onKeyDown={(e) => { if (e.key === 'Enter') onClick(); }}
        tabIndex={0}
        sx={{
          cursor: 'pointer',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            backgroundColor: 'rgba(99, 102, 241, 0.08)',
            transform: 'scale(1.01)',
          },
          '&:active': {
            transform: 'scale(0.99)',
          },
        }}
      >
        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {ticket.priority === 'high' && (
              <PriorityHighIcon sx={{ color: 'error.main', fontSize: '1rem' }} />
            )}
            {idText}
          </Box>
        </TableCell>
        
        <TableCell>
          <Typography variant="body2" sx={{ fontWeight: 500, color: 'white' }}>
            {ticket.subject}
          </Typography>
        </TableCell>
        
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem', bgcolor: 'primary.main' }}>
              {ticket.sender_name?.charAt(0) || 'U'}
            </Avatar>
            <Typography variant="body2">{ticket.sender_name}</Typography>
          </Box>
        </TableCell>
        
        <TableCell>
          <Chip
            label={ticket.status ?? 'unknown'}
            color={getStatusColor(ticket.status) as any}
            size="small"
            sx={{
              textTransform: 'capitalize',
              fontWeight: 600,
              minWidth: '80px',
            }}
          />
        </TableCell>
        
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'grey.400' }}>
            <AccessTimeIcon sx={{ fontSize: '1rem' }} />
            <Typography variant="body2">
              {ticket.created_at ? new Date(ticket.created_at).toLocaleString() : '-'}
            </Typography>
          </Box>
        </TableCell>
      </TableRow>
    </Slide>
  );
}

export default function DashboardPage({ user }: { user: User | null }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const total = tickets.length;
    const open = tickets.filter(t => t.status === 'open').length;
    const pending = tickets.filter(t => t.status === 'pending').length;
    const closed = tickets.filter(t => t.status === 'closed').length;
    
    return { total, open, pending, closed };
  }, [tickets]);

  const groupedTickets = useMemo(() => {
    const groups: { [key: string]: Ticket[] } = {};
    tickets.forEach(ticket => {
      const groupName = ticket.group_name || 'General Support';
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
        fetchTickets();
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

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
          Loading your tickets...
        </Typography>
        <LinearProgress 
          sx={{ 
            width: '200px', 
            borderRadius: 2,
            backgroundColor: 'grey.800',
            '& .MuiLinearProgress-bar': {
              background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
            }
          }} 
        />
      </Box>
    );
  }

  return (
    <Box sx={{ color: 'white' }}>
      <Fade in timeout={800}>
        <Box>
          {/* Header */}
          <Box sx={{ mb: 6 }}>
            <Typography 
              variant="h3" 
              sx={{ 
                fontWeight: 800, 
                mb: 2,
                background: 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Dashboard
            </Typography>
            <Typography variant="h6" sx={{ color: 'grey.400', fontWeight: 400 }}>
              Welcome back, {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Agent'}
            </Typography>
          </Box>

          {/* Stats Cards */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 6 }}>
            <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', lg: '1 1 22%' } }}>
              <StatsCard
                title="Total Tickets"
                value={stats.total}
                icon={<TicketIcon />}
                color="#6366f1"
                trend={12}
                delay={100}
              />
            </Box>
            <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', lg: '1 1 22%' } }}>
              <StatsCard
                title="Open Tickets"
                value={stats.open}
                icon={<OpenIcon />}
                color="#10b981"
                trend={8}
                delay={200}
              />
            </Box>
            <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', lg: '1 1 22%' } }}>
              <StatsCard
                title="Pending"
                value={stats.pending}
                icon={<PendingIcon />}
                color="#f59e0b"
                delay={300}
              />
            </Box>
            <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', lg: '1 1 22%' } }}>
              <StatsCard
                title="Resolved"
                value={stats.closed}
                icon={<ClosedIcon />}
                color="#8b5cf6"
                trend={15}
                delay={400}
              />
            </Box>
          </Box>
        </Box>
      </Fade>

      {/* Tickets by Group */}
      <Fade in timeout={1000}>
        <Box>
          {Object.entries(groupedTickets).map(([groupName, groupTickets], groupIndex) => (
            <Slide key={groupName} direction="up" in timeout={600 + groupIndex * 100}>
              <Accordion 
                defaultExpanded 
                sx={{ 
                  mb: 3,
                  background: 'linear-gradient(135deg, rgba(26, 26, 46, 0.8) 0%, rgba(22, 33, 62, 0.6) 100%)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '16px !important',
                  '&:before': { display: 'none' },
                  '&.Mui-expanded': {
                    margin: '0 0 24px 0',
                  },
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon sx={{ color: 'primary.light' }} />}
                  sx={{
                    borderRadius: '16px 16px 0 0',
                    '&.Mui-expanded': {
                      borderRadius: '16px 16px 0 0',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: 'white' }}>
                      {groupName}
                    </Typography>
                    <Badge 
                      badgeContent={groupTickets.length} 
                      color="primary"
                      sx={{
                        '& .MuiBadge-badge': {
                          backgroundColor: 'primary.main',
                          color: 'white',
                          fontWeight: 600,
                        }
                      }}
                    >
                      <Chip 
                        label={`${groupTickets.length} tickets`} 
                        size="small"
                        sx={{ 
                          backgroundColor: 'rgba(99, 102, 241, 0.2)',
                          color: 'primary.light',
                          fontWeight: 500,
                        }}
                      />
                    </Badge>
                  </Box>
                </AccordionSummary>

                <AccordionDetails sx={{ p: 0 }}>
                  <Paper 
                    elevation={0}
                    sx={{ 
                      background: 'rgba(15, 15, 35, 0.4)',
                      backdropFilter: 'blur(10px)',
                      border: 'none',
                      borderRadius: 0,
                    }}
                  >
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow sx={{ '& .MuiTableCell-head': { borderBottom: '1px solid rgba(255, 255, 255, 0.1)' } }}>
                            <TableCell sx={{ fontWeight: 700, color: 'primary.light', fontSize: '0.9rem' }}>
                              ID
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700, color: 'primary.light', fontSize: '0.9rem' }}>
                              Subject
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700, color: 'primary.light', fontSize: '0.9rem' }}>
                              Customer
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700, color: 'primary.light', fontSize: '0.9rem' }}>
                              Status
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700, color: 'primary.light', fontSize: '0.9rem' }}>
                              Last Update
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {groupTickets.map((ticket, ticketIndex) => (
                            <TicketRow
                              key={ticket.id}
                              ticket={ticket}
                              index={ticketIndex}
                              onClick={() => navigate(`/tickets/${ticket.id}`)}
                            />
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                </AccordionDetails>
              </Accordion>
            </Slide>
          ))}
        </Box>
      </Fade>

      {/* Empty State */}
      {tickets.length === 0 && (
        <Fade in timeout={1200}>
          <Paper
            elevation={0}
            sx={{
              p: 8,
              textAlign: 'center',
              background: 'linear-gradient(135deg, rgba(26, 26, 46, 0.6) 0%, rgba(22, 33, 62, 0.4) 100%)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 4,
            }}
          >
            <TicketIcon sx={{ fontSize: '4rem', color: 'grey.600', mb: 2 }} />
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
              No tickets yet
            </Typography>
            <Typography variant="body1" sx={{ color: 'grey.400', maxWidth: '400px', mx: 'auto' }}>
              When customers reach out via WhatsApp, their tickets will appear here.
              Your support dashboard is ready to go!
            </Typography>
          </Paper>
        </Fade>
      )}
    </Box>
  );
}