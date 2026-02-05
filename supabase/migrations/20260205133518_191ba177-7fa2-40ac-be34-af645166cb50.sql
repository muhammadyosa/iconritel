-- Add created_by column to tickets table for tracking who created each incident
ALTER TABLE public.tickets ADD COLUMN created_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.tickets ADD COLUMN created_by_name text;

-- Create index for faster lookups
CREATE INDEX idx_tickets_created_by ON public.tickets(created_by_user_id);