import { useState, useRef, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Search, AlertCircle, CheckCircle2 } from "lucide-react";
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

// Format validation per field
const FORMAT: Record<Props["field"], { regex: RegExp; label: string }> = {
  hostname: {
    // Hostname OLT: letters, digits, dot, dash, underscore, slash, colon. Min 3 chars.
    regex: /^[A-Za-z0-9._:\-/]{3,}$/,
    label: "Hostname OLT hanya boleh huruf, angka, dan . _ - / : (min 3 karakter)",
  },
  fat: {
    // ID FAT: letters, digits, dot, dash, underscore, slash. Min 3 chars.
    regex: /^[A-Za-z0-9._\-/]{3,}$/,
    label: "ID FAT hanya boleh huruf, angka, dan . _ - / (min 3 karakter)",
  },
};

const DEBOUNCE_MS = 180;

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
  const [query, setQuery] = useState(value); // debounced query used for filtering
  const [touched, setTouched] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // ----- Debounce input -> query -----
  useEffect(() => {
    const t = setTimeout(() => setQuery(value), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [value]);

  // ----- Pre-index records once per records change (heavy work cached) -----
  const index = useMemo(() => {
    const seen = new Set<string>();
    const items: { rec: ExcelRecord; key: string; haystack: string }[] = [];
    for (const r of records) {
      const key = String(r[field] ?? "").trim();
      if (!key) continue;
      const k = key.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      const haystack = [r.customer, r.service, r.hostname, r.fat, r.sn]
        .map((x) => String(x ?? "").toLowerCase())
        .join(" | ");
      items.push({ rec: r, key: k, haystack });
    }
    return items;
  }, [records, field]);

  // ----- LRU-ish cache of filtered results per query -----
  const cacheRef = useRef<Map<string, ExcelRecord[]>>(new Map());
  useEffect(() => {
    // invalidate cache whenever the underlying index changes
    cacheRef.current.clear();
  }, [index]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const cache = cacheRef.current;
    if (cache.has(q)) return cache.get(q)!;
    const out: ExcelRecord[] = [];
    for (const it of index) {
      if (q && !it.haystack.includes(q)) continue;
      out.push(it.rec);
      if (out.length >= 50) break;
    }
    // bound cache size
    if (cache.size > 64) {
      const firstKey = cache.keys().next().value;
      if (firstKey !== undefined) cache.delete(firstKey);
    }
    cache.set(q, out);
    return out;
  }, [query, index]);

  // ----- Validation: format + must exist in Preview Data User -----
  const trimmed = value.trim();
  const formatOk = trimmed === "" ? true : FORMAT[field].regex.test(trimmed);
  const matchedRecord = useMemo(() => {
    if (!trimmed) return null;
    const t = trimmed.toLowerCase();
    return index.find((it) => it.key === t)?.rec ?? null;
  }, [trimmed, index]);
  const existsInData = !!matchedRecord;

  let errorMsg: string | null = null;
  if (touched && trimmed) {
    if (!formatOk) errorMsg = FORMAT[field].label;
    else if (!existsInData)
      errorMsg = `Tidak ditemukan di Preview Data User. Pilih ${
        field === "hostname" ? "Hostname OLT" : "ID FAT"
      } dari daftar.`;
  }

  // ----- Outside click closes dropdown -----
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    setActiveIdx(0);
  }, [query, open]);

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
    setTouched(true);
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

  const showValid = touched && trimmed && formatOk && existsInData;

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
          onBlur={() => setTouched(true)}
          onKeyDown={onKey}
          placeholder={placeholder}
          className={cn(
            "pl-8 pr-8",
            errorMsg && "border-destructive focus-visible:ring-destructive",
            showValid && "border-emerald-500/60 focus-visible:ring-emerald-500/40",
          )}
          autoComplete="off"
          aria-invalid={!!errorMsg}
        />
        {errorMsg && (
          <AlertCircle className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-destructive pointer-events-none" />
        )}
        {showValid && (
          <CheckCircle2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-emerald-500 pointer-events-none" />
        )}
      </div>

      {errorMsg && (
        <p className="mt-1 text-[11px] text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" /> {errorMsg}
        </p>
      )}
    </div>
  );
}
