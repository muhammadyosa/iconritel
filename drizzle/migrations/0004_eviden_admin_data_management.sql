ALTER TABLE public.noc_evaluations ADD COLUMN deletion_batch_id uuid;
CREATE INDEX idx_eviden_deletion_batch ON public.noc_evaluations(deletion_batch_id) WHERE deletion_batch_id IS NOT NULL;
GRANT ALL ON public.user_activity_logs TO service_role;

CREATE OR REPLACE FUNCTION public.eviden_admin_list(_search text DEFAULT '', _status text DEFAULT '', _team text DEFAULT '', _from date DEFAULT NULL, _to date DEFAULT NULL, _sort text DEFAULT 'created_at', _direction text DEFAULT 'desc', _page int DEFAULT 1, _size int DEFAULT 25, _ids_only boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'Hanya Admin yang memiliki akses' USING ERRCODE = '42501'; END IF;
 IF _from > _to THEN RAISE EXCEPTION 'Rentang tanggal tidak valid'; END IF;
 WITH filtered AS (
  SELECT e.* FROM public.noc_evaluations e WHERE
  (_status = '' OR e.status = _status) AND (_team = '' OR e.recipient_team = _team)
  AND (_from IS NULL OR e.created_at >= (_from::timestamp AT TIME ZONE 'Asia/Jakarta'))
  AND (_to IS NULL OR e.created_at < ((_to + 1)::timestamp AT TIME ZONE 'Asia/Jakarta'))
  AND (_search = '' OR position(lower(_search) in lower(concat_ws(' ',e.id::text,e.code,e.sender_name,e.recipient_name,e.customer_information,e.problem))) > 0)
 ), ordered AS (
  SELECT f.*, row_number() OVER (ORDER BY
   CASE WHEN _direction = 'asc' THEN CASE _sort WHEN 'code' THEN code WHEN 'sender_name' THEN sender_name WHEN 'recipient_name' THEN recipient_name WHEN 'recipient_team' THEN recipient_team WHEN 'problem' THEN problem WHEN 'status' THEN status WHEN 'answered_at' THEN answered_at::text ELSE created_at::text END END ASC NULLS LAST,
   CASE WHEN _direction <> 'asc' THEN CASE _sort WHEN 'code' THEN code WHEN 'sender_name' THEN sender_name WHEN 'recipient_name' THEN recipient_name WHEN 'recipient_team' THEN recipient_team WHEN 'problem' THEN problem WHEN 'status' THEN status WHEN 'answered_at' THEN answered_at::text ELSE created_at::text END END DESC NULLS LAST, id) AS rn FROM filtered f
 ) SELECT jsonb_build_object('total',(SELECT count(*) FROM filtered),
 'rows',CASE WHEN _ids_only THEN '[]'::jsonb ELSE COALESCE((SELECT jsonb_agg(to_jsonb(o) - 'rn' ORDER BY rn) FROM ordered o WHERE rn > (GREATEST(_page,1)-1)*LEAST(GREATEST(_size,1),100) AND rn <= GREATEST(_page,1)*LEAST(GREATEST(_size,1),100)), '[]'::jsonb) END,
 'ids',CASE WHEN _ids_only THEN COALESCE((SELECT jsonb_agg(id ORDER BY id) FROM filtered),'[]'::jsonb) ELSE '[]'::jsonb END,
 'teams',COALESCE((SELECT jsonb_agg(t.recipient_team ORDER BY t.recipient_team) FROM (SELECT DISTINCT recipient_team FROM public.noc_evaluations WHERE recipient_team IS NOT NULL) t),'[]'::jsonb),
 'audit',COALESCE((SELECT jsonb_agg(to_jsonb(a) ORDER BY created_at DESC) FROM (SELECT id,user_id,action,detail,created_at FROM public.user_activity_logs WHERE action IN ('EVIDEN DELETE PENDING','EVIDEN DELETE COMPLETED') ORDER BY created_at DESC LIMIT 20) a),'[]'::jsonb),
 'pending',COALESCE((SELECT jsonb_agg(jsonb_build_object('batch_id',l.id,'count',(l.detail::jsonb)->'count','created_at',l.created_at)) FROM public.user_activity_logs l WHERE l.action='EVIDEN DELETE PENDING' AND EXISTS(SELECT 1 FROM public.noc_evaluations e WHERE e.deletion_batch_id=l.id)), '[]'::jsonb)) INTO result;
 RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.eviden_admin_list(text,text,text,date,date,text,text,int,int,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.eviden_admin_list(text,text,text,date,date,text,text,int,int,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.eviden_deletion_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF OLD.deletion_batch_id IS NOT NULL AND COALESCE(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'Evaluasi sedang dihapus Admin'; END IF;
 IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER eviden_deletion_guard BEFORE UPDATE OR DELETE ON public.noc_evaluations FOR EACH ROW EXECUTE FUNCTION public.eviden_deletion_guard();

CREATE OR REPLACE FUNCTION public.eviden_storage_can_upload(_name text) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE eid uuid; kind text; e public.noc_evaluations;
BEGIN
 BEGIN eid := split_part(_name,'/',1)::uuid; EXCEPTION WHEN others THEN RETURN false; END;
 kind := split_part(_name,'/',2);
 SELECT * INTO e FROM public.noc_evaluations WHERE id=eid;
 IF NOT FOUND OR e.deletion_batch_id IS NOT NULL THEN RETURN false; END IF;
 IF kind='initial' THEN RETURN e.sender_user_id=auth.uid() AND e.status='DRAFT'; END IF;
 IF kind='answer' THEN RETURN e.recipient_user_id=auth.uid() AND e.status IN ('SENT','OPENED','IN PROGRESS','REVISION REQUESTED'); END IF;
 RETURN false;
END; $$;

CREATE OR REPLACE FUNCTION public.eviden_delete_prepare(_actor uuid, _ids uuid[]) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE batch uuid; ids uuid[]; existing uuid; n int;
BEGIN
 IF COALESCE(auth.role(),'') <> 'service_role' OR NOT public.has_role(_actor,'admin'::public.app_role) THEN RAISE EXCEPTION 'Hanya Admin yang dapat menghapus' USING ERRCODE='42501'; END IF;
 SELECT array_agg(DISTINCT x ORDER BY x) INTO ids FROM unnest(_ids) x WHERE x IS NOT NULL;
 IF COALESCE(cardinality(ids),0)=0 THEN RAISE EXCEPTION 'Pilih evaluasi'; END IF;
 PERFORM id FROM public.noc_evaluations WHERE id=ANY(ids) ORDER BY id FOR UPDATE;
 SELECT count(*) INTO n FROM public.noc_evaluations WHERE id=ANY(ids);
 IF n <> cardinality(ids) THEN RAISE EXCEPTION 'Pilihan berubah. Refresh lalu pilih kembali.'; END IF;
 SELECT deletion_batch_id INTO existing FROM public.noc_evaluations WHERE id=ANY(ids) AND deletion_batch_id IS NOT NULL LIMIT 1;
 IF existing IS NOT NULL THEN
  IF EXISTS(SELECT 1 FROM public.noc_evaluations WHERE id=ANY(ids) AND deletion_batch_id IS DISTINCT FROM existing) OR EXISTS(SELECT 1 FROM public.noc_evaluations WHERE deletion_batch_id=existing AND NOT(id=ANY(ids))) THEN RAISE EXCEPTION 'Lanjutkan penghapusan tertunda terlebih dahulu'; END IF;
  RETURN existing;
 END IF;
 batch := gen_random_uuid();
 INSERT INTO public.user_activity_logs(id,user_id,action,detail) VALUES(batch,_actor,'EVIDEN DELETE PENDING',jsonb_build_object('admin_id',_actor,'admin_name',public.eviden_display_name(_actor),'count',n,'ids',ids,'started_at',now())::text);
 UPDATE public.noc_evaluations SET deletion_batch_id=batch WHERE id=ANY(ids);
 RETURN batch;
END; $$;

CREATE OR REPLACE FUNCTION public.eviden_delete_manifest(_actor uuid, _batch uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l public.user_activity_logs; paths jsonb;
BEGIN
 IF COALESCE(auth.role(),'') <> 'service_role' OR NOT public.has_role(_actor,'admin'::public.app_role) THEN RAISE EXCEPTION 'Akses ditolak' USING ERRCODE='42501'; END IF;
 SELECT * INTO l FROM public.user_activity_logs WHERE id=_batch AND action IN ('EVIDEN DELETE PENDING','EVIDEN DELETE COMPLETED');
 IF NOT FOUND THEN RAISE EXCEPTION 'Penghapusan tidak ditemukan'; END IF;
 SELECT COALESCE(jsonb_agg(name ORDER BY name),'[]'::jsonb) INTO paths FROM storage.objects o WHERE bucket_id='eviden-noc' AND EXISTS(SELECT 1 FROM public.noc_evaluations e WHERE e.deletion_batch_id=_batch AND split_part(o.name,'/',1)=e.id::text);
 RETURN jsonb_build_object('batch_id',_batch,'completed',l.action='EVIDEN DELETE COMPLETED','count',(l.detail::jsonb)->'count','paths',paths);
END; $$;

CREATE OR REPLACE FUNCTION public.eviden_delete_finalize(_actor uuid,_batch uuid) RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l public.user_activity_logs; ids uuid[]; n int;
BEGIN
 IF COALESCE(auth.role(),'') <> 'service_role' OR NOT public.has_role(_actor,'admin'::public.app_role) THEN RAISE EXCEPTION 'Akses ditolak' USING ERRCODE='42501'; END IF;
 SELECT * INTO l FROM public.user_activity_logs WHERE id=_batch AND action IN ('EVIDEN DELETE PENDING','EVIDEN DELETE COMPLETED') FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Penghapusan tidak ditemukan'; END IF;
 IF l.action='EVIDEN DELETE COMPLETED' THEN RETURN ((l.detail::jsonb)->>'count')::int; END IF;
 SELECT array_agg(value::uuid ORDER BY value::uuid) INTO ids FROM jsonb_array_elements_text((l.detail::jsonb)->'ids');
 PERFORM id FROM public.noc_evaluations WHERE deletion_batch_id=_batch ORDER BY id FOR UPDATE;
 IF (SELECT count(*) FROM public.noc_evaluations WHERE deletion_batch_id=_batch AND id=ANY(ids)) <> cardinality(ids) THEN RAISE EXCEPTION 'Pilihan penghapusan tidak sesuai'; END IF;
 IF EXISTS(SELECT 1 FROM storage.objects o WHERE bucket_id='eviden-noc' AND split_part(o.name,'/',1)=ANY(SELECT x::text FROM unnest(ids) x)) THEN RAISE EXCEPTION 'Foto belum seluruhnya dibersihkan; lanjutkan penghapusan'; END IF;
 DELETE FROM public.noc_evaluations WHERE deletion_batch_id=_batch AND id=ANY(ids);
 GET DIAGNOSTICS n=ROW_COUNT;
 UPDATE public.user_activity_logs SET action='EVIDEN DELETE COMPLETED', detail=((l.detail::jsonb)||jsonb_build_object('completed_at',now(),'completed_by',_actor,'completed_by_name',public.eviden_display_name(_actor),'count',n))::text WHERE id=_batch;
 RETURN n;
END; $$;
REVOKE ALL ON FUNCTION public.eviden_delete_prepare(uuid,uuid[]), public.eviden_delete_manifest(uuid,uuid), public.eviden_delete_finalize(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.eviden_delete_prepare(uuid,uuid[]), public.eviden_delete_manifest(uuid,uuid), public.eviden_delete_finalize(uuid,uuid) TO service_role;