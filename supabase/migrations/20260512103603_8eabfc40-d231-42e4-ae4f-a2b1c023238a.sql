CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Dedupe daily_user_ticket_history before adding unique constraint
WITH ranked AS (
  SELECT id,
    row_number() OVER (
      PARTITION BY date, user_id
      ORDER BY (total_created + total_resolved) DESC, updated_at DESC
    ) AS rn
  FROM public.daily_user_ticket_history
)
DELETE FROM public.daily_user_ticket_history
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Dedupe daily_ticket_history
WITH ranked AS (
  SELECT id,
    row_number() OVER (
      PARTITION BY date
      ORDER BY (total + created + resolved) DESC, updated_at DESC
    ) AS rn
  FROM public.daily_ticket_history
)
DELETE FROM public.daily_ticket_history
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Unique constraints
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'daily_user_ticket_history_date_user_id_key') THEN
    ALTER TABLE public.daily_user_ticket_history
      ADD CONSTRAINT daily_user_ticket_history_date_user_id_key UNIQUE (date, user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'daily_ticket_history_date_key') THEN
    ALTER TABLE public.daily_ticket_history
      ADD CONSTRAINT daily_ticket_history_date_key UNIQUE (date);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.recompute_daily_history(
  start_date date,
  end_date date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_rows int := 0;
  v_day_rows int := 0;
BEGIN
  WITH events AS (
    SELECT ticket_id, changed_by_user_id,
           COALESCE(NULLIF(changed_by_name, ''), 'Unknown') AS changed_by_name,
           old_status, new_status,
           (created_at AT TIME ZONE 'Asia/Jakarta')::date AS d
    FROM public.ticket_status_history
    WHERE (created_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN start_date AND end_date
  ),
  agg AS (
    SELECT d AS date, changed_by_user_id AS user_id, changed_by_name AS user_name,
           COUNT(*) FILTER (WHERE old_status IS NULL)::int AS total_created,
           COUNT(*) FILTER (WHERE new_status = 'Resolved')::int AS total_resolved
    FROM events WHERE changed_by_user_id IS NOT NULL
    GROUP BY d, changed_by_user_id, changed_by_name
  ),
  upserted AS (
    INSERT INTO public.daily_user_ticket_history (date, user_id, user_name, total_created, total_resolved)
    SELECT date, user_id, user_name, total_created, total_resolved FROM agg
    ON CONFLICT (date, user_id) DO UPDATE
      SET total_created = GREATEST(public.daily_user_ticket_history.total_created, EXCLUDED.total_created),
          total_resolved = GREATEST(public.daily_user_ticket_history.total_resolved, EXCLUDED.total_resolved),
          user_name = EXCLUDED.user_name,
          updated_at = now()
    RETURNING 1
  )
  SELECT count(*) INTO v_user_rows FROM upserted;

  WITH events AS (
    SELECT ticket_id, old_status, new_status,
           (created_at AT TIME ZONE 'Asia/Jakarta')::date AS d
    FROM public.ticket_status_history
    WHERE (created_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN start_date AND end_date
  ),
  agg AS (
    SELECT d AS date,
      COUNT(DISTINCT ticket_id)::int AS total,
      COUNT(*) FILTER (WHERE old_status IS NULL)::int AS created,
      COUNT(DISTINCT ticket_id) FILTER (WHERE new_status = 'Resolved')::int AS resolved,
      COUNT(DISTINCT ticket_id) FILTER (WHERE new_status = 'On Progress')::int AS in_progress
    FROM events GROUP BY d
  ),
  upserted2 AS (
    INSERT INTO public.daily_ticket_history (date, total, created, resolved, in_progress)
    SELECT date, total, created, resolved, in_progress FROM agg
    ON CONFLICT (date) DO UPDATE
      SET total = GREATEST(public.daily_ticket_history.total, EXCLUDED.total),
          created = GREATEST(public.daily_ticket_history.created, EXCLUDED.created),
          resolved = GREATEST(public.daily_ticket_history.resolved, EXCLUDED.resolved),
          in_progress = GREATEST(public.daily_ticket_history.in_progress, EXCLUDED.in_progress),
          updated_at = now()
    RETURNING 1
  )
  SELECT count(*) INTO v_day_rows FROM upserted2;

  RETURN jsonb_build_object(
    'start_date', start_date, 'end_date', end_date,
    'user_rows_upserted', v_user_rows,
    'daily_rows_upserted', v_day_rows,
    'ran_at', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.recompute_daily_history(date, date) TO authenticated;

DO $$ BEGIN
  PERFORM cron.unschedule('nightly-recompute-daily-history');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'nightly-recompute-daily-history',
  '15 17 * * *',
  $$ SELECT public.recompute_daily_history((now() AT TIME ZONE 'Asia/Jakarta')::date - 35, (now() AT TIME ZONE 'Asia/Jakarta')::date); $$
);