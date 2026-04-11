
ALTER TABLE public.tickets
  ADD COLUMN resolved_by_user_id uuid DEFAULT NULL,
  ADD COLUMN resolved_by_name text DEFAULT NULL;
