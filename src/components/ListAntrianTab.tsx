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
  // Group by site/location: e.g. SBS-TANJUNG.PANDAN-HW.MA5801-OLT-01 -> SBS-TANJUNG.PANDAN
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

      // trailing count still inside description (space separated)
      const trailing = /\s(\d+)$/.exec(description);
      if (trailing && count === "1") {
        count = trailing[1];
        description = description.replace(/\s\d+$/, "").trim();
      }

      const oltMatch = /([A-Z0-9._-]*-OLT-\d+)/i.exec(description);
      // Team / Serpo: text between " - " and the FAT_/SPLT_/FDT_ token
      const teamMatch = /-\s+([A-Z0-9 ._/]+?)\s+(?:FAT_|SPLT_|FDT_)/i.exec(description);

      const olt = (oltMatch?.[1] || "TANPA OLT").toUpperCase();

      rows.push({
        duration,
        minutes: parseDurationToMinutes(duration),
        ticketId,
        category,
        description,
        count,
        olt,
        terminasi: extractTerminasi(olt),
        team: (teamMatch?.[1] || "TANPA TIM").trim().toUpperCase(),
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

  const result = useMemo(() => {
    const rows = parseLines(input);
    if (rows.length === 0) return { rows, teamCount: 0, output: "" };

    // Group by TIM (serpo), then by terminasi (site/location)
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

      const lines: string[] = [
        `LIST TIKET YANG BELUM DI KERJAKAN TANGGAL ${tanggal}`,
        "",
        `TIM: ${team}`,
        "",
      ];

      ordered.forEach((list, i) => {
        lines.push(`*Antrian ${i + 1}*`, "");
        list.forEach((r, idx) => {
          lines.push(r.duration, r.ticketId, `${r.category}\t${r.description} ${r.count}`);
          if (idx < list.length - 1) lines.push("");
        });
        if (i < ordered.length - 1) lines.push("");
      });

      blocks.push(lines.join("\n").trimEnd());
    });

    return { rows, teamCount: orderedTeams.length, output: blocks.join("\n\n") };
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
            Tiket dipisah per TIM/SERPO, lalu terminasi OLT yang sama digabung jadi satu antrian dan diurutkan dari durasi terlama.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 pt-4 px-3 sm:px-6">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-sm sm:text-base">
              📋 Hasil List Antrian
              <span className="ml-2 text-[10px] sm:text-xs font-normal text-muted-foreground">
                {result.rows.length} tiket · {result.teamCount} tim
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
