import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { EVIDEN_BUCKET, type EvidenDetail, type EvidenListRow } from "@/lib/eviden";

export interface UploadedFile { path: string; name: string; type: string; size: number }

const rnd = () => (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2));

export async function uploadEvidenFiles(evaluationId: string, kind: "initial" | "answer", files: File[]): Promise<UploadedFile[]> {
  const out: UploadedFile[] = [];
  for (const f of files) {
    const ext = f.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${evaluationId}/${kind}/${rnd()}.${ext}`;
    const { error } = await supabase.storage.from(EVIDEN_BUCKET).upload(path, f, { contentType: f.type, upsert: false });
    if (error) throw new Error(`Gagal mengunggah ${f.name}: ${error.message}`);
    out.push({ path, name: f.name, type: f.type, size: f.size });
  }
  return out;
}

export async function removeEvidenFiles(paths: string[]) {
  if (paths.length) await supabase.storage.from(EVIDEN_BUCKET).remove(paths);
}

export async function signedEvidenUrls(paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const { data, error } = await supabase.storage.from(EVIDEN_BUCKET).createSignedUrls(paths, 60 * 30);
  if (error) throw error;
  const map: Record<string, string> = {};
  data?.forEach((d) => { if (d.path && d.signedUrl) map[d.path] = d.signedUrl; });
  return map;
}

export function useEvidenList() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["eviden-list", user?.id ?? null],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("eviden_list");
      if (error) throw error;
      return (data ?? []) as unknown as EvidenListRow[];
    },
  });
}

export function useEvidenDetail(id: string | null) {
  return useQuery({
    queryKey: ["eviden-detail", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("eviden_get", { _id: id! });
      if (error) throw error;
      return (data ?? null) as unknown as EvidenDetail | null;
    },
  });
}

export interface EvidenNotification { id: string; evaluation_id: string; evaluation_code: string; type: string; title: string; summary: string | null; link: string; read_at: string | null; created_at: string }

export function useEvidenNotifications() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["eviden-notifications", user?.id ?? null],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("noc_evaluation_notifications")
        .select("id, evaluation_id, evaluation_code, type, title, summary, link, read_at, created_at")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as EvidenNotification[];
    },
  });
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`eviden-notif-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "noc_evaluation_notifications", filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["eviden-notifications"] });
        qc.invalidateQueries({ queryKey: ["eviden-list"] });
        qc.invalidateQueries({ queryKey: ["eviden-detail"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);
  return q;
}

export function useInvalidateEviden() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["eviden-list"] });
    qc.invalidateQueries({ queryKey: ["eviden-detail"] });
    qc.invalidateQueries({ queryKey: ["eviden-notifications"] });
  };
}
