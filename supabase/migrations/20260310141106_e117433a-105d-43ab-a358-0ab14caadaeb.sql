
-- Add sla_ok column to daily_ticket_history
ALTER TABLE public.daily_ticket_history ADD COLUMN IF NOT EXISTS sla_ok integer NOT NULL DEFAULT 0;

-- Create daily_category_history table for per-constraint daily counts
CREATE TABLE public.daily_category_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  constraint_type text NOT NULL,
  count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(date, constraint_type)
);

-- Enable RLS
ALTER TABLE public.daily_category_history ENABLE ROW LEVEL SECURITY;

-- RLS policies (same pattern as daily_ticket_history)
CREATE POLICY "Authenticated users can view category history"
  ON public.daily_category_history FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert category history"
  ON public.daily_category_history FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update category history"
  ON public.daily_category_history FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Add updated_at trigger
CREATE TRIGGER update_daily_category_history_updated_at
  BEFORE UPDATE ON public.daily_category_history
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
