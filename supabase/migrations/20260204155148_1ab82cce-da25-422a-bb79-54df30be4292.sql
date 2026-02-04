-- Create tickets table for storing all incident tickets
CREATE TABLE public.tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  serpo TEXT NOT NULL,
  hostname TEXT NOT NULL,
  fat_id TEXT NOT NULL,
  sn_ont TEXT NOT NULL,
  constraint_type TEXT NOT NULL,
  category TEXT NOT NULL,
  ticket_result TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'On Progress',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_iso TEXT NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Create policy for anyone to read tickets (shared visibility)
CREATE POLICY "Anyone can view tickets" 
ON public.tickets 
FOR SELECT 
USING (true);

-- Create policy for anyone to insert tickets
CREATE POLICY "Anyone can create tickets" 
ON public.tickets 
FOR INSERT 
WITH CHECK (true);

-- Create policy for anyone to update tickets
CREATE POLICY "Anyone can update tickets" 
ON public.tickets 
FOR UPDATE 
USING (true);

-- Create policy for anyone to delete tickets
CREATE POLICY "Anyone can delete tickets" 
ON public.tickets 
FOR DELETE 
USING (true);

-- Enable realtime for tickets table
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;