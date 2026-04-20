-- Create ticket status history table for audit trail
CREATE TABLE public.ticket_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT NOT NULL,
  reason TEXT,
  changed_by_user_id UUID,
  changed_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_ticket_status_history_ticket_id ON public.ticket_status_history(ticket_id);
CREATE INDEX idx_ticket_status_history_created_at ON public.ticket_status_history(created_at DESC);

ALTER TABLE public.ticket_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view status history"
ON public.ticket_status_history
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert status history"
ON public.ticket_status_history
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can delete status history"
ON public.ticket_status_history
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_status_history;