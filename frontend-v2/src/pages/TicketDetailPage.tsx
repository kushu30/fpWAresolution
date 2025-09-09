import { useState, useEffect, useRef } from 'react';
import type { FormEvent, JSX } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

// shadcn/ui Imports
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send } from 'lucide-react';

interface Message {
  id: string;
  body: string;
  source: 'user' | 'agent';
  created_at: string;
  image_url?: string; // optional attachment URL (saved from bot -> Supabase)
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

export default function TicketDetailPage(): JSX.Element {
  const { ticketId } = useParams<{ ticketId: string }>();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;
    let channel: RealtimeChannel | null = null;

    const fetchTicketDetails = async () => {
      if (!ticketId) {
        setTicket(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from('tickets')
        .select(`*, messages(*)`)
        .eq('id', ticketId)
        .order('created_at', { foreignTable: 'messages', ascending: true })
        .single();

      if (!mounted) return;
      if (error) {
        console.error('Error fetching ticket details:', error);
        setTicket(null);
      } else {
        setTicket(data as Ticket);
      }
      setLoading(false);
    };

    fetchTicketDetails();

    // Subscribe to real-time message inserts for this ticket
    if (ticketId) {
      channel = supabase
        .channel(`ticket:${ticketId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `ticket_id=eq.${ticketId}`,
          },
          (payload) => {
            if (!mounted) return;
            const newMsg = payload.new as Message;
            setTicket((prev) =>
              prev
                ? { ...prev, messages: [...(prev.messages ?? []), newMsg] }
                : prev
            );
          }
        )
        .subscribe();
    }

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [ticketId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (!containerRef.current) return;
    const id = window.setTimeout(() => {
      containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' });
    }, 50);
    return () => clearTimeout(id);
  }, [ticket?.messages?.length]);

  const handleReply = async (e: FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !ticket || !ticket.id) return;

    setIsReplying(true);
    const agentName = 'Support Agent';
    const idText = ticket.ticket_id_text ?? (ticket.ticket_number ? `#${ticket.ticket_number}` : ticket.id.slice(0, 8));
    const fullReplyText = `Reply on ${idText}: ${replyText.trim()}`;

    try {
      const response = await fetch(`http://localhost:3001/tickets/${ticket.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentName, text: fullReplyText }),
      });

      if (!response.ok) throw new Error('Failed to send reply');

      // Optimistic UI update
      const newMessage: Message = {
        id: new Date().toISOString(),
        body: fullReplyText,
        source: 'agent',
        created_at: new Date().toISOString(),
      };

      setTicket((prev) =>
        prev ? { ...prev, messages: [...(prev.messages ?? []), newMessage] } : prev
      );
      setReplyText('');
    } catch (err) {
      console.error('Error sending reply:', err);
      // Consider showing a toast/toast library here in real app
    } finally {
      setIsReplying(false);
    }
  };

  if (loading) return <div className="p-6">Loading ticket...</div>;
  if (!ticket || !ticket.id) return <div className="p-6">Ticket not found.</div>;

  return (
    <div className="flex flex-col h-full">
      <CardHeader className="px-4 py-3">
        <CardTitle className="text-lg font-semibold">
          Ticket #{ticket.ticket_id_text ?? ticket.ticket_number ?? ticket.id.slice(0, 8)}
        </CardTitle>
        <CardDescription className="mb-2">{ticket.subject ?? 'No subject'}</CardDescription>
        <Badge variant={ticket.status === 'open' ? 'default' : 'secondary'} className="w-fit">
          {ticket.status ?? 'Unknown'}
        </Badge>
      </CardHeader>

      <CardContent ref={containerRef} className="flex-grow overflow-y-auto space-y-4 p-4">
        {(ticket.messages ?? []).map((message) => {
          const isAgent = message.source === 'agent';
          return (
            <div
              key={message.id}
              className={`flex items-start gap-3 ${isAgent ? 'justify-end' : 'justify-start'}`}
            >
              {!isAgent && (
                <Avatar>
                  <AvatarFallback>{ticket.sender_name?.charAt(0) ?? '?'}</AvatarFallback>
                </Avatar>
              )}

              <div
                className={`rounded-lg p-3 max-w-xs lg:max-w-md ${
                  isAgent ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                {/* Image attachment (if present) */}
                {message.image_url && (
                  <img
                    src={message.image_url}
                    alt="Attachment"
                    loading="lazy"
                    className="rounded-md mb-2 max-w-full h-auto cursor-pointer"
                    onClick={() => window.open(message.image_url, '_blank')}
                  />
                )}

                {/* Message body */}
                <p className="text-sm whitespace-pre-wrap">{message.body}</p>
                <p className="text-xs text-muted-foreground text-right mt-1">
                  {new Date(message.created_at).toLocaleTimeString()}
                </p>
              </div>

              {isAgent && (
                <Avatar>
                  <AvatarFallback>A</AvatarFallback>
                </Avatar>
              )}
            </div>
          );
        })}
      </CardContent>

      <div className="p-4 border-t">
        <form onSubmit={handleReply} className="flex items-center gap-2">
          <Input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Type your reply..."
            disabled={isReplying}
            className="flex-grow"
          />
          <Button type="submit" size="icon" disabled={isReplying || !replyText.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
