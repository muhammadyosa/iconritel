-- Add ticket_id column to store the user-provided ticket ID
ALTER TABLE public.tickets ADD COLUMN ticket_id TEXT;

-- Migrate existing data: copy id to ticket_id for existing records
UPDATE public.tickets SET ticket_id = id::text WHERE ticket_id IS NULL;

-- Make ticket_id NOT NULL after migration
ALTER TABLE public.tickets ALTER COLUMN ticket_id SET NOT NULL;

-- Create index for ticket_id lookups
CREATE INDEX idx_tickets_ticket_id ON public.tickets(ticket_id);