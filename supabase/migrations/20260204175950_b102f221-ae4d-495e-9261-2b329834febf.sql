-- Create role change logs table for audit trail
CREATE TABLE public.role_change_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  changed_by uuid NOT NULL,
  old_role text,
  new_role text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.role_change_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view logs
CREATE POLICY "Only admins can view role change logs"
  ON public.role_change_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Only admins can insert logs
CREATE POLICY "Only admins can insert role change logs"
  ON public.role_change_logs
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));