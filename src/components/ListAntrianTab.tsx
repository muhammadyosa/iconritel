import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, ListOrdered, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ParsedRow {
  duration: string;
  minutes: number;
  ticketId: string;
  category: string;
  description: string;
  count: string;
  olt: string;
  serpo: string;
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

      const oltMatch = /([A-Z0-9._-]*-OLT-\d+)/i.exec(description);
      const serpoMatch = /SERPO\s+[A-Z0-9._-]+/i.exec(description);

      rows.push({
        duration,
        minutes: parseDurationToMinutes(duration),
        ticketId,
        category,
        description: description.trim(),
        count,
        olt: (oltMatch?.[1] || "TANPA OLT").toUpperCase(),
        serpo: (serpoMatch?.[0] || "-").toUpperCase(),
      });
    });
  return rows;
};

const formatDateID = (d: Date) =>
  d
    .toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
    .toUpperCase();

export default function ListAntrianTab() {
  const [input, setInput] = useState("");

  const result = useMemo(() => {
    const rows = parseLines(input);
    if (rows.length === 0) return { rows, output: "" };

    // Group by OLT terminasi
    const groups = new Map<string, ParsedRow[]>();
    rows.forEach((r) => {
      const list = groups.get(r.olt) || [];
      list.push(r);
      groups.set(r.olt, list);
    });

    const ordered = Array.from(groups.values())
      .map((list) => list.slice().sort((a, b) => b.minutes - a.minutes))
      .sort((a, b) => b[0].minutes - a[0].minutes);

    const tim = rows.find((r) => r.serpo !== "-")?.serpo || "-";

    const lines: string[] = [
      `LIST TIKET YANG BELUM DI KERJAKAN TANGGAL ${formatDateID(new Date())}`,
      "",
      `TIM: ${tim}`,
      "",
    ];

    ordered.forEach((list, i) => {
      lines.push(`*Antrian ${i + 1}*`, "");
      list.forEach((r) => {
        lines.push(r.duration, "", r.ticketId, "", `${r.category}\t${r.description} ${r.count}`, "");
      });
    });

    return { rows, output: lines.join("\n").trimEnd() };
  }, [input]);

  const handleCopy = async () => {
    if (!result.output) return;
    await navigator.clipboard.writeText(result.output);
    toast({ title: "Tersalin", description: "List antrian disalin ke clipboard." });
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <h2 className="sr-only">List Antrian</h2>

      <Card>
        <CardHeader className="pb-3 pt-4 px-3 sm:px-6">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <ListOrdered className="h-4 w-4 text-primary" />
              📑 Input Data Tiket
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setInput("")}
              disabled={!input}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Bersihkan
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-4 space-y-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={10}
            placeholder={"Tempel data dari Excel di sini, contoh:\n11 JAM 55 MENIT\t26082104120\tFTTH AKSES\tMERI BULET LINK LOSS - SERPO KOBA SPLT_TBLA10241 SBS-PERMIS-FH.AN6001.G16-OLT-01 FHTT9D0CC218\t1"}
            className="font-mono text-[11px] sm:text-xs"
          />
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            Tiket dengan OLT terminasi yang sama digabung jadi satu antrian dan diurutkan dari durasi terlama.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 pt-4 px-3 sm:px-6">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-sm sm:text-base">
              📋 Hasil List Antrian
              <span className="ml-2 text-[10px] sm:text-xs font-normal text-muted-foreground">
                {result.rows.length} tiket
              </span>
            </CardTitle>
            <Button size="sm" className="h-8 text-xs" onClick={handleCopy} disabled={!result.output}>
              <Copy className="h-3.5 w-3.5 mr-1" /> Copy
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-4">
          {result.output ? (
            <pre className="whitespace-pre-wrap break-words font-mono text-[11px] sm:text-xs bg-muted/40 rounded-md p-3 max-h-[60vh] overflow-y-auto">
              {result.output}
            </pre>
          ) : (
            <p className="text-xs text-muted-foreground py-6 text-center">
              Belum ada data. Tempel list tiket di atas untuk membuat antrian.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
