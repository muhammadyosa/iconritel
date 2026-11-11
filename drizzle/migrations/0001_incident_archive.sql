CREATE TABLE public.incident_archive (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id text NOT NULL UNIQUE,
  service_id text,
  customer_name text,
  serpo text,
  hostname text,
  constraint_type text,
  category text,
  ticket_result text,
  status text NOT NULL,
  created_at timestamptz NOT NULL,
  created_by_user_id uuid,
  created_by_name text,
  resolved_at timestamptz,
  resolved_by_user_id uuid,
  resolved_by_name text,
  resolution_minutes integer,
  reopen_count integer NOT NULL DEFAULT 0,
  archived_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.incident_archive TO authenticated;
GRANT ALL ON public.incident_archive TO service_role;
ALTER TABLE public.incident_archive ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved users can view incident archive" ON public.incident_archive
  FOR SELECT TO authenticated USING (public.is_approved_user(auth.uid()));

CREATE INDEX idx_incident_archive_created_at ON public.incident_archive(created_at);
CREATE INDEX idx_incident_archive_resolved_at ON public.incident_archive(resolved_at);
CREATE INDEX idx_incident_archive_resolver ON public.incident_archive(resolved_by_user_id);
CREATE INDEX idx_incident_archive_open ON public.incident_archive(status) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ticket_status_history_changed_by ON public.ticket_status_history(changed_by_user_id, created_at);

CREATE OR REPLACE FUNCTION public.archive_incident()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_created timestamptz;
BEGIN
  BEGIN
    v_created := NEW.created_iso::timestamptz;
  EXCEPTION WHEN others THEN
    v_created := NEW.created_at;
  END;
  INSERT INTO public.incident_archive AS a (
    ticket_id, service_id, customer_name, serpo, hostname, constraint_type, category, ticket_result,
    status, created_at, created_by_user_id, created_by_name, resolved_at, resolved_by_user_id,
    resolved_by_name, resolution_minutes
  ) VALUES (
    NEW.ticket_id, NEW.service_id, NEW.customer_name, NEW.serpo, NEW.hostname, NEW.constraint_type,
    NEW.category, NEW.ticket_result, NEW.status, v_created, NEW.created_by_user_id, NEW.created_by_name,
    NEW.resolved_at, NEW.resolved_by_user_id, NEW.resolved_by_name,
    CASE WHEN NEW.resolved_at IS NOT NULL THEN GREATEST(0, (EXTRACT(EPOCH FROM (NEW.resolved_at - v_created)) / 60)::int) END
  )
  ON CONFLICT (ticket_id) DO UPDATE SET
    service_id = EXCLUDED.service_id,
    customer_name = EXCLUDED.customer_name,
    serpo = EXCLUDED.serpo,
    hostname = EXCLUDED.hostname,
    constraint_type = EXCLUDED.constraint_type,
    category = EXCLUDED.category,
    ticket_result = EXCLUDED.ticket_result,
    status = EXCLUDED.status,
    created_by_user_id = COALESCE(EXCLUDED.created_by_user_id, a.created_by_user_id),
    created_by_name = COALESCE(EXCLUDED.created_by_name, a.created_by_name),
    -- keep the last resolution when the incident is reopened, replace when resolved again
    resolved_at = COALESCE(EXCLUDED.resolved_at, CASE WHEN EXCLUDED.status = 'Resolved' THEN a.resolved_at END),
    resolved_by_user_id = COALESCE(EXCLUDED.resolved_by_user_id, CASE WHEN EXCLUDED.status = 'Resolved' THEN a.resolved_by_user_id END),
    resolved_by_name = COALESCE(EXCLUDED.resolved_by_name, CASE WHEN EXCLUDED.status = 'Resolved' THEN a.resolved_by_name END),
    resolution_minutes = COALESCE(EXCLUDED.resolution_minutes, CASE WHEN EXCLUDED.status = 'Resolved' THEN a.resolution_minutes END),
    reopen_count = a.reopen_count + CASE WHEN a.status = 'Resolved' AND EXCLUDED.status <> 'Resolved' THEN 1 ELSE 0 END,
    updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_archive_incident
AFTER INSERT OR UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.archive_incident();

INSERT INTO public.incident_archive (
  ticket_id, service_id, customer_name, serpo, hostname, constraint_type, category, ticket_result,
  status, created_at, created_by_user_id, created_by_name, resolved_at, resolved_by_user_id,
  resolved_by_name, resolution_minutes
)
SELECT DISTINCT ON (ticket_id) ticket_id, service_id, customer_name, serpo, hostname, constraint_type, category, ticket_result,
  status, created_at, created_by_user_id, created_by_name, resolved_at, resolved_by_user_id, resolved_by_name,
  CASE WHEN resolved_at IS NOT NULL THEN GREATEST(0, (EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60)::int) END
FROM public.tickets
ORDER BY ticket_id, created_at DESC
ON CONFLICT (ticket_id) DO NOTHING;

ALTER PUBLICATION supabase_realtime ADD TABLE public.incident_archive;