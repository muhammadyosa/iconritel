import { useState } from "react";
import { ChevronDown, Copy, Pencil, RotateCcw, Wand2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { formatSurveillance, parseSurveillance } from "@/lib/surveillance";

const EXAMPLE_INPUT = `ANTRIAN 1
21 JAM 10 MENIT
26112100416
FTTH AKSES TANSYA SAPTA ALMEGA LINK LOSS - SERPO MUKO MUKO FAT_123 SBS-MUKO-RC-OLT-04

ANTRIAN 2
26112100542
FTTH AKSES YAHYA ISMAWAN PEGAWAI PLN BAD RX - SERPO SUNGAI PENUH`;

const EXAMPLE_OUTPUT = formatSurveillance(parseSurveillance(EXAMPLE_INPUT).incidents);

export function SurveillanceTab() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [editing, setEditing] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [count, setCount] = useState(0);

  const generate = () => {
    const result = parseSurveillance(input);
    setWarnings(result.warnings);
    setCount(result.incidents.length);
    setOutput(formatSurveillance(result.incidents));
    setEditing(false);
    if (!result.incidents.length) {
      toast({ title: "Data tidak dikenali", description: "Nomor antrian, ID incident, dan deskripsi FTTH AKSES belum lengkap.", variant: "destructive" });
      return;
    }
    toast({ title: "Laporan dibuat", description: `${result.incidents.length} incident berhasil diproses.` });
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      toast({ title: "Tersalin", description: "Laporan SURVEILLANCE disalin." });
    } catch {
      toast({ title: "Gagal menyalin", description: "Izinkan akses clipboard atau salin teks hasil secara manual.", variant: "destructive" });
    }
  };

  return (
    <section aria-label="SURVEILLANCE" className="space-y-3 min-w-0">
      <div className="flex items-center justify-between flex-wrap gap-2 border-b pb-3">
        <h2 className="flex items-center gap-2 text-base font-semibold">🔭 SURVEILLANCE</h2>
        {count > 0 && <span className="text-xs text-muted-foreground">{count} Incident</span>}
      </div>

      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="w-full justify-between group">
            <span>📋 Format Input yang Didukung</span>
            <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-3 rounded-md border bg-muted/30 p-3 text-xs">
          <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
            <li>Setiap antrian diawali baris <span className="font-mono text-foreground">ANTRIAN 1</span>, <span className="font-mono text-foreground">ANTRIAN 2</span>, dst. Satu antrian boleh berisi beberapa incident.</li>
            <li>ID Incident berupa angka minimal 6 digit, boleh dengan label <span className="font-mono text-foreground">ID INSIDEN :</span>.</li>
            <li>Durasi gangguan (mis. <span className="font-mono text-foreground">21 JAM 10 MENIT</span>) opsional — boleh ditulis atau dilewati.</li>
            <li>Deskripsi tiket diawali <span className="font-mono text-foreground">FTTH AKSES</span> diikuti nama user; detail teknis (FAT, OLT, SN ONT, SERPO) otomatis dipotong.</li>
            <li>Estimasi berangkat dihitung otomatis: Antrian 1 = 08:00, setiap antrian berikutnya +2 jam.</li>
          </ul>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">Contoh Input</p>
              <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={async () => {
                try {
                  await navigator.clipboard.writeText(EXAMPLE_INPUT);
                  toast({ title: "Tersalin", description: "Contoh input disalin ke clipboard." });
                } catch {
                  toast({ title: "Gagal menyalin", description: "Izinkan akses clipboard atau salin contoh secara manual.", variant: "destructive" });
                }
              }}><Copy className="mr-1 h-3 w-3" />Copy Example</Button>
            </div>
            <pre className="whitespace-pre-wrap rounded bg-background p-2 font-mono text-[11px] leading-relaxed border">{EXAMPLE_INPUT}</pre>
          </div>
          <div className="space-y-1">
            <p className="font-medium">Contoh Hasil Output</p>
            <pre className="whitespace-pre-wrap rounded bg-background p-2 font-mono text-[11px] leading-relaxed border">{EXAMPLE_OUTPUT}</pre>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="grid min-w-0 grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="min-w-0 space-y-2">
          <Label htmlFor="surveillance-input" className="text-xs">Data Antrian</Label>
          <Textarea id="surveillance-input" value={input} onChange={(event) => setInput(event.target.value)}
            placeholder="ANTRIAN 1" spellCheck={false}
            className="min-h-[300px] lg:min-h-[420px] font-mono text-xs bg-muted/30" />
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor="surveillance-output" className="text-xs">Hasil SURVEILLANCE · ICRM</Label>
          <Textarea id="surveillance-output" value={output} onChange={(event) => setOutput(event.target.value)}
            readOnly={!editing} spellCheck={false} aria-label="Hasil SURVEILLANCE" aria-live="polite"
            className="min-h-[300px] lg:min-h-[420px] font-mono text-xs bg-muted/30" />
        </div>
      </div>

      {warnings.length > 0 && <div role="alert" className="border-l-2 border-warning bg-warning/10 px-3 py-2 text-xs text-foreground space-y-1">
        <p className="font-medium">{warnings.length} data perlu diperiksa</p>
        <ul className="list-disc pl-4 max-h-32 overflow-y-auto">{warnings.map((warning, index) => <li key={`${index}-${warning}`}>{warning}</li>)}</ul>
      </div>}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={generate} disabled={!input.trim()}><Wand2 className="mr-1.5 h-3.5 w-3.5" />Generate</Button>
        <Button size="sm" variant="outline" onClick={() => setEditing((value) => !value)} disabled={!output.trim()} aria-pressed={editing}>
          {editing ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Pencil className="mr-1.5 h-3.5 w-3.5" />}{editing ? "Selesai Edit" : "Edit Result"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => { setInput(""); setOutput(""); setWarnings([]); setCount(0); setEditing(false); }} disabled={!input && !output}>
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />Reset
        </Button>
        <Button size="sm" variant="secondary" onClick={copy} disabled={!output.trim()} className="sm:ml-auto"><Copy className="mr-1.5 h-3.5 w-3.5" />Copy Result</Button>
      </div>
    </section>
  );
}