
CREATE TABLE public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tab_key text NOT NULL,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  created_by_user_id uuid NOT NULL,
  created_by_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view notes
CREATE POLICY "Authenticated users can view notes"
  ON public.notes FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- All authenticated users can create notes
CREATE POLICY "Authenticated users can create notes"
  ON public.notes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- All authenticated users can update notes
CREATE POLICY "Authenticated users can update notes"
  ON public.notes FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Only admins can delete notes
CREATE POLICY "Only admins can delete notes"
  ON public.notes FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notes;
