ALTER TABLE public.master_data_uploads REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.master_data_uploads;