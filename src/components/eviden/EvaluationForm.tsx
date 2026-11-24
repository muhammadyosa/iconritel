import { useRef, useState } from "react";
import { Loader2, Send, UserRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ImageUploader } from "./ImageUploader";
import { RecipientPicker, type Recipient } from "./RecipientPicker";
import { removeEvidenFiles, uploadEvidenFiles, useInvalidateEviden } from "@/hooks/useEviden";

/** Form Evaluation Team (pengirim). Identitas pengirim disembunyikan dari penerima oleh server. */
export function EvaluationForm({ onSent }: { onSent?: (id: string) => void }) {
  const [customer, setCustomer] = useState("");
  const [problem, setProblem] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const lock = useRef(false);
  const invalidate = useInvalidateEviden();

  const send = async () => {
    if (lock.current) return;
    if (!customer.trim() || !problem.trim()) return toast.error("Customer Information dan Problem wajib diisi");
    if (files.length === 0) return toast.error("Minimal satu eviden wajib diunggah");
    if (!recipient) return toast.error("Pilih satu penerima melalui To User");
    lock.current = true; setSending(true);
    let draftId: string | null = null; let uploaded: string[] = [];
    try {
      const { data: id, error } = await supabase.rpc("eviden_create", { _recipient: recipient.user_id, _customer_information: customer, _problem: problem });
      if (error) throw error;
      draftId = id as string;
      const up = await uploadEvidenFiles(draftId, "initial", files);
      uploaded = up.map((u) => u.path);
      const { data: res, error: sendErr } = await supabase.rpc("eviden_send", { _id: draftId, _files: up as never });
      if (sendErr) throw sendErr;
      toast.success(`Evaluasi ${(res as { code?: string })?.code ?? ""} terkirim ke ${recipient.display_name}`);
      setCustomer(""); setProblem(""); setFiles([]); setRecipient(null);
      invalidate();
      onSent?.(draftId);
    } catch (e) {
      if (draftId) { await removeEvidenFiles(uploaded); await supabase.rpc("eviden_discard_draft", { _id: draftId }); }
      toast.error(e instanceof Error ? e.message : "Gagal mengirim evaluasi");
    } finally { lock.current = false; setSending(false); }
  };

  return (
    <Card className="p-3 sm:p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="text-sm font-semibold">Form Evaluation Team</h2>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Pengirim tampil sebagai ANONYMOUS</span>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="ev-customer" className="text-xs">Customer Information *</Label>
            <Textarea id="ev-customer" value={customer} onChange={(e) => setCustomer(e.target.value)} disabled={sending} rows={5} placeholder="Info pelanggan, ID tiket, lokasi, dan informasi terkait" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ev-problem" className="text-xs">Problem *</Label>
            <Textarea id="ev-problem" value={problem} onChange={(e) => setProblem(e.target.value)} disabled={sending} rows={6} placeholder="Deskripsi kesalahan atau kendala user NOC" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Evident Detail Check *</Label>
          <ImageUploader files={files} onChange={setFiles} disabled={sending} />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
        <Button type="button" variant="outline" size="sm" onClick={() => setPickerOpen(true)} disabled={sending}>
          <UserRound className="h-3.5 w-3.5 mr-1.5" />{recipient ? `To: ${recipient.display_name}` : "To User"}
        </Button>
        <Button type="button" size="sm" onClick={send} disabled={sending}>
          {sending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}Send
        </Button>
      </div>
      <RecipientPicker open={pickerOpen} onOpenChange={setPickerOpen} value={recipient} onSelect={setRecipient} />
    </Card>
  );
}
