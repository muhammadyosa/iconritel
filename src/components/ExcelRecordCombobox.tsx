import { useState, useRef, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExcelRecord } from "@/types/ticket";

interface Props {
  value: string;
  onChange: (value: string) => void;
  /** Called when a record from Preview Data User is picked. Use to auto-fill other fields. */
  onPick?: (record: ExcelRecord) => void;
  records: ExcelRecord[];
  /** Which record field this input represents — used for matching the highlighted match */
  field: "hostname" | "fat";
  placeholder?: string;
}

/**
 * Searchable combobox over Preview Data User (excelData).
 * Searches across customer / service / hostname / fat / sn so user can find
 * a record by any field, then pick to auto-fill the manual incident form.
 */
export function ExcelRecordCombobox({
  value,
  onChange,
  onPick,
  records,
  field,
  placeholder,
}: Props) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    // Deduplicate by the target field so user gets meaningful unique suggestions
    const seen = new Set<string>();
    const out: ExcelRecord[] = [];
    for (const r of records) {
      const key = String(r[field] ?? "").trim();
      if (!key) continue;
      const k = key.toLowerCase();
      if (seen.has(k)) continue;
      if (q) {
        const haystack = [
          r.customer,
          r.service,
          r.hostname,
          r.fat,
          r.sn,
        ]
          .map((x) => String(x ?? "").toLowerCase())
          .join(" | ");
        if (!haystack.includes(q)) continue;
      }
      seen.add(k);
      out.push(r);
      if (out.length >= 50) break;
    }
    return out;
  }, [value, records, field]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    setActiveIdx(0);
  }, [value, open]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx, open]);

  const select = (rec: ExcelRecord) => {
    const v = String(rec[field] ?? "");
    onChange(v);
    onPick?.(rec);
    setOpen(false);
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (open && filtered[activeIdx]) {
        e.preventDefault();
        select(filtered[activeIdx]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          placeholder={placeholder}
          className="pl-8"
          autoComplete="off"
        />
      </div>
      {open && filtered.length > 0 && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-md border border-border bg-popover text-popover-foreground shadow-lg"
        >
          <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground border-b border-border/60">
            {filtered.length} hasil dari Preview Data User
          </div>
          {filtered.map((r, i) => {
            const isActive = i === activeIdx;
            const primary = String(r[field] ?? "");
            return (
              <button
                key={`${primary}-${i}`}
                type="button"
                data-idx={i}
                onMouseEnter={() => setActiveIdx(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  select(r);
                }}
                className={cn(
                  "w-full text-left px-2.5 py-1.5 text-xs flex flex-col gap-0.5 transition-colors border-b border-border/30 last:border-b-0",
                  isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/60",
                )}
              >
                <span className="font-semibold truncate">{primary || "—"}</span>
                <span className="text-[10px] text-muted-foreground truncate">
                  {r.customer ? `👤 ${r.customer}` : ""}
                  {r.service ? `  •  🆔 ${r.service}` : ""}
                </span>
                <span className="text-[10px] text-muted-foreground truncate">
                  {field === "hostname"
                    ? r.fat ? `🛠️ FAT ${r.fat}` : ""
                    : r.hostname ? `🖥️ ${r.hostname}` : ""}
                  {r.sn ? `  •  SN ${r.sn}` : ""}
                </span>
              </button>
            );
          })}
        </div>
      )}
      {open && filtered.length === 0 && value.trim() && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover px-3 py-2 text-xs text-muted-foreground shadow-lg">
          Tidak ada data cocok di Preview Data User. Tekan Enter untuk pakai "{value.trim()}".
        </div>
      )}
    </div>
  );
}
