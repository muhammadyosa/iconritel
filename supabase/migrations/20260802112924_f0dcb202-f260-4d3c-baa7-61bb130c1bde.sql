CREATE TABLE public.user_menu_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  path text not null,
  created_at timestamptz not null default now(),
  unique (user_id, path)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_menu_access TO authenticated;
GRANT ALL ON public.user_menu_access TO service_role;

ALTER TABLE public.user_menu_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own menu access"
ON public.user_menu_access FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all menu access"
ON public.user_menu_access FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can manage menu access"
ON public.user_menu_access FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));