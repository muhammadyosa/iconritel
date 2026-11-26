import { useEffect, useRef, useState } from "react";
import { Loader2, Send, RotateCcw, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { removeEvidenFiles, uploadEvidenFiles, useEvidenDetail, useInvalidateEviden } from "@/hooks/useEviden";
import { PENDING_STATUSES, type EvidenStatus } from "@/lib/eviden";
import { EvidenGallery } from "./EvidenGallery";
import { ImageUploader } from "./ImageUploader";
import { StatusBadge } from "./StatusBadge";

const fmt = (s?: string | null) => (s ? new Date(s).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "-");

function ReadBox({ label, text }: { label: string; text: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm whitespace-pre-wrap break-words max-h-48 overflow-y-auto">{text}</div>
    </div>
  );
}

export function EvaluationDetail({ id, onClose, readOnly = false }: { id: string | null; onClose: () => void; readOnly?: boolean }) {
  const { data: d, isLoading, refetch } = useEvidenDetail(id);
  const invalidate = useInvalidateEviden();
  const [reason, setReason] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<null | "revision" | "close">(null);
  const [note, setNote] = useState("");
  const started = useRef(false);
  const lock = useRef(false);

  useEffect(() => { setReason(""); setFiles([]); started.current = false; }, [id]);
  useEffect(() => {
    if (!readOnly && d?.is_recipient && d.status === "SENT") supabase.rpc("eviden_open", { _id: d.id }).then(() => { refetch(); invalidate(); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d?.id, d?.status, d?.is_recipient, readOnly]);

  const canAnswer = !readOnly && !!d?.is_recipient && PENDING_STATUSES.includes(d.status as EvidenStatus);
  const canManage = !readOnly && !!d && (d.viewer_kind === "admin" || d.is_sender);

  const markStarted = () => {
    if (!d || started.current || !canAnswer || d.status === "IN PROGRESS") return;
    started.current = true;
    supabase.rpc("eviden_start", { _id: d.id }).then(() => invalidate());
  };

  const submitAnswer = async () => {
    if (!d || lock.current) return;
    if (!reason.trim()) return toast.error("Reason wajib diisi");
    if (!files.length) return toast.error("Minimal satu eviden jawaban wajib diunggah");
    lock.current = true; setBusy(true);
    let paths: string[] = [];
    try {
      const up = await uploadEvidenFiles(d.id, "answer", files);
      paths = up.map((u) => u.path);
      const { error } = await supabase.rpc("eviden_answer", { _id: d.id, _reason: reason, _files: up as never });
      if (error) throw error;
      toast.success("Jawaban terkirim");
      setReason(""); setFiles([]); invalidate();
    } catch (e) {
      await removeEvidenFiles(paths);
      toast.error(e instanceof Error ? e.message : "Gagal mengirim jawaban");
    } finally { lock.current = false; setBusy(false); }
  };

  const runAction = async () => {
    if (!d || !confirm) return;
    if (confirm === "revision" && !note.trim()) return toast.error("Catatan revisi wajib diisi");
    setBusy(true);
    const { error } = confirm === "revision"
      ? await supabase.rpc("eviden_request_revision", { _id: d.id, _note: note })
      : await supabase.rpc("eviden_close", { _id: d.id, _note: note });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(confirm === "revision" ? "Revisi diminta" : "Evaluasi ditutup");
    setConfirm(null); setNote(""); invalidate();
  };

  const initial = d?.attachments.filter((a) => a.attachment_type === "initial") ?? [];

  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto p-4 sm:p-5">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 text-base">
            {d ? <>Form Evaluation Team Answer · {d.code} <StatusBadge status={d.status as EvidenStatus} /></> : "Memuat evaluasi"}
          </DialogTitle>
          {d && <DialogDescription className="text-xs">Dari: <b>{d.sender_name}</b> · Untuk: <b>{d.recipient_name}</b> ({d.recipient_team ?? "-"}) · {fmt(d.sent_at)}</DialogDescription>}
        </DialogHeader>
        {isLoading && <div className="space-y-2"><Skeleton className="h-32" /><Skeleton className="h-32" /></div>}
        {!isLoading && !d && <p className="text-sm text-muted-foreground py-8 text-center">Evaluasi tidak ditemukan atau Anda tidak memiliki akses.</p>}
        {d && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <ReadBox label="Customer Information" text={d.customer_information} />
                <ReadBox label="Problem" text={d.problem} />
                {canAnswer && (
                  <div className="space-y-1.5">
                    <Label htmlFor="ev-reason" className="text-xs">Reason *{d.answers.length > 0 && ` (revisi #${d.answers.length + 1})`}</Label>
                    <Textarea id="ev-reason" rows={6} value={reason} disabled={busy} onFocus={markStarted} onChange={(e) => setReason(e.target.value)} placeholder="Penyebab, kronologi, klarifikasi, dan tindakan perbaikan" />
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5"><Label className="text-xs">Evident Detail Check</Label><EvidenGallery items={initial} /></div>
                {canAnswer && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Evident Answer Detail Check *</Label>
                    <ImageUploader files={files} onChange={(f) => { markStarted(); setFiles(f); }} disabled={busy} />
                  </div>
                )}
              </div>
            </div>
            {canAnswer && (
              <div className="flex justify-end border-t border-border pt-3">
                <Button size="sm" onClick={submitAnswer} disabled={busy}>{busy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}Send</Button>
              </div>
            )}

            {d.answers.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Jawaban</h3>
                {[...d.answers].reverse().map((a) => (
                  <div key={a.id} className="rounded-md border border-border p-3 grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="text-[11px] text-muted-foreground mb-1">Jawaban #{a.revision_number} · {a.submitted_by_name} · {fmt(a.created_at)}</p>
                      <p className="text-sm whitespace-pre-wrap break-words">{a.reason}</p>
                    </div>
                    <EvidenGallery items={d.attachments.filter((t) => t.answer_id === a.id)} />
                  </div>
                ))}
              </section>
            )}

            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Timeline</h3>
              <ol className="border-l border-border ml-1.5 space-y-2">
                {d.logs.map((l) => (
                  <li key={l.id} className="pl-3 relative text-xs">
                    <span className="absolute -left-[4.5px] top-1 h-2 w-2 rounded-full bg-primary" />
                    <span className="font-medium">{l.action}</span> · {l.actor_name ?? "-"} <span className="text-muted-foreground">({l.actor_kind})</span> · <span className="text-muted-foreground">{fmt(l.created_at)}</span>
                    {l.note && <p className="text-muted-foreground mt-0.5 whitespace-pre-wrap">{l.note}</p>}
                  </li>
                ))}
              </ol>
            </section>

            {canManage && d.status !== "CLOSED" && (
              <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-3">
                {d.status === "ANSWERED" && <Button size="sm" variant="outline" onClick={() => setConfirm("revision")}><RotateCcw className="h-3.5 w-3.5 mr-1.5" />Request Revision</Button>}
                <Button size="sm" variant="secondary" onClick={() => setConfirm("close")}><Lock className="h-3.5 w-3.5 mr-1.5" />Close Evaluation</Button>
              </div>
            )}
          </div>
        )}
        <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirm === "revision" ? "Minta revisi jawaban?" : "Tutup evaluasi?"}</AlertDialogTitle>
              <AlertDialogDescription>{confirm === "revision" ? "Penerima akan diminta mengirim jawaban baru. Jawaban lama tetap tersimpan." : "Evaluasi yang ditutup tidak dapat dijawab lagi."}</AlertDialogDescription>
            </AlertDialogHeader>
            <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={confirm === "revision" ? "Catatan revisi (wajib)" : "Catatan (opsional)"} />
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>Batal</AlertDialogCancel>
              <AlertDialogAction disabled={busy} onClick={(e) => { e.preventDefault(); runAction(); }}>Konfirmasi</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
