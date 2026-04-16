
CREATE TABLE public.master_data_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by_user_id uuid,
  uploaded_by_name text NOT NULL,
  file_name text NOT NULL,
  total_records integer NOT NULL DEFAULT 0,
  summary jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.master_data_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view upload history"
ON public.master_data_uploads FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert upload records"
ON public.master_data_uploads FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can delete upload records"
ON public.master_data_uploads FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_master_data_uploads_created_at ON public.master_data_uploads (created_at DESC);
