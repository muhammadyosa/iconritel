
-- Create daily ticket history table to persist ticket counts per day
CREATE TABLE public.daily_ticket_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  ritel INTEGER NOT NULL DEFAULT 0,
  feeder INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  created INTEGER NOT NULL DEFAULT 0,
  in_progress INTEGER NOT NULL DEFAULT 0,
  resolved INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.daily_ticket_history ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view all history
CREATE POLICY "Authenticated users can view ticket history"
  ON public.daily_ticket_history FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Authenticated users can insert history
CREATE POLICY "Authenticated users can insert ticket history"
  ON public.daily_ticket_history FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Authenticated users can update history
CREATE POLICY "Authenticated users can update ticket history"
  ON public.daily_ticket_history FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Create index on date for fast lookups
CREATE INDEX idx_daily_ticket_history_date ON public.daily_ticket_history (date);

-- Trigger for updated_at
CREATE TRIGGER update_daily_ticket_history_updated_at
  BEFORE UPDATE ON public.daily_ticket_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
