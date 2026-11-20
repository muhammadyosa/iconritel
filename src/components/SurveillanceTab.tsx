import { useMemo, useState } from "react";
import { Check, ChevronDown, Copy, Pencil, RotateCcw, Settings2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  formatSurveillance,
  parseSurveillance,
  surveillanceDeparture,
  type SurveillanceQueueSetting,
} from "@/lib/surveillance";

const EXAMPLE_INPUT = `20/11/2026
TIM: SERPO ARGA MAKMUR
ANTRIAN 1
12 JAM 22 MENIT
26112101200
FTTH AKSES [PROACTIVE NOC RETAIL] FAT LOSS - SPLT_TUBA015 - UNDER - SBS-LEBONG.LEBONG-MA5800-OLT-01 - SERPO ARGA MAKMUR

ANTRIAN 2
26112101201
FTTH FEEDER [PROACTIVE NOC RETAIL] OLT BAD RX SEGMEN - SBS-MUKO.MUKO-RC-OLT-04 - TO - SBS-PONDOK.SUGUH-NE8000-UPE-01 - SERPO MUKO MUKO`;

const EXAMPLE_OUTPUT = formatSurveillance(parseSurveillance(EXAMPLE_INPUT).incidents);

function nonNegativeNumber(value: string, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function positiveNumber(value: string, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

export function SurveillanceTab() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [editing, setEditing] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [count, setCount] = useState(0);
  const [startTime, setStartTime] = useState("08:00");
  const [intervalHours, setIntervalHours] = useState("2");
  const [completionHours, setCompletionHours] = useState("4");
  const [queueSettings, setQueueSettings] = useState<Record<number, SurveillanceQueueSetting>>({});

  const intervalValue = nonNegativeNumber(intervalHours, 2);
  const completionValue = positiveNumber(completionHours, 4);
  const queueNumbers = useMemo(() => Array.from(
    new Set(parseSurveillance(input).incidents.map((incident) => incident.queue)),
  ).sort((a, b) => a - b), [input]);

  const generate = () => {
    const result = parseSurveillance(input, {
      startTime,
      intervalHours: intervalValue,
      completionHours: completionValue,
      queueSettings,
    });
    setWarnings(result.warnings);
    setCount(result.incidents.length);
    setOutput(formatSurveillance(result.incidents));
    setEditing(false);
    if (!result.incidents.length) {
      toast({
        title: "Data tidak dikenali",
        description: "Nomor antrian, ID incident, dan deskripsi kategori FTTH belum lengkap.",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Laporan dibuat", description: `${result.incidents.length} incident berhasil diproses.` });
  };

  const updateQueueSetting = (queue: number, setting: SurveillanceQueueSetting) => {
    setQueueSettings((current) => ({
      ...current,
      [queue]: { ...current[queue], ...setting },
    }));
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      toast({ title: "Tersalin", description: "Laporan SURVEILLANCE disalin." });
    } catch {
      toast({ title: "Gagal menyalin", description: "Izinkan akses clipboard atau salin teks hasil secara manual.", variant: "destructive" });
    }
  };

  const reset = () => {
    setInput("");
    setOutput("");
    setWarnings([]);
    setCount(0);
    setEditing(false);
    setStartTime("08:00");
    setIntervalHours("2");
    setCompletionHours("4");
    setQueueSettings({});
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
            <li>Tanggal laporan dan <span className="font-mono text-foreground">TIM:</span> boleh disertakan. Setiap antrian diawali <span className="font-mono text-foreground">ANTRIAN 1</span>, <span className="font-mono text-foreground">ANTRIAN 2</span>, dst.</li>
            <li>ID Incident berupa angka minimal 6 digit dan selalu dipasangkan dengan antrian tempat ID tersebut ditulis.</li>
            <li>Durasi gangguan seperti <span className="font-mono text-foreground">12 JAM 22 MENIT</span> bersifat opsional dan diabaikan.</li>
            <li>Kategori yang didukung: <span className="font-mono text-foreground">FTTH AKSES</span>, <span className="font-mono text-foreground">FTTH DISTRIBUSI</span>, <span className="font-mono text-foreground">FTTH BACKBONE</span>, dan <span className="font-mono text-foreground">FTTH FEEDER</span>.</li>
            <li>Seluruh deskripsi setelah kategori dipertahankan, termasuk label proactive, jenis gangguan, lokasi, OLT, SERPO, dan informasi teknis lainnya.</li>
            <li>Estimasi penyelesaian default 4 jam. Keberangkatan dimulai 08:00 dengan interval default 2 jam dan dapat diatur per antrian.</li>
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

      <div className="space-y-3 rounded-md border bg-muted/20 p-3">
        <div className="flex items-center gap-2 text-xs font-medium">
          <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
          Pengaturan Estimasi
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="surveillance-start" className="text-[11px]">Mulai Berangkat</Label>
            <Input id="surveillance-start" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} className="h-8 text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="surveillance-interval" className="text-[11px]">Interval Antar Antrian (jam)</Label>
            <Input id="surveillance-interval" type="number" min="0" max="24" step="0.5" value={intervalHours} onChange={(event) => setIntervalHours(event.target.value)} className="h-8 text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="surveillance-completion" className="text-[11px]">Penyelesaian Default (jam)</Label>
            <Input id="surveillance-completion" type="number" min="0.5" max="72" step="0.5" value={completionHours} onChange={(event) => setCompletionHours(event.target.value)} className="h-8 text-xs" />
          </div>
        </div>

        {queueNumbers.length > 0 && (
          <div className="space-y-2 border-t pt-3">
            <p className="text-[11px] text-muted-foreground">Penyesuaian per antrian · klik Generate setelah mengubah pengaturan.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
              {queueNumbers.map((queue) => {
                const setting = queueSettings[queue];
                return (
                  <div key={queue} className="grid grid-cols-2 gap-2 rounded border bg-background p-2">
                    <p className="col-span-2 text-xs font-medium">Antrian ke - {queue}</p>
                    <div className="space-y-1">
                      <Label htmlFor={`surveillance-queue-${queue}-departure`} className="text-[10px] text-muted-foreground">Berangkat</Label>
                      <Input
                        id={`surveillance-queue-${queue}-departure`}
                        type="time"
                        value={setting?.departure ?? surveillanceDeparture(queue, startTime, intervalValue)}
                        onChange={(event) => updateQueueSetting(queue, { departure: event.target.value })}
                        className="h-8 px-2 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`surveillance-queue-${queue}-completion`} className="text-[10px] text-muted-foreground">Penyelesaian (jam)</Label>
                      <Input
                        id={`surveillance-queue-${queue}-completion`}
                        type="number"
                        min="0.5"
                        max="72"
                        step="0.5"
                        value={setting?.completionHours ?? completionValue}
                        onChange={(event) => updateQueueSetting(queue, {
                          completionHours: event.target.value === "" ? undefined : positiveNumber(event.target.value, completionValue),
                        })}
                        className="h-8 px-2 text-xs"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="grid min-w-0 grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="min-w-0 space-y-2">
          <Label htmlFor="surveillance-input" className="text-xs">Data Tiket / Antrian</Label>
          <Textarea id="surveillance-input" value={input} onChange={(event) => setInput(event.target.value)}
            placeholder={"20/11/2026\nTIM: SERPO ARGA MAKMUR\nANTRIAN 1\n12 JAM 22 MENIT\n26112101200\nFTTH AKSES [PROACTIVE NOC RETAIL] ..."} spellCheck={false}
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
        <Button size="sm" variant="outline" onClick={reset} disabled={!input && !output}>
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />Reset
        </Button>
        <Button size="sm" variant="secondary" onClick={copy} disabled={!output.trim()} className="sm:ml-auto"><Copy className="mr-1.5 h-3.5 w-3.5" />Copy Result</Button>
      </div>
    </section>
  );
}
