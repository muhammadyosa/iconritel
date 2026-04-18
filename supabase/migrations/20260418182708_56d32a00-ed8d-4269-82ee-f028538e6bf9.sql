ALTER TABLE public.tickets
ADD COLUMN IF NOT EXISTS pending_reason text,
ADD COLUMN IF NOT EXISTS pending_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS pending_by_name text,
ADD COLUMN IF NOT EXISTS pending_by_user_id uuid;