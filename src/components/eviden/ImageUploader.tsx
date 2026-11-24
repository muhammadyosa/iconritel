import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, RefreshCw, Trash2, ZoomIn } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { EVIDEN_ACCEPT, validateEvidenFile } from "@/lib/eviden";

export function ZoomDialog({ src, onClose }: { src: string | null; onClose: () => void }) {
  return (
    <Dialog open={!!src} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl p-2">
        <DialogTitle className="sr-only">Pratinjau eviden</DialogTitle>
        {src && <img src={src} alt="Pratinjau eviden" className="w-full max-h-[80vh] object-contain rounded" />}
      </DialogContent>
    </Dialog>
  );
}

/** Pilih beberapa gambar lokal dengan pratinjau, zoom, hapus, dan ganti. */
export function ImageUploader({ files, onChange, disabled, label = "Upload" }: { files: File[]; onChange: (f: File[]) => void; disabled?: boolean; label?: string }) {
  const addRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const [replaceIdx, setReplaceIdx] = useState<number | null>(null);
  const [zoom, setZoom] = useState<string | null>(null);
  const urls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);

  const accept = (list: FileList | null) => {
    const ok: File[] = [];
    Array.from(list ?? []).forEach((f) => { const err = validateEvidenFile(f); if (err) toast.error(err); else ok.push(f); });
    return ok;
  };

  return (
    <div className="space-y-2">
      <input ref={addRef} type="file" accept={EVIDEN_ACCEPT} multiple hidden onChange={(e) => { const ok = accept(e.target.files); if (ok.length) onChange([...files, ...ok]); e.target.value = ""; }} />
      <input ref={replaceRef} type="file" accept={EVIDEN_ACCEPT} hidden onChange={(e) => { const ok = accept(e.target.files); if (ok[0] && replaceIdx != null) onChange(files.map((f, i) => (i === replaceIdx ? ok[0] : f))); setReplaceIdx(null); e.target.value = ""; }} />
      {files.length === 0 ? (
        <button type="button" disabled={disabled} onClick={() => addRef.current?.click()} className="w-full min-h-[160px] rounded-md border border-dashed border-border bg-muted/30 flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground hover:bg-muted/50 transition-colors">
          <ImagePlus className="h-6 w-6" />
          Klik untuk memilih foto/screenshot
          <span className="text-[10px]">JPG, JPEG, PNG, WEBP · maks 5 MB per gambar</span>
        </button>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {files.map((f, i) => (
            <div key={urls[i]} className="group relative aspect-video rounded-md overflow-hidden border border-border bg-muted">
              <img src={urls[i]} alt={f.name} className="h-full w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 p-1 bg-background/80 backdrop-blur-sm">
                <Button type="button" size="icon" variant="ghost" className="h-6 w-6" aria-label="Perbesar" onClick={() => setZoom(urls[i])}><ZoomIn className="h-3.5 w-3.5" /></Button>
                <Button type="button" size="icon" variant="ghost" className="h-6 w-6" aria-label="Ganti" disabled={disabled} onClick={() => { setReplaceIdx(i); replaceRef.current?.click(); }}><RefreshCw className="h-3.5 w-3.5" /></Button>
                <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-destructive" aria-label="Hapus" disabled={disabled} onClick={() => onChange(files.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => addRef.current?.click()}>
        <ImagePlus className="h-3.5 w-3.5 mr-1.5" />{label}
      </Button>
      <ZoomDialog src={zoom} onClose={() => setZoom(null)} />
    </div>
  );
}
