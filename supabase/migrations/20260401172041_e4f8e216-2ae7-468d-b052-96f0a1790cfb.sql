
INSERT INTO public.daily_user_ticket_history (date, user_name, user_id, total_created, total_resolved)
SELECT 
  DATE(created_iso::timestamp) as date,
  created_by_name as user_name,
  created_by_user_id as user_id,
  COUNT(*) as total_created,
  COUNT(CASE WHEN status = 'Resolved' THEN 1 END) as total_resolved
FROM public.tickets 
WHERE created_by_name IS NOT NULL
GROUP BY DATE(created_iso::timestamp), created_by_name, created_by_user_id
ON CONFLICT (date, user_name) DO UPDATE SET 
  total_created = EXCLUDED.total_created,
  total_resolved = EXCLUDED.total_resolved;
