
CREATE OR REPLACE FUNCTION public.is_approved_user(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _user_id AND is_approved = true);
$$;
REVOKE EXECUTE ON FUNCTION public.is_approved_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_approved_user(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

DROP POLICY IF EXISTS "Team members can view all profiles" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Approved users can view approved profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_approved_user(auth.uid()) AND is_approved = true);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated users can view all tickets" ON public.tickets;
DROP POLICY IF EXISTS "Authenticated users can create tickets" ON public.tickets;
DROP POLICY IF EXISTS "Authenticated users can update tickets" ON public.tickets;
CREATE POLICY "Approved users can view tickets" ON public.tickets FOR SELECT TO authenticated USING (public.is_approved_user(auth.uid()));
CREATE POLICY "Approved users can create tickets" ON public.tickets FOR INSERT TO authenticated WITH CHECK (public.is_approved_user(auth.uid()));
CREATE POLICY "Approved users can update tickets" ON public.tickets FOR UPDATE TO authenticated USING (public.is_approved_user(auth.uid())) WITH CHECK (public.is_approved_user(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view all shift reports" ON public.shift_reports;
DROP POLICY IF EXISTS "Authenticated users can create shift reports" ON public.shift_reports;
DROP POLICY IF EXISTS "Authenticated users can update shift reports" ON public.shift_reports;
CREATE POLICY "Approved users can view shift reports" ON public.shift_reports FOR SELECT TO authenticated USING (public.is_approved_user(auth.uid()));
CREATE POLICY "Approved users can create shift reports" ON public.shift_reports FOR INSERT TO authenticated WITH CHECK (public.is_approved_user(auth.uid()));
CREATE POLICY "Approved users can update shift reports" ON public.shift_reports FOR UPDATE TO authenticated USING (public.is_approved_user(auth.uid())) WITH CHECK (public.is_approved_user(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view notes" ON public.notes;
DROP POLICY IF EXISTS "Authenticated users can create notes" ON public.notes;
DROP POLICY IF EXISTS "Authenticated users can update notes" ON public.notes;
CREATE POLICY "Approved users can view notes" ON public.notes FOR SELECT TO authenticated USING (public.is_approved_user(auth.uid()));
CREATE POLICY "Approved users can create notes" ON public.notes FOR INSERT TO authenticated WITH CHECK (public.is_approved_user(auth.uid()));
CREATE POLICY "Approved users can update notes" ON public.notes FOR UPDATE TO authenticated USING (public.is_approved_user(auth.uid())) WITH CHECK (public.is_approved_user(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view ticket history" ON public.daily_ticket_history;
DROP POLICY IF EXISTS "Authenticated users can insert ticket history" ON public.daily_ticket_history;
DROP POLICY IF EXISTS "Authenticated users can update ticket history" ON public.daily_ticket_history;
CREATE POLICY "Approved users can view ticket history" ON public.daily_ticket_history FOR SELECT TO authenticated USING (public.is_approved_user(auth.uid()));
CREATE POLICY "Approved users can insert ticket history" ON public.daily_ticket_history FOR INSERT TO authenticated WITH CHECK (public.is_approved_user(auth.uid()));
CREATE POLICY "Approved users can update ticket history" ON public.daily_ticket_history FOR UPDATE TO authenticated USING (public.is_approved_user(auth.uid())) WITH CHECK (public.is_approved_user(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view category history" ON public.daily_category_history;
DROP POLICY IF EXISTS "Authenticated users can insert category history" ON public.daily_category_history;
DROP POLICY IF EXISTS "Authenticated users can update category history" ON public.daily_category_history;
CREATE POLICY "Approved users can view category history" ON public.daily_category_history FOR SELECT TO authenticated USING (public.is_approved_user(auth.uid()));
CREATE POLICY "Approved users can insert category history" ON public.daily_category_history FOR INSERT TO authenticated WITH CHECK (public.is_approved_user(auth.uid()));
CREATE POLICY "Approved users can update category history" ON public.daily_category_history FOR UPDATE TO authenticated USING (public.is_approved_user(auth.uid())) WITH CHECK (public.is_approved_user(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view user ticket history" ON public.daily_user_ticket_history;
DROP POLICY IF EXISTS "Authenticated users can insert user ticket history" ON public.daily_user_ticket_history;
DROP POLICY IF EXISTS "Authenticated users can update user ticket history" ON public.daily_user_ticket_history;
CREATE POLICY "Approved users can view user ticket history" ON public.daily_user_ticket_history FOR SELECT TO authenticated USING (public.is_approved_user(auth.uid()));
CREATE POLICY "Approved users can insert user ticket history" ON public.daily_user_ticket_history FOR INSERT TO authenticated WITH CHECK (public.is_approved_user(auth.uid()));
CREATE POLICY "Approved users can update user ticket history" ON public.daily_user_ticket_history FOR UPDATE TO authenticated USING (public.is_approved_user(auth.uid())) WITH CHECK (public.is_approved_user(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view status history" ON public.ticket_status_history;
DROP POLICY IF EXISTS "Authenticated users can insert status history" ON public.ticket_status_history;
CREATE POLICY "Approved users can view status history" ON public.ticket_status_history FOR SELECT TO authenticated USING (public.is_approved_user(auth.uid()));
CREATE POLICY "Approved users can insert status history" ON public.ticket_status_history FOR INSERT TO authenticated WITH CHECK (public.is_approved_user(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view upload history" ON public.master_data_uploads;
DROP POLICY IF EXISTS "Authenticated users can insert upload records" ON public.master_data_uploads;
CREATE POLICY "Approved users can view upload history" ON public.master_data_uploads FOR SELECT TO authenticated USING (public.is_approved_user(auth.uid()));
CREATE POLICY "Approved users can insert upload records" ON public.master_data_uploads FOR INSERT TO authenticated WITH CHECK (public.is_approved_user(auth.uid()));

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_display_name_len CHECK (display_name IS NULL OR char_length(display_name) <= 100),
  ADD CONSTRAINT profiles_email_len CHECK (char_length(email) <= 320),
  ADD CONSTRAINT profiles_avatar_url_len CHECK (avatar_url IS NULL OR char_length(avatar_url) <= 2048);

ALTER TABLE public.tickets
  ADD CONSTRAINT tickets_customer_name_len CHECK (char_length(customer_name) <= 200),
  ADD CONSTRAINT tickets_service_id_len CHECK (char_length(service_id) <= 100),
  ADD CONSTRAINT tickets_hostname_len CHECK (char_length(hostname) <= 200),
  ADD CONSTRAINT tickets_fat_id_len CHECK (char_length(fat_id) <= 100),
  ADD CONSTRAINT tickets_sn_ont_len CHECK (char_length(sn_ont) <= 100),
  ADD CONSTRAINT tickets_serpo_len CHECK (char_length(serpo) <= 100),
  ADD CONSTRAINT tickets_constraint_len CHECK (char_length(constraint_type) <= 100),
  ADD CONSTRAINT tickets_category_len CHECK (char_length(category) <= 100),
  ADD CONSTRAINT tickets_ticket_result_len CHECK (char_length(ticket_result) <= 2000),
  ADD CONSTRAINT tickets_pending_reason_len CHECK (pending_reason IS NULL OR char_length(pending_reason) <= 2000);

ALTER TABLE public.shift_reports
  ADD CONSTRAINT shift_reports_officer_len CHECK (char_length(officer) <= 200),
  ADD CONSTRAINT shift_reports_olt_down_len CHECK (olt_down IS NULL OR char_length(olt_down) <= 10000),
  ADD CONSTRAINT shift_reports_port_down_len CHECK (port_down IS NULL OR char_length(port_down) <= 10000),
  ADD CONSTRAINT shift_reports_fat_loss_len CHECK (fat_loss IS NULL OR char_length(fat_loss) <= 10000),
  ADD CONSTRAINT shift_reports_issues_len CHECK (issues IS NULL OR char_length(issues) <= 10000),
  ADD CONSTRAINT shift_reports_notes_len CHECK (notes IS NULL OR char_length(notes) <= 10000);

ALTER TABLE public.notes
  ADD CONSTRAINT notes_title_len CHECK (char_length(title) <= 300),
  ADD CONSTRAINT notes_content_len CHECK (char_length(content) <= 50000);
