
WITH creations AS (
  SELECT DISTINCT ON (ticket_id)
    ticket_id,
    changed_by_name,
    changed_by_user_id,
    (created_at AT TIME ZONE 'Asia/Jakarta')::date AS d
  FROM public.ticket_status_history
  WHERE old_status IS NULL
    AND changed_by_name IS NOT NULL
  ORDER BY ticket_id, created_at ASC
),
resolutions AS (
  SELECT DISTINCT ticket_id
  FROM public.ticket_status_history
  WHERE new_status = 'Resolved'
),
per_user_day AS (
  SELECT
    c.d AS date,
    c.changed_by_name AS user_name,
    (ARRAY_AGG(c.changed_by_user_id) FILTER (WHERE c.changed_by_user_id IS NOT NULL))[1] AS user_id,
    COUNT(*)::int AS total_created,
    COUNT(*) FILTER (WHERE r.ticket_id IS NOT NULL)::int AS total_resolved
  FROM creations c
  LEFT JOIN resolutions r ON r.ticket_id = c.ticket_id
  GROUP BY c.d, c.changed_by_name
)
INSERT INTO public.daily_user_ticket_history
  (date, user_name, user_id, total_created, total_resolved)
SELECT date, user_name, user_id, total_created, total_resolved
FROM per_user_day
ON CONFLICT (date, user_name) DO UPDATE
SET
  total_created  = GREATEST(daily_user_ticket_history.total_created,  EXCLUDED.total_created),
  total_resolved = GREATEST(daily_user_ticket_history.total_resolved, EXCLUDED.total_resolved),
  user_id        = COALESCE(daily_user_ticket_history.user_id, EXCLUDED.user_id),
  updated_at     = now();

WITH creations AS (
  SELECT DISTINCT ON (ticket_id)
    ticket_id,
    (created_at AT TIME ZONE 'Asia/Jakarta')::date AS d
  FROM public.ticket_status_history
  WHERE old_status IS NULL
  ORDER BY ticket_id, created_at ASC
),
resolutions AS (
  SELECT DISTINCT ticket_id
  FROM public.ticket_status_history
  WHERE new_status = 'Resolved'
),
per_day AS (
  SELECT
    c.d AS date,
    COUNT(*)::int AS total_created,
    COUNT(*) FILTER (WHERE r.ticket_id IS NOT NULL)::int AS total_resolved
  FROM creations c
  LEFT JOIN resolutions r ON r.ticket_id = c.ticket_id
  GROUP BY c.d
)
INSERT INTO public.daily_ticket_history
  (date, total, created, in_progress, resolved, ritel, feeder, sla_ok)
SELECT
  date,
  total_created,
  total_created,
  GREATEST(total_created - total_resolved, 0),
  total_resolved,
  0, 0, 0
FROM per_day
ON CONFLICT (date) DO UPDATE
SET
  total       = GREATEST(daily_ticket_history.total,    EXCLUDED.total),
  created     = GREATEST(daily_ticket_history.created,  EXCLUDED.created),
  resolved    = GREATEST(daily_ticket_history.resolved, EXCLUDED.resolved),
  ritel       = GREATEST(daily_ticket_history.ritel,    EXCLUDED.ritel),
  feeder      = GREATEST(daily_ticket_history.feeder,   EXCLUDED.feeder),
  sla_ok      = GREATEST(daily_ticket_history.sla_ok,   EXCLUDED.sla_ok),
  in_progress = GREATEST(
    GREATEST(daily_ticket_history.total, EXCLUDED.total)
    - GREATEST(daily_ticket_history.resolved, EXCLUDED.resolved),
    0
  ),
  updated_at  = now();
