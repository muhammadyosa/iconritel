import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { deleteEvaluations, type Manifest } from "./flow.ts";

const inputSchema = z.union([
  z.object({ ids: z.array(z.string().uuid()).min(1) }).strict(),
  z.object({ batch_id: z.string().uuid() }).strict(),
]);
const respond = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return respond({ error: "Metode tidak didukung" }, 405);
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return respond({ error: "Silakan masuk kembali" }, 401);
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return respond({ error: "Layanan penghapusan belum tersedia" }, 503);
  const caller = createClient(url, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
  const { data: identity, error: authError } = await caller.auth.getUser(authorization.slice(7));
  if (authError || !identity.user) return respond({ error: "Sesi tidak valid" }, 401);
  const actor = identity.user.id;
  const { data: admin, error: roleError } = await caller.rpc("has_role", { _user_id: actor, _role: "admin" });
  if (roleError || admin !== true) return respond({ error: "Hanya Admin yang dapat menghapus evaluasi" }, 403);
  let body: unknown;
  try { body = await req.json(); } catch { return respond({ error: "Pilihan penghapusan tidak valid" }, 400); }
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) return respond({ error: "Pilih ID evaluasi atau penghapusan tertunda yang valid" }, 400);
  const service = createClient(url, serviceKey, { auth: { persistSession: false } });
  try {
    const result = await deleteEvaluations({
      prepare: async (ids) => {
        const { data, error } = await service.rpc("eviden_delete_prepare", { _actor: actor, _ids: [...new Set(ids)] });
        if (error) throw new Error(error.message);
        return data as string;
      },
      manifest: async (batch) => {
        const { data, error } = await service.rpc("eviden_delete_manifest", { _actor: actor, _batch: batch });
        if (error) throw new Error(error.message);
        return data as Manifest;
      },
      remove: async (paths) => {
        const { error } = await service.storage.from("eviden-noc").remove(paths);
        if (error) throw new Error("Foto gagal dibersihkan. Lanjutkan penghapusan tertunda untuk mencoba kembali.");
      },
      finalize: async (batch) => {
        const { data, error } = await service.rpc("eviden_delete_finalize", { _actor: actor, _batch: batch });
        if (error) throw new Error(error.message);
        return Number(data);
      },
    }, parsed.data);
    return respond(result);
  } catch (error) {
    return respond({ error: error instanceof Error ? error.message : "Penghapusan belum selesai. Refresh lalu lanjutkan penghapusan tertunda." }, 409);
  }
});