import { useState, useRef, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface SerpoComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
}

/**
 * Searchable combobox for Serpo / Tim manual entry.
 * - Filters suggestions as the user types
 * - Allows free-text input (not restricted to options)
 * - Keyboard navigation: ArrowUp/Down, Enter to select, Esc to close
 */
export function SerpoCombobox({
  value,
  onChange,
  options,
  placeholder = "Ketik / cari nama Serpo / Tim",
}: SerpoComboboxProps) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    const uniq = [...new Set(options)].sort();
    if (!q) return uniq.slice(0, 50);
    return uniq.filter((o) => o.toLowerCase().includes(q)).slice(0, 50);
  }, [value, options]);

  // Close on outside click
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

  // Scroll active item into view
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx, open]);

  const select = (val: string) => {
    onChange(val);
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

  // Highlight match
  const renderLabel = (label: string) => {
    const q = value.trim();
    if (!q) return label;
    const idx = label.toLowerCase().indexOf(q.toLowerCase());
    if (idx < 0) return label;
    return (
      <>
        {label.slice(0, idx)}
        <span className="bg-primary/30 text-foreground rounded-sm">
          {label.slice(idx, idx + q.length)}
        </span>
        {label.slice(idx + q.length)}
      </>
    );
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
          className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-md border border-border bg-popover text-popover-foreground shadow-lg"
        >
          <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground border-b border-border/60">
            {filtered.length} saran
          </div>
          {filtered.map((opt, i) => {
            const isActive = i === activeIdx;
            const isSelected = opt === value;
            return (
              <button
                key={opt}
                type="button"
                data-idx={i}
                onMouseEnter={() => setActiveIdx(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  select(opt);
                }}
                className={cn(
                  "w-full text-left px-2.5 py-1.5 text-sm flex items-center justify-between gap-2 transition-colors",
                  isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/60",
                )}
              >
                <span className="truncate">{renderLabel(opt)}</span>
                {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
      {open && filtered.length === 0 && value.trim() && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover px-3 py-2 text-xs text-muted-foreground shadow-lg">
          Tidak ada saran. Tekan Enter untuk gunakan "{value.trim()}".
        </div>
      )}
    </div>
  );
}
