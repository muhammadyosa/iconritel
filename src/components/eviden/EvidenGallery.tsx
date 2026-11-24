import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { signedEvidenUrls } from "@/hooks/useEviden";
import type { EvidenAttachment } from "@/lib/eviden";
import { ZoomDialog } from "./ImageUploader";

/** Galeri eviden read-only memakai signed URL berumur pendek. */
export function EvidenGallery({ items }: { items: EvidenAttachment[] }) {
  const [urls, setUrls] = useState<Record<string, string> | null>(null);
  const [zoom, setZoom] = useState<string | null>(null);
  const key = items.map((i) => i.file_path).join("|");
  useEffect(() => {
    let alive = true;
    setUrls(null);
    signedEvidenUrls(items.map((i) => i.file_path)).then((m) => alive && setUrls(m)).catch(() => alive && setUrls({}));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  if (!items.length) return <p className="text-xs text-muted-foreground py-6 text-center border border-dashed rounded-md">Belum ada eviden</p>;
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {items.map((it) => (
          <button key={it.id} type="button" onClick={() => urls?.[it.file_path] && setZoom(urls[it.file_path])} className="aspect-video rounded-md overflow-hidden border border-border bg-muted">
            {!urls ? <Skeleton className="h-full w-full" /> : urls[it.file_path]
              ? <img src={urls[it.file_path]} alt={it.file_name ?? "Eviden"} className="h-full w-full object-cover" loading="lazy" />
              : <ImageOff className="h-5 w-5 m-auto text-muted-foreground" />}
          </button>
        ))}
      </div>
      <ZoomDialog src={zoom} onClose={() => setZoom(null)} />
    </>
  );
}
