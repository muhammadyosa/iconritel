import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, ListOrdered, Trash2, Info, Wand2, BarChart3, Clock, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ParsedRow {
  duration: string;
  minutes: number;
  ticketId: string;
  category: string;
  description: string;
  count: string;
  olt: string;
  terminasi: string;
  team: string;
}

const parseDurationToMinutes = (text: string): number => {
  const hari = /(\d+)\s*HARI/i.exec(text)?.[1];
  const jam = /(\d+)\s*JAM/i.exec(text)?.[1];
  const menit = /(\d+)\s*MENIT/i.exec(text)?.[1];
  return (
    (hari ? parseInt(hari, 10) * 1440 : 0) +
    (jam ? parseInt(jam, 10) * 60 : 0) +
    (menit ? parseInt(menit, 10) : 0)
  );
};

const splitCells = (line: string): string[] => {
  const cells = line.includes("\t") ? line.split("\t") : line.split(/\s{2,}/);
  return cells.map((c) => c.trim()).filter((c) => c.length > 0);
};

const extractTerminasi = (olt: string): string => {
  const match = /^(.*)-[^-]+-OLT-\d+$/i.exec(olt);
  return match ? match[1].toUpperCase() : olt.toUpperCase();
};

const parseLines = (raw: string): ParsedRow[] => {
  const rows: ParsedRow[] = [];
  raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line) => {
      const cells = splitCells(line);
      if (cells.length < 3) return;

      const duration = cells[0].toUpperCase();
      if (!/\d/.test(duration) || !/(HARI|JAM|MENIT)/i.test(duration)) return;

      const ticketId = cells[1];
      let category = "FTTH AKSES";
      let description = "";
      let count = "1";

      const rest = cells.slice(2);
      const last = rest[rest.length - 1];
      if (rest.length > 1 && /^\d+$/.test(last)) {
        count = last;
        rest.pop();
      }
      if (/^FTTH/i.test(rest[0]) && rest.length > 1) {
        category = rest[0].toUpperCase();
        description = rest.slice(1).join(" ");
      } else {
        description = rest.join(" ");
      }

      description = description.trim();

      const trailing = /\s(\d+)$/.exec(description);
      if (trailing && count === "1") {
        count = trailing[1];
        description = description.replace(/\s\d+$/, "").trim();
      }

      const oltMatch = /([A-Z0-9._-]*-OLT-\d+)/i.exec(description);
      const olt = (oltMatch?.[1] || "TANPA OLT").toUpperCase();

      // Team/SERPO extraction:
      // - Proaktif/distribusi: nama tim ada di segmen terakhir setelah " - "
      // - Akses: nama tim dimulai dari prefix tim (SIB/TRA/SERPO/INTERNAL/GSP/...)
      //   sampai sebelum FAT_/SPLT_/FDT_
      let team = "";
      const isProaktif = /\[PROACTIVE|UNDER/i.test(description);
      if (isProaktif) {
        const parts = description.split(/\s+-\s+/).map((p) => p.trim()).filter(Boolean);
        const lastPart = parts[parts.length - 1] || "";
        if (lastPart && !/-OLT-\d+/i.test(lastPart)) team = lastPart;
      }
      if (!team) {
        const prefixMatch = /\b(?:SIB|TRA|SERPO|INTERNAL|GSP|MITRA|PT)\b[\s\S]*?(?=\s+(?:FAT_|SPLT_|FDT_))/i.exec(
          description
        );
        team = prefixMatch?.[0] || "";
      }
      if (!team) {
        const teamMatch = /-\s+([A-Z0-9 ._/]+?)\s+(?:FAT_|SPLT_|FDT_)/i.exec(description);
        team = teamMatch?.[1] || "";
      }


      rows.push({
        duration,
        minutes: parseDurationToMinutes(duration),
        ticketId,
        category,
        description,
        count,
        olt,
        terminasi: extractTerminasi(olt),
        team: (team || "TANPA TIM").trim().toUpperCase(),
      });

    });
  return rows;
};

const formatDateID = (d: Date) =>
  d
    .toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    })
    .toUpperCase();

export default function ListAntrianTab() {
  const [input, setInput] = useState("");
  const [generated, setGenerated] = useState("");
  const [showFormat, setShowFormat] = useState(false);

  const result = useMemo(() => {
    const rows = parseLines(input);
    if (rows.length === 0) return { rows, teamCount: 0, antrianCount: 0, output: "" };

    const teams = new Map<string, ParsedRow[]>();
    rows.forEach((r) => {
      const list = teams.get(r.team) || [];
      list.push(r);
      teams.set(r.team, list);
    });

    const orderedTeams = Array.from(teams.entries()).sort(
      (a, b) =>
        Math.max(...b[1].map((r) => r.minutes)) - Math.max(...a[1].map((r) => r.minutes))
    );

    const tanggal = formatDateID(new Date());
    const blocks: string[] = [];
    let totalAntrian = 0;

    orderedTeams.forEach(([team, teamRows]) => {
      const groups = new Map<string, ParsedRow[]>();
      teamRows.forEach((r) => {
        const list = groups.get(r.terminasi) || [];
        list.push(r);
        groups.set(r.terminasi, list);
      });

      const ordered = Array.from(groups.values())
        .map((list) => list.slice().sort((a, b) => b.minutes - a.minutes))
        .sort((a, b) => b[0].minutes - a[0].minutes);

      totalAntrian += ordered.length;

      const antrianBlocks = ordered.map((list, i) => {
        const tickets = list.map((r) => [r.duration, r.ticketId, `${r.category}\t${r.description}`].join("\n"));
        return [`*Antrian ${i + 1}*`, ...tickets].join("\n\n");
      });

      blocks.push(
        [
          `LIST TIKET YANG BELUM DI KERJAKAN TANGGAL ${tanggal}`,
          `TIM: ${team}`,
          "",
          antrianBlocks.join("\n\n"),
        ].join("\n")
      );
    });

    return { rows, teamCount: orderedTeams.length, antrianCount: totalAntrian, output: blocks.join("\n\n\n") };
  }, [input]);

  const handleGenerate = () => {
    if (!result.output) {
      toast({
        title: "Format tidak dikenali",
        description: "Pastikan setiap baris diawali durasi, lalu Incident ID, kategori, dan deskripsi.",
        variant: "destructive",
      });
      setGenerated("");
      return;
    }
    setGenerated(result.output);
    toast({
      title: "Format dibuat",
      description: `${result.rows.length} tiket dari ${result.teamCount} tim berhasil disusun menjadi ${result.antrianCount} antrian.`,
    });
  };

  const handleClear = () => {
    setInput("");
    setGenerated("");
  };

  const handleCopy = async () => {
    if (!generated) return;
    await navigator.clipboard.writeText(generated);
    toast({ title: "Tersalin", description: "List antrian disalin ke clipboard." });
  };

  return (
    <div className="space-y-4">
      <h2 className="sr-only">List Antrian</h2>

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <ListOrdered className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-base font-semibold">List Antrian</h3>
          <p className="text-xs text-muted-foreground">Susun tiket pending per TIM/SERPO dan terminasi OLT.</p>
        </div>
      </div>

      {result.rows.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <div className="flex items-center gap-2 rounded-lg border bg-card p-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
              <BarChart3 className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Tiket</p>
              <p className="text-sm font-semibold leading-none">{result.rows.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border bg-card p-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-500/10">
              <Users className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Tim</p>
              <p className="text-sm font-semibold leading-none">{result.teamCount}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border bg-card p-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/10">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Antrian</p>
              <p className="text-sm font-semibold leading-none">{result.antrianCount}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="flex flex-col">
          <div className="flex items-center gap-2 px-4 py-3 border-b">
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">Input</span>
            <span className="text-sm font-medium">Data Tiket</span>
          </div>
          <CardContent className="flex-1 p-3">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste data tiket dengan format (pisahkan dengan TAB):\nDURASI[TAB]ID_TIKET[TAB]TYPE[TAB]DESKRIPSI[TAB]JUMLAH (opsional)"
              className="min-h-[260px] flex-1 resize-none font-mono text-[11px] sm:text-xs bg-muted/40"
            />
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <div className="flex items-center gap-2 px-4 py-3 border-b">
            <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-500">Hasil</span>
            <span className="text-sm font-medium">Format List Antrian</span>
          </div>
          <CardContent className="flex-1 p-3">
            {generated ? (
              <pre className="whitespace-pre-wrap break-words font-mono text-[11px] sm:text-xs bg-muted/40 rounded-md p-3 h-[260px] overflow-y-auto">
                {generated}
              </pre>
            ) : (
              <div className="h-[260px] flex flex-col items-center justify-center text-center text-muted-foreground px-4">
                <p className="text-sm">Hasil format akan muncul di sini...</p>
                <p className="text-xs mt-1">Tempel data tiket lalu klik Generate Format.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" className="h-9 text-xs" onClick={handleGenerate} disabled={!input.trim()}>
          <Wand2 className="h-3.5 w-3.5 mr-1.5" /> Generate Format
        </Button>
        <Button variant="outline" size="sm" className="h-9 text-xs" onClick={handleClear} disabled={!input && !generated}>
          <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Clear
        </Button>
        <Button variant="secondary" size="sm" className="h-9 text-xs ml-auto" onClick={handleCopy} disabled={!generated}>
          <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy
        </Button>
      </div>

      <Card className="border-primary/20 bg-primary/[0.03]">
        <button
          onClick={() => setShowFormat((v) => !v)}
          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
        >
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Format Input yang Didukung</span>
          </div>
          <span className="text-xs text-muted-foreground">{showFormat ? "Sembunyikan" : "Tampilkan"}</span>
        </button>
        {showFormat && (
          <CardContent className="px-4 pb-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              Paste data tiket dengan format (pisahkan dengan TAB). Kolom <b>Jumlah</b> di akhir bersifat opsional.
            </p>
            <pre className="whitespace-pre-wrap break-words font-mono text-[11px] bg-muted/50 rounded-md p-2">
              DURASI[TAB]ID_TIKET[TAB]TYPE[TAB]DESKRIPSI[TAB]JUMLAH
            </pre>

            <div>
              <p className="text-[11px] font-semibold mb-1">Contoh Input:</p>
              <pre className="whitespace-pre-wrap break-words font-mono text-[10px] sm:text-[11px] bg-muted/50 rounded-md p-2">
{`3 JAM 56 MENIT  26012107781  FTTH AKSES   RESTI LINK LOSS - SIB PESAMARAN SPLT_GOTA176...
5 JAM 53 MENIT  26012107738  FTTH DISTRIBUSI (PROAKTIVE NOC RETAIL) SPLT_BDLA180...`}
              </pre>
            </div>

            <div>
              <p className="text-[11px] font-semibold mb-1">Hasil Output:</p>
              <pre className="whitespace-pre-wrap break-words font-mono text-[10px] sm:text-[11px] bg-muted/50 rounded-md p-2">
{`LIST TIKET YANG BELUM DI KERJAKAN TANGGAL 19 AGUSTUS 2026

TIM: SIB BELITUNG

*Antrian 1*

20 JAM 48 MENIT

26082104043

FTTH AKSES\tRANDA MAHENDRA PENGECEKAN BERSAMA - SIB BELITUNG FAT_TDNA10487 SBS-SUAK.TERONG-HW.MA5801-OLT-01 48575443CE4EB4AD

*Antrian 2*

18 JAM 22 MENIT

26082104021

FTTH AKSES\tROY MOLIS BAD RX - SIB BELITUNG FAT_TDNA10371 SBS-PERAWAS-HW.MA5801-OLT-01 485754430F5F79AF`}
              </pre>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Tiket dikelompokkan per <b>TIM/SERPO</b>, lalu per <b>terminasi OLT</b> yang sama, diurutkan dari durasi terlama.
            </p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
