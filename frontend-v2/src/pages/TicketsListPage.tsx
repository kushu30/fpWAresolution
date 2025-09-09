import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Ticket {
  id: string;
  ticket_id_text: string;
  group_name: string;
  subject: string;
  status: string;
  created_at: string;
}

export default function TicketsListPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTickets = async () => {
      const { data, error } = await supabase.from('tickets').select('*').order('created_at', { ascending: false });
      if (error) console.error('Error fetching tickets:', error);
      else if (data) setTickets(data as Ticket[]);
    };
    fetchTickets();
    const channel: RealtimeChannel = supabase.channel('realtime-tickets').on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => fetchTickets()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Tickets</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Group</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Update</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((ticket) => (
              <TableRow key={ticket.id} onClick={() => navigate(`/tickets/${ticket.id}`)} className="cursor-pointer">
                <TableCell className="font-mono">{ticket.ticket_id_text}</TableCell>
                <TableCell>{ticket.subject}</TableCell>
                <TableCell>{ticket.group_name}</TableCell>
                <TableCell>
                  <Badge variant={ticket.status === 'open' ? 'default' : 'secondary'}>
                    {ticket.status}
                  </Badge>
                </TableCell>
                <TableCell>{new Date(ticket.created_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}