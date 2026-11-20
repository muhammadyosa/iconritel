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

const EXAMPLE_INPUT = `TIM: FTTH AKSES
ANTRIAN 1
12 JAM 22 MENIT
26112100416
FTTH AKSES TANSYA SAPTA ALMEGA LINK LOSS - SERPO MUKO MUKO FAT_123 SBS-MUKO-RC-OLT-04 SN ONT 48575443

ANTRIAN 2
26112100542
FTTH AKSES YAHYA ISMAWAN PEGAWAI PLN BAD RX - SERPO SUNGAI PENUH

TIM: FTTH FEEDER
ANTRIAN 1
12 JAM 22 MENIT
26112101200
FTTH FEEDER [PROACTIVE NOC RETAIL] FAT LOSS - SPLT_TUBA015 - UNDER - SBS-LEBONG.LEBONG-MA5800-OLT-01 - SERPO ARGA MAKMUR

ANTRIAN 2
26112101251
FTTH FEEDER [PROACTIVE NOC RETAIL] OLT DOWN UNDER - SBS-ARGA.MAKMUR-RC-OLT-01 - SERPO ARGA MAKMUR`;

const EXAMPLE_OUTPUT = formatSurveillance(parseSurveillance(EXAMPLE_INPUT).incidents);

function nonNegativeNumber(value: string, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function positiveNumber(value: string, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

interface CategoryScheduleProps {
  id: string;
  title: string;
  description: string;
  startTime: string;
  intervalHours: string;
  completionHours: string;
  onStartTimeChange: (value: string) => void;
  onIntervalChange: (value: string) => void;
  onCompletionChange: (value: string) => void;
}

function CategorySchedule({
  id,
  title,
  description,
  startTime,
  intervalHours,
  completionHours,
  onStartTimeChange,
  onIntervalChange,
  onCompletionChange,
}: CategoryScheduleProps) {
  return (
    <div className="space-y-2 rounded border bg-background p-2.5">
      <div>
        <p className="text-xs font-medium">{title}</p>
        <p className="text-[10px] text-muted-foreground">{description}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label htmlFor={`${id}-start`} className="text-[10px] text-muted-foreground">Mulai Berangkat</Label>
          <Input id={`${id}-start`} type="time" value={startTime} onChange={(event) => onStartTimeChange(event.target.value)} className="h-8 px-2 text-xs" />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${id}-interval`} className="text-[10px] text-muted-foreground">Interval (jam)</Label>
          <Input id={`${id}-interval`} type="number" min="0" max="24" step="0.5" value={intervalHours} onChange={(event) => onIntervalChange(event.target.value)} className="h-8 px-2 text-xs" />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${id}-completion`} className="text-[10px] text-muted-foreground">Penyelesaian (jam)</Label>
          <Input id={`${id}-completion`} type="number" min="0.5" max="72" step="0.5" value={completionHours} onChange={(event) => onCompletionChange(event.target.value)} className="h-8 px-2 text-xs" />
        </div>
      </div>
    </div>
  );
}

export function SurveillanceTab() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [editing, setEditing] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [count, setCount] = useState(0);
  const [accessStartTime, setAccessStartTime] = useState("08:00");
  const [accessIntervalHours, setAccessIntervalHours] = useState("2");
  const [accessCompletionHours, setAccessCompletionHours] = useState("2");
  const [infrastructureStartTime, setInfrastructureStartTime] = useState("08:00");
  const [infrastructureIntervalHours, setInfrastructureIntervalHours] = useState("4");
  const [infrastructureCompletionHours, setInfrastructureCompletionHours] = useState("4");
  const [queueSettings, setQueueSettings] = useState<Record<number, SurveillanceQueueSetting>>({});

  const accessIntervalValue = nonNegativeNumber(accessIntervalHours, 2);
  const accessCompletionValue = positiveNumber(accessCompletionHours, 2);
  const infrastructureIntervalValue = nonNegativeNumber(infrastructureIntervalHours, 4);
  const infrastructureCompletionValue = positiveNumber(infrastructureCompletionHours, 4);
  const queueNumbers = useMemo(() => Array.from(
    new Set(parseSurveillance(input).incidents.map((incident) => incident.queue)),
  ).sort((a, b) => a - b), [input]);

  const generate = () => {
    const result = parseSurveillance(input, {
      access: {
        startTime: accessStartTime,
        intervalHours: accessIntervalValue,
        completionHours: accessCompletionValue,
      },
      infrastructure: {
        startTime: infrastructureStartTime,
        intervalHours: infrastructureIntervalValue,
        completionHours: infrastructureCompletionValue,
      },
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
    setAccessStartTime("08:00");
    setAccessIntervalHours("2");
    setAccessCompletionHours("2");
    setInfrastructureStartTime("08:00");
    setInfrastructureIntervalHours("4");
    setInfrastructureCompletionHours("4");
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
            <li>Tanggal laporan dan <span className="font-mono text-foreground">TIM:</span> boleh disertakan. Nomor antrian dan ID Incident selalu mengikuti pasangan pada input.</li>
            <li>Durasi gangguan seperti <span className="font-mono text-foreground">12 JAM 22 MENIT</span> bersifat opsional dan diabaikan.</li>
            <li><span className="font-mono text-foreground">FTTH AKSES</span>: hanya nama pelanggan sebelum LINK LOSS atau informasi teknis; penyelesaian 2 jam dan interval keberangkatan 2 jam mulai 08:00.</li>
            <li><span className="font-mono text-foreground">FTTH FEEDER</span>, <span className="font-mono text-foreground">FTTH BACKBONE</span>, dan <span className="font-mono text-foreground">FTTH DISTRIBUSI</span>: seluruh deskripsi dipertahankan; penyelesaian 4 jam dan interval keberangkatan 4 jam mulai 08:00.</li>
            <li>Kategori dan estimasi dikenali otomatis. Pengaturan dapat disesuaikan per kategori, dengan override waktu berangkat per antrian.</li>
          </ul>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">Contoh Input — FTTH AKSES dan FEEDER</p>
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
          Pengaturan Estimasi Otomatis per Kategori
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
          <CategorySchedule
            id="surveillance-access"
            title="FTTH AKSES"
            description="Nama pelanggan saja · default 2 jam"
            startTime={accessStartTime}
            intervalHours={accessIntervalHours}
            completionHours={accessCompletionHours}
            onStartTimeChange={setAccessStartTime}
            onIntervalChange={setAccessIntervalHours}
            onCompletionChange={setAccessCompletionHours}
          />
          <CategorySchedule
            id="surveillance-infrastructure"
            title="FTTH FEEDER / BACKBONE / DISTRIBUSI"
            description="Deskripsi lengkap · default 4 jam"
            startTime={infrastructureStartTime}
            intervalHours={infrastructureIntervalHours}
            completionHours={infrastructureCompletionHours}
            onStartTimeChange={setInfrastructureStartTime}
            onIntervalChange={setInfrastructureIntervalHours}
            onCompletionChange={setInfrastructureCompletionHours}
          />
        </div>

        {queueNumbers.length > 0 && (
          <div className="space-y-2 border-t pt-3">
            <p className="text-[11px] text-muted-foreground">Override waktu berangkat per antrian · kosongkan untuk kembali ke jadwal otomatis.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
              {queueNumbers.map((queue) => (
                <div key={queue} className="space-y-1.5 rounded border bg-background p-2">
                  <p className="text-xs font-medium">Antrian ke - {queue}</p>
                  <Label htmlFor={`surveillance-queue-${queue}-departure`} className="text-[10px] text-muted-foreground">Override Berangkat</Label>
                  <Input
                    id={`surveillance-queue-${queue}-departure`}
                    type="time"
                    value={queueSettings[queue]?.departure ?? ""}
                    onChange={(event) => updateQueueSetting(queue, { departure: event.target.value || undefined })}
                    className="h-8 px-2 text-xs"
                  />
                  <p className="text-[10px] leading-relaxed text-muted-foreground">
                    Otomatis: AKSES {surveillanceDeparture(queue, accessStartTime, accessIntervalValue)} · kategori lain {surveillanceDeparture(queue, infrastructureStartTime, infrastructureIntervalValue)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid min-w-0 grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="min-w-0 space-y-2">
          <Label htmlFor="surveillance-input" className="text-xs">Data Tiket / Antrian</Label>
          <Textarea id="surveillance-input" value={input} onChange={(event) => setInput(event.target.value)}
            placeholder={"TIM: FTTH AKSES\nANTRIAN 1\n12 JAM 22 MENIT\n26112100416\nFTTH AKSES TANSYA SAPTA ALMEGA LINK LOSS ..."} spellCheck={false}
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
