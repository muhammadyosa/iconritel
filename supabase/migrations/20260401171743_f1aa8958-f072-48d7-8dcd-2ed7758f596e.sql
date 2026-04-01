
-- Table to persist per-user daily incident counts (survives ticket auto-cleanup)
CREATE TABLE public.daily_user_ticket_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  user_name TEXT NOT NULL,
  user_id UUID,
  total_created INTEGER NOT NULL DEFAULT 0,
  total_resolved INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(date, user_name)
);

-- Enable RLS
ALTER TABLE public.daily_user_ticket_history ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view user ticket history"
  ON public.daily_user_ticket_history FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert user ticket history"
  ON public.daily_user_ticket_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update user ticket history"
  ON public.daily_user_ticket_history FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can delete user ticket history"
  ON public.daily_user_ticket_history FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Auto-update trigger for updated_at
CREATE TRIGGER update_daily_user_ticket_history_updated_at
  BEFORE UPDATE ON public.daily_user_ticket_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_user_ticket_history;
