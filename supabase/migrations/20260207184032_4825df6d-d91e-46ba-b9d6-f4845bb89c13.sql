-- Add resolved_at column to track when a ticket was resolved
ALTER TABLE public.tickets 
ADD COLUMN resolved_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for efficient cleanup queries
CREATE INDEX idx_tickets_resolved_at ON public.tickets (resolved_at) WHERE resolved_at IS NOT NULL;