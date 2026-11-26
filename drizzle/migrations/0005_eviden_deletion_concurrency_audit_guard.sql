CREATE OR REPLACE FUNCTION public.eviden_storage_can_upload(_name text) RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE eid uuid; kind text; e public.noc_evaluations;
BEGIN
 BEGIN eid := split_part(_name,'/',1)::uuid; EXCEPTION WHEN others THEN RETURN false; END;
 kind := split_part(_name,'/',2);
 -- Share lock serializes in-flight object insertion with deletion preparation.
 SELECT * INTO e FROM public.noc_evaluations WHERE id=eid FOR SHARE;
 IF NOT FOUND OR e.deletion_batch_id IS NOT NULL THEN RETURN false; END IF;
 IF kind='initial' THEN RETURN e.sender_user_id=auth.uid() AND e.status='DRAFT'; END IF;
 IF kind='answer' THEN RETURN e.recipient_user_id=auth.uid() AND e.status IN ('SENT','OPENED','IN PROGRESS','REVISION REQUESTED'); END IF;
 RETURN false;
END; $$;
CREATE OR REPLACE FUNCTION public.eviden_deletion_audit_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.action IN ('EVIDEN DELETE PENDING','EVIDEN DELETE COMPLETED') AND COALESCE(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'Catatan penghapusan hanya dapat ditulis layanan Admin' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER eviden_deletion_audit_guard BEFORE INSERT OR UPDATE ON public.user_activity_logs FOR EACH ROW EXECUTE FUNCTION public.eviden_deletion_audit_guard();