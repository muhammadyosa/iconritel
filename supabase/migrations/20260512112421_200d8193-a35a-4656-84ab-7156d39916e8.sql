
CREATE OR REPLACE FUNCTION public.recompute_daily_history(start_date date, end_date date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_rows int := 0;
  v_day_rows int := 0;
  feeder_constraints text[] := ARRAY['FAT BAD RX','FAT LOSS','PORT DOWN','PORT BAD RX','OLT DOWN','OLT BAD RX','CABLE PROBLEM (FEEDER)'];
BEGIN
  -- ===== Per-user history =====
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

  -- ===== Daily history with ritel/feeder/sla_ok =====
  WITH events AS (
    SELECT ticket_id, old_status, new_status,
           (created_at AT TIME ZONE 'Asia/Jakarta')::date AS d,
           created_at
    FROM public.ticket_status_history
    WHERE (created_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN start_date AND end_date
  ),
  -- Earliest creation event per ticket
  ticket_first AS (
    SELECT ticket_id, MIN(created_at) AS first_at,
           MIN(d) AS first_date
    FROM events
    WHERE old_status IS NULL
    GROUP BY ticket_id
  ),
  -- Earliest resolved event per ticket
  ticket_resolved AS (
    SELECT ticket_id, MIN(created_at) AS resolved_at,
           MIN(d) AS resolved_date
    FROM events
    WHERE new_status = 'Resolved'
    GROUP BY ticket_id
  ),
  -- SLA: resolved within 24h of creation, bucketed at the resolved date
  sla_per_day AS (
    SELECT r.resolved_date AS d,
           COUNT(DISTINCT r.ticket_id)::int AS sla_ok
    FROM ticket_resolved r
    JOIN ticket_first f ON f.ticket_id = r.ticket_id
    WHERE r.resolved_at - f.first_at <= INTERVAL '24 hours'
    GROUP BY r.resolved_date
  ),
  -- Daily aggregate from events
  agg AS (
    SELECT d AS date,
      COUNT(DISTINCT ticket_id)::int AS total,
      COUNT(*) FILTER (WHERE old_status IS NULL)::int AS created,
      COUNT(DISTINCT ticket_id) FILTER (WHERE new_status = 'Resolved')::int AS resolved,
      COUNT(DISTINCT ticket_id) FILTER (WHERE new_status = 'On Progress')::int AS in_progress
    FROM events GROUP BY d
  ),
  -- Constraint info: prefer live tickets table, fall back to category history
  ticket_constraint AS (
    SELECT t.ticket_id, t.constraint_type
    FROM public.tickets t
  ),
  ritel_feeder_live AS (
    SELECT f.first_date AS d,
      COUNT(*) FILTER (WHERE tc.constraint_type = ANY(feeder_constraints))::int AS feeder_live,
      COUNT(*) FILTER (WHERE tc.constraint_type IS NOT NULL AND NOT (tc.constraint_type = ANY(feeder_constraints)))::int AS ritel_live,
      COUNT(*) FILTER (WHERE tc.constraint_type IS NOT NULL)::int AS known_live
    FROM ticket_first f
    LEFT JOIN ticket_constraint tc ON tc.ticket_id = f.ticket_id
    GROUP BY f.first_date
  ),
  -- Fallback constraint sums per day from daily_category_history
  cat_sum AS (
    SELECT date AS d,
      SUM(CASE WHEN constraint_type = ANY(feeder_constraints) THEN count ELSE 0 END)::int AS feeder_cat,
      SUM(CASE WHEN NOT (constraint_type = ANY(feeder_constraints)) THEN count ELSE 0 END)::int AS ritel_cat,
      SUM(count)::int AS total_cat
    FROM public.daily_category_history
    WHERE date BETWEEN start_date AND end_date
    GROUP BY date
  ),
  combined AS (
    SELECT a.date, a.total, a.created, a.resolved, a.in_progress,
      COALESCE(s.sla_ok, 0) AS sla_ok,
      -- Use live constraints first; if missing tickets, distribute remainder using cat_sum proportions
      CASE
        WHEN COALESCE(rf.known_live,0) >= a.total THEN COALESCE(rf.ritel_live,0)
        WHEN COALESCE(c.total_cat,0) > 0 THEN
          COALESCE(rf.ritel_live,0) + ROUND(((a.total - COALESCE(rf.known_live,0))::numeric * COALESCE(c.ritel_cat,0)) / NULLIF(c.total_cat,0))::int
        ELSE COALESCE(rf.ritel_live,0)
      END AS ritel,
      CASE
        WHEN COALESCE(rf.known_live,0) >= a.total THEN COALESCE(rf.feeder_live,0)
        WHEN COALESCE(c.total_cat,0) > 0 THEN
          COALESCE(rf.feeder_live,0) + ROUND(((a.total - COALESCE(rf.known_live,0))::numeric * COALESCE(c.feeder_cat,0)) / NULLIF(c.total_cat,0))::int
        ELSE COALESCE(rf.feeder_live,0)
      END AS feeder
    FROM agg a
    LEFT JOIN sla_per_day s ON s.d = a.date
    LEFT JOIN ritel_feeder_live rf ON rf.d = a.date
    LEFT JOIN cat_sum c ON c.d = a.date
  ),
  upserted2 AS (
    INSERT INTO public.daily_ticket_history (date, total, created, resolved, in_progress, ritel, feeder, sla_ok)
    SELECT date, total, created, resolved, in_progress, ritel, feeder, sla_ok FROM combined
    ON CONFLICT (date) DO UPDATE
      SET total = GREATEST(public.daily_ticket_history.total, EXCLUDED.total),
          created = GREATEST(public.daily_ticket_history.created, EXCLUDED.created),
          resolved = GREATEST(public.daily_ticket_history.resolved, EXCLUDED.resolved),
          in_progress = GREATEST(public.daily_ticket_history.in_progress, EXCLUDED.in_progress),
          ritel = GREATEST(public.daily_ticket_history.ritel, EXCLUDED.ritel),
          feeder = GREATEST(public.daily_ticket_history.feeder, EXCLUDED.feeder),
          sla_ok = GREATEST(public.daily_ticket_history.sla_ok, EXCLUDED.sla_ok),
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
$function$;

-- Backfill May 2026 immediately
SELECT public.recompute_daily_history(DATE '2026-05-01', DATE '2026-05-31');
