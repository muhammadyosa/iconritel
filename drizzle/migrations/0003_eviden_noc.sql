CREATE SEQUENCE IF NOT EXISTS public.noc_evaluation_code_seq;

CREATE TABLE public.noc_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE DEFAULT ('EVD-' || lpad(nextval('public.noc_evaluation_code_seq')::text, 5, '0')),
  sender_user_id uuid NOT NULL,
  sender_name text,
  recipient_user_id uuid NOT NULL,
  recipient_name text,
  recipient_team text,
  customer_information text NOT NULL,
  problem text NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','SENT','OPENED','IN PROGRESS','ANSWERED','REVISION REQUESTED','CLOSED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  opened_at timestamptz,
  answered_at timestamptz,
  closed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (sender_user_id <> recipient_user_id)
);
CREATE INDEX idx_noc_eval_sender ON public.noc_evaluations(sender_user_id);
CREATE INDEX idx_noc_eval_recipient ON public.noc_evaluations(recipient_user_id);

CREATE TABLE public.noc_evaluation_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id uuid NOT NULL REFERENCES public.noc_evaluations(id) ON DELETE CASCADE,
  revision_number int NOT NULL,
  reason text NOT NULL,
  submitted_by uuid NOT NULL,
  submitted_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (evaluation_id, revision_number)
);

CREATE TABLE public.noc_evaluation_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id uuid NOT NULL REFERENCES public.noc_evaluations(id) ON DELETE CASCADE,
  answer_id uuid REFERENCES public.noc_evaluation_answers(id) ON DELETE CASCADE,
  attachment_type text NOT NULL CHECK (attachment_type IN ('initial','answer')),
  file_path text NOT NULL UNIQUE,
  file_name text,
  mime_type text NOT NULL,
  file_size int NOT NULL,
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_noc_eval_att_eval ON public.noc_evaluation_attachments(evaluation_id);

CREATE TABLE public.noc_evaluation_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id uuid NOT NULL REFERENCES public.noc_evaluations(id) ON DELETE CASCADE,
  action text NOT NULL,
  from_status text,
  to_status text,
  note text,
  actor_user_id uuid,
  actor_name text,
  actor_kind text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_noc_eval_log_eval ON public.noc_evaluation_activity_logs(evaluation_id);

CREATE TABLE public.noc_evaluation_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  evaluation_id uuid NOT NULL REFERENCES public.noc_evaluations(id) ON DELETE CASCADE,
  evaluation_code text NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  summary text,
  link text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_noc_eval_notif_user ON public.noc_evaluation_notifications(user_id, created_at DESC);

-- Direct table access: admin read-only on core tables; users only their own notifications.
GRANT SELECT ON public.noc_evaluations, public.noc_evaluation_answers, public.noc_evaluation_attachments, public.noc_evaluation_activity_logs TO authenticated;
GRANT SELECT, UPDATE ON public.noc_evaluation_notifications TO authenticated;
GRANT ALL ON public.noc_evaluations, public.noc_evaluation_answers, public.noc_evaluation_attachments, public.noc_evaluation_activity_logs, public.noc_evaluation_notifications TO service_role;

ALTER TABLE public.noc_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.noc_evaluation_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.noc_evaluation_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.noc_evaluation_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.noc_evaluation_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view evaluations" ON public.noc_evaluations FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins view evaluation answers" ON public.noc_evaluation_answers FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins view evaluation attachments" ON public.noc_evaluation_attachments FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins view evaluation logs" ON public.noc_evaluation_activity_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users view own evaluation notifications" ON public.noc_evaluation_notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users mark own evaluation notifications" ON public.noc_evaluation_notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Only read_at may change on notifications
CREATE OR REPLACE FUNCTION public.noc_eval_notif_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user = 'authenticated' THEN
    NEW.user_id := OLD.user_id; NEW.evaluation_id := OLD.evaluation_id; NEW.evaluation_code := OLD.evaluation_code;
    NEW.type := OLD.type; NEW.title := OLD.title; NEW.summary := OLD.summary; NEW.link := OLD.link; NEW.created_at := OLD.created_at;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_noc_eval_notif_guard BEFORE UPDATE ON public.noc_evaluation_notifications FOR EACH ROW EXECUTE FUNCTION public.noc_eval_notif_guard();

ALTER PUBLICATION supabase_realtime ADD TABLE public.noc_evaluation_notifications;

-- ===== Helpers =====
CREATE OR REPLACE FUNCTION public.eviden_display_name(_uid uuid) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(NULLIF(display_name,''), split_part(email,'@',1)) FROM public.profiles WHERE user_id = _uid LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.eviden_notify(_uid uuid, _e public.noc_evaluations, _type text, _title text) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.noc_evaluation_notifications (user_id, evaluation_id, evaluation_code, type, title, summary, link)
  VALUES (_uid, _e.id, _e.code, _type, _title, left(_e.problem, 140), '/eviden?id=' || _e.id::text)
$$;

CREATE OR REPLACE FUNCTION public.eviden_notify_admins(_e public.noc_evaluations, _type text, _title text, _skip uuid) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.noc_evaluation_notifications (user_id, evaluation_id, evaluation_code, type, title, summary, link)
  SELECT DISTINCT ur.user_id, _e.id, _e.code, _type, _title, left(_e.problem, 140), '/eviden?id=' || _e.id::text
  FROM public.user_roles ur
  WHERE ur.role = 'admin' AND ur.user_id <> _skip AND ur.user_id <> _e.sender_user_id AND ur.user_id <> _e.recipient_user_id
$$;

CREATE OR REPLACE FUNCTION public.eviden_log(_e public.noc_evaluations, _action text, _from text, _to text, _note text, _kind text) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.noc_evaluation_activity_logs (evaluation_id, action, from_status, to_status, note, actor_user_id, actor_name, actor_kind)
  VALUES (_e.id, _action, _from, _to, _note, auth.uid(), public.eviden_display_name(auth.uid()), _kind)
$$;

CREATE OR REPLACE FUNCTION public.eviden_viewer_kind(_e public.noc_evaluations) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN NULL
    WHEN public.has_role(auth.uid(), 'admin'::app_role) THEN 'admin'
    WHEN _e.sender_user_id = auth.uid() THEN 'sender'
    WHEN _e.recipient_user_id = auth.uid() AND _e.status <> 'DRAFT' THEN 'recipient'
    ELSE NULL END
$$;

-- Recipient directory (approved users, excluding caller)
CREATE OR REPLACE FUNCTION public.eviden_recipients() RETURNS TABLE(user_id uuid, display_name text, email text, team text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.user_id, COALESCE(NULLIF(p.display_name,''), split_part(p.email,'@',1)), p.email,
         upper(public.get_user_role(p.user_id)::text)
  FROM public.profiles p
  WHERE public.is_approved_user(auth.uid()) AND p.is_approved = true AND p.user_id <> auth.uid()
  ORDER BY 2
$$;

-- ===== List =====
CREATE OR REPLACE FUNCTION public.eviden_list() RETURNS TABLE(
  id uuid, code text, status text, viewer_kind text, sender_name text, recipient_user_id uuid, recipient_name text, recipient_team text,
  customer_information text, problem text, created_at timestamptz, sent_at timestamptz, opened_at timestamptz, answered_at timestamptz, closed_at timestamptz, answer_count int
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.id, e.code, e.status, k.kind,
    CASE WHEN k.kind IN ('admin','sender') THEN e.sender_name ELSE 'ANONYMOUS' END,
    e.recipient_user_id, e.recipient_name, e.recipient_team, e.customer_information, e.problem,
    e.created_at, e.sent_at, e.opened_at, e.answered_at, e.closed_at,
    (SELECT count(*)::int FROM public.noc_evaluation_answers a WHERE a.evaluation_id = e.id)
  FROM public.noc_evaluations e
  CROSS JOIN LATERAL (SELECT public.eviden_viewer_kind(e) AS kind) k
  WHERE k.kind IS NOT NULL AND e.status <> 'DRAFT'
  ORDER BY e.created_at DESC
$$;

-- ===== Detail =====
CREATE OR REPLACE FUNCTION public.eviden_get(_id uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE e public.noc_evaluations; k text; can_see boolean;
BEGIN
  SELECT * INTO e FROM public.noc_evaluations WHERE noc_evaluations.id = _id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  k := public.eviden_viewer_kind(e);
  IF k IS NULL THEN RETURN NULL; END IF;
  can_see := k IN ('admin','sender');
  RETURN jsonb_build_object(
    'id', e.id, 'code', e.code, 'status', e.status, 'viewer_kind', k,
    'is_recipient', e.recipient_user_id = auth.uid(), 'is_sender', e.sender_user_id = auth.uid(),
    'sender_name', CASE WHEN can_see THEN e.sender_name ELSE 'ANONYMOUS' END,
    'recipient_name', e.recipient_name, 'recipient_team', e.recipient_team,
    'customer_information', e.customer_information, 'problem', e.problem,
    'created_at', e.created_at, 'sent_at', e.sent_at, 'opened_at', e.opened_at, 'answered_at', e.answered_at, 'closed_at', e.closed_at,
    'answers', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', a.id, 'revision_number', a.revision_number, 'reason', a.reason,
        'submitted_by_name', a.submitted_by_name, 'created_at', a.created_at) ORDER BY a.revision_number) FROM public.noc_evaluation_answers a WHERE a.evaluation_id = e.id), '[]'::jsonb),
    'attachments', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', t.id, 'answer_id', t.answer_id, 'attachment_type', t.attachment_type,
        'file_path', t.file_path, 'file_name', t.file_name, 'mime_type', t.mime_type, 'file_size', t.file_size, 'created_at', t.created_at) ORDER BY t.created_at) FROM public.noc_evaluation_attachments t WHERE t.evaluation_id = e.id), '[]'::jsonb),
    'logs', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', l.id, 'action', l.action, 'from_status', l.from_status, 'to_status', l.to_status, 'note', l.note,
        'actor_kind', l.actor_kind,
        'actor_name', CASE WHEN l.actor_kind = 'sender' AND NOT can_see THEN 'ANONYMOUS' ELSE l.actor_name END,
        'created_at', l.created_at) ORDER BY l.created_at) FROM public.noc_evaluation_activity_logs l WHERE l.evaluation_id = e.id), '[]'::jsonb)
  );
END; $$;

-- ===== Create draft =====
CREATE OR REPLACE FUNCTION public.eviden_create(_recipient uuid, _customer_information text, _problem text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT public.is_approved_user(auth.uid()) THEN RAISE EXCEPTION 'Akses ditolak'; END IF;
  IF _recipient IS NULL OR _recipient = auth.uid() THEN RAISE EXCEPTION 'Penerima tidak valid'; END IF;
  IF NOT public.is_approved_user(_recipient) THEN RAISE EXCEPTION 'Penerima tidak ditemukan'; END IF;
  IF length(trim(COALESCE(_customer_information,''))) = 0 OR length(trim(COALESCE(_problem,''))) = 0 THEN RAISE EXCEPTION 'Customer Information dan Problem wajib diisi'; END IF;
  INSERT INTO public.noc_evaluations (sender_user_id, sender_name, recipient_user_id, recipient_name, recipient_team, customer_information, problem)
  VALUES (auth.uid(), public.eviden_display_name(auth.uid()), _recipient, public.eviden_display_name(_recipient), upper(public.get_user_role(_recipient)::text), trim(_customer_information), trim(_problem))
  RETURNING id INTO new_id;
  RETURN new_id;
END; $$;

-- Register uploaded files (validated against storage)
CREATE OR REPLACE FUNCTION public.eviden_register_files(_e public.noc_evaluations, _files jsonb, _type text, _answer uuid) RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, storage AS $$
DECLARE f jsonb; n int := 0; obj record;
BEGIN
  FOR f IN SELECT * FROM jsonb_array_elements(COALESCE(_files,'[]'::jsonb)) LOOP
    IF (f->>'path') NOT LIKE _e.id::text || '/' || _type || '/%' THEN RAISE EXCEPTION 'Lokasi file tidak valid'; END IF;
    SELECT o.name, o.metadata INTO obj FROM storage.objects o WHERE o.bucket_id = 'eviden-noc' AND o.name = f->>'path' AND o.owner_id = auth.uid()::text;
    IF NOT FOUND THEN RAISE EXCEPTION 'File belum terunggah'; END IF;
    INSERT INTO public.noc_evaluation_attachments (evaluation_id, answer_id, attachment_type, file_path, file_name, mime_type, file_size, uploaded_by)
    VALUES (_e.id, _answer, _type, obj.name, left(f->>'name', 200), COALESCE(obj.metadata->>'mimetype', f->>'type', 'image/jpeg'),
            COALESCE((obj.metadata->>'size')::int, (f->>'size')::int, 0), auth.uid());
    n := n + 1;
  END LOOP;
  RETURN n;
END; $$;

CREATE OR REPLACE FUNCTION public.eviden_send(_id uuid, _files jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e public.noc_evaluations; n int;
BEGIN
  SELECT * INTO e FROM public.noc_evaluations WHERE id = _id FOR UPDATE;
  IF NOT FOUND OR e.sender_user_id <> auth.uid() THEN RAISE EXCEPTION 'Akses ditolak'; END IF;
  IF e.status <> 'DRAFT' THEN RETURN jsonb_build_object('id', e.id, 'code', e.code); END IF;
  n := public.eviden_register_files(e, _files, 'initial', NULL);
  IF n < 1 THEN RAISE EXCEPTION 'Minimal satu eviden wajib diunggah'; END IF;
  UPDATE public.noc_evaluations SET status = 'SENT', sent_at = now(), updated_at = now() WHERE id = _id RETURNING * INTO e;
  PERFORM public.eviden_log(e, 'SENT', NULL, 'SENT', NULL, 'sender');
  PERFORM public.eviden_notify(e.recipient_user_id, e, 'new', 'Evaluasi baru ' || e.code);
  PERFORM public.eviden_notify_admins(e, 'new', 'Evaluasi baru ' || e.code || ' untuk ' || COALESCE(e.recipient_name,'-'), auth.uid());
  RETURN jsonb_build_object('id', e.id, 'code', e.code);
END; $$;

CREATE OR REPLACE FUNCTION public.eviden_discard_draft(_id uuid) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.noc_evaluations WHERE id = _id AND sender_user_id = auth.uid() AND status = 'DRAFT'
$$;

CREATE OR REPLACE FUNCTION public.eviden_open(_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e public.noc_evaluations;
BEGIN
  SELECT * INTO e FROM public.noc_evaluations WHERE id = _id FOR UPDATE;
  IF NOT FOUND OR e.recipient_user_id <> auth.uid() OR e.status <> 'SENT' THEN RETURN; END IF;
  UPDATE public.noc_evaluations SET status = 'OPENED', opened_at = now(), updated_at = now() WHERE id = _id RETURNING * INTO e;
  PERFORM public.eviden_log(e, 'OPENED', 'SENT', 'OPENED', NULL, 'recipient');
  PERFORM public.eviden_notify(e.sender_user_id, e, 'opened', 'Evaluasi ' || e.code || ' telah dibuka');
END; $$;

CREATE OR REPLACE FUNCTION public.eviden_start(_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e public.noc_evaluations; old text;
BEGIN
  SELECT * INTO e FROM public.noc_evaluations WHERE id = _id FOR UPDATE;
  IF NOT FOUND OR e.recipient_user_id <> auth.uid() OR e.status NOT IN ('SENT','OPENED','REVISION REQUESTED') THEN RETURN; END IF;
  old := e.status;
  UPDATE public.noc_evaluations SET status = 'IN PROGRESS', opened_at = COALESCE(opened_at, now()), updated_at = now() WHERE id = _id RETURNING * INTO e;
  PERFORM public.eviden_log(e, 'IN PROGRESS', old, 'IN PROGRESS', NULL, 'recipient');
END; $$;

CREATE OR REPLACE FUNCTION public.eviden_answer(_id uuid, _reason text, _files jsonb) RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e public.noc_evaluations; rev int; ans uuid; n int; old text;
BEGIN
  SELECT * INTO e FROM public.noc_evaluations WHERE id = _id FOR UPDATE;
  IF NOT FOUND OR e.recipient_user_id <> auth.uid() THEN RAISE EXCEPTION 'Akses ditolak'; END IF;
  IF e.status NOT IN ('SENT','OPENED','IN PROGRESS','REVISION REQUESTED') THEN RAISE EXCEPTION 'Evaluasi tidak menunggu jawaban'; END IF;
  IF length(trim(COALESCE(_reason,''))) = 0 THEN RAISE EXCEPTION 'Reason wajib diisi'; END IF;
  old := e.status;
  SELECT COALESCE(max(revision_number), 0) + 1 INTO rev FROM public.noc_evaluation_answers WHERE evaluation_id = _id;
  INSERT INTO public.noc_evaluation_answers (evaluation_id, revision_number, reason, submitted_by, submitted_by_name)
  VALUES (_id, rev, trim(_reason), auth.uid(), public.eviden_display_name(auth.uid())) RETURNING id INTO ans;
  n := public.eviden_register_files(e, _files, 'answer', ans);
  IF n < 1 THEN RAISE EXCEPTION 'Minimal satu eviden jawaban wajib diunggah'; END IF;
  UPDATE public.noc_evaluations SET status = 'ANSWERED', answered_at = now(), opened_at = COALESCE(opened_at, now()), updated_at = now() WHERE id = _id RETURNING * INTO e;
  PERFORM public.eviden_log(e, CASE WHEN rev > 1 THEN 'REVISION ANSWERED' ELSE 'ANSWERED' END, old, 'ANSWERED', 'Jawaban #' || rev, 'recipient');
  PERFORM public.eviden_notify(e.sender_user_id, e, CASE WHEN rev > 1 THEN 'revision_answered' ELSE 'answered' END, CASE WHEN rev > 1 THEN 'Revisi jawaban ' ELSE 'Jawaban diterima ' END || e.code);
  PERFORM public.eviden_notify_admins(e, 'answered', 'Jawaban ' || e.code || ' dari ' || COALESCE(e.recipient_name,'-'), auth.uid());
  RETURN rev;
END; $$;

CREATE OR REPLACE FUNCTION public.eviden_request_revision(_id uuid, _note text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e public.noc_evaluations; k text;
BEGIN
  SELECT * INTO e FROM public.noc_evaluations WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Akses ditolak'; END IF;
  k := public.eviden_viewer_kind(e);
  IF k NOT IN ('admin','sender') OR k IS NULL THEN RAISE EXCEPTION 'Akses ditolak'; END IF;
  IF e.status <> 'ANSWERED' THEN RAISE EXCEPTION 'Revisi hanya untuk evaluasi yang sudah dijawab'; END IF;
  IF length(trim(COALESCE(_note,''))) = 0 THEN RAISE EXCEPTION 'Catatan revisi wajib diisi'; END IF;
  UPDATE public.noc_evaluations SET status = 'REVISION REQUESTED', updated_at = now() WHERE id = _id RETURNING * INTO e;
  PERFORM public.eviden_log(e, 'REVISION REQUESTED', 'ANSWERED', 'REVISION REQUESTED', trim(_note), CASE WHEN e.sender_user_id = auth.uid() THEN 'sender' ELSE 'admin' END);
  PERFORM public.eviden_notify(e.recipient_user_id, e, 'revision', 'Revisi diminta untuk ' || e.code);
  IF e.sender_user_id <> auth.uid() THEN PERFORM public.eviden_notify(e.sender_user_id, e, 'revision', 'Admin meminta revisi ' || e.code); END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.eviden_close(_id uuid, _note text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e public.noc_evaluations; k text; old text;
BEGIN
  SELECT * INTO e FROM public.noc_evaluations WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Akses ditolak'; END IF;
  k := public.eviden_viewer_kind(e);
  IF k IS NULL OR k NOT IN ('admin','sender') THEN RAISE EXCEPTION 'Akses ditolak'; END IF;
  IF e.status IN ('CLOSED','DRAFT') THEN RETURN; END IF;
  old := e.status;
  UPDATE public.noc_evaluations SET status = 'CLOSED', closed_at = now(), updated_at = now() WHERE id = _id RETURNING * INTO e;
  PERFORM public.eviden_log(e, 'CLOSED', old, 'CLOSED', NULLIF(trim(COALESCE(_note,'')),''), CASE WHEN e.sender_user_id = auth.uid() THEN 'sender' ELSE 'admin' END);
  PERFORM public.eviden_notify(e.recipient_user_id, e, 'closed', 'Evaluasi ' || e.code || ' ditutup');
  IF e.sender_user_id <> auth.uid() THEN PERFORM public.eviden_notify(e.sender_user_id, e, 'closed', 'Evaluasi ' || e.code || ' ditutup Admin'); END IF;
END; $$;

-- ===== Storage access =====
CREATE OR REPLACE FUNCTION public.eviden_storage_can_read(_name text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.noc_evaluation_attachments t JOIN public.noc_evaluations e ON e.id = t.evaluation_id
    WHERE t.file_path = _name AND public.eviden_viewer_kind(e) IS NOT NULL
  )
$$;

CREATE OR REPLACE FUNCTION public.eviden_storage_can_upload(_name text) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE eid uuid; kind text; e public.noc_evaluations;
BEGIN
  BEGIN eid := split_part(_name, '/', 1)::uuid; EXCEPTION WHEN others THEN RETURN false; END;
  kind := split_part(_name, '/', 2);
  SELECT * INTO e FROM public.noc_evaluations WHERE id = eid;
  IF NOT FOUND THEN RETURN false; END IF;
  IF kind = 'initial' THEN RETURN e.sender_user_id = auth.uid() AND e.status = 'DRAFT'; END IF;
  IF kind = 'answer' THEN RETURN e.recipient_user_id = auth.uid() AND e.status IN ('SENT','OPENED','IN PROGRESS','REVISION REQUESTED'); END IF;
  RETURN false;
END; $$;

CREATE POLICY "Eviden read by participants" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'eviden-noc' AND (public.eviden_storage_can_read(name) OR (owner_id = auth.uid()::text AND public.eviden_storage_can_upload(name))));
CREATE POLICY "Eviden upload by participants" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'eviden-noc' AND public.eviden_storage_can_upload(name));
CREATE POLICY "Eviden delete unregistered own uploads" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'eviden-noc' AND owner_id = auth.uid()::text AND NOT EXISTS (SELECT 1 FROM public.noc_evaluation_attachments t WHERE t.file_path = name));

REVOKE ALL ON FUNCTION public.eviden_display_name(uuid), public.eviden_notify(uuid, public.noc_evaluations, text, text), public.eviden_notify_admins(public.noc_evaluations, text, text, uuid), public.eviden_log(public.noc_evaluations, text, text, text, text, text), public.eviden_register_files(public.noc_evaluations, jsonb, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.eviden_recipients(), public.eviden_list(), public.eviden_get(uuid), public.eviden_create(uuid, text, text), public.eviden_send(uuid, jsonb), public.eviden_discard_draft(uuid), public.eviden_open(uuid), public.eviden_start(uuid), public.eviden_answer(uuid, text, jsonb), public.eviden_request_revision(uuid, text), public.eviden_close(uuid, text), public.eviden_viewer_kind(public.noc_evaluations), public.eviden_storage_can_read(text), public.eviden_storage_can_upload(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.eviden_recipients(), public.eviden_list(), public.eviden_get(uuid), public.eviden_create(uuid, text, text), public.eviden_send(uuid, jsonb), public.eviden_discard_draft(uuid), public.eviden_open(uuid), public.eviden_start(uuid), public.eviden_answer(uuid, text, jsonb), public.eviden_request_revision(uuid, text), public.eviden_close(uuid, text), public.eviden_viewer_kind(public.noc_evaluations), public.eviden_storage_can_read(text), public.eviden_storage_can_upload(text) TO authenticated;