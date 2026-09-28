import { openDB } from "@/lib/indexedDB";

export type SearchCategory = "akv" | "fat" | "fdt" | "olt" | "upe" | "bng" | "team";

interface FieldDef { key: string; label: string; primary?: boolean }

export interface CategoryDef {
  id: SearchCategory;
  title: string;
  emoji: string;
  path: string;
  store: string;
  recordKey: string;
  fields: FieldDef[];
}

export const SEARCH_CATEGORIES: CategoryDef[] = [
  { id: "akv", title: "List AKV User", emoji: "🗂️", path: "/akv", store: "akv_data", recordKey: "akv_records",
    fields: [{ key: "serviceId", label: "Service ID", primary: true }, { key: "customer", label: "Customer", primary: true }, { key: "contact", label: "Contact" }, { key: "address", label: "Alamat" }, { key: "provinsi", label: "Provinsi" }, { key: "tikor", label: "Tikor" }] },
  { id: "fat", title: "List FAT", emoji: "📍", path: "/fat", store: "fat_data", recordKey: "fat_records",
    fields: [{ key: "fatId", label: "FAT ID", primary: true }, { key: "hostname", label: "Hostname", primary: true }, { key: "provinsi", label: "Provinsi" }, { key: "tikor", label: "Tikor" }] },
  { id: "fdt", title: "List FDT", emoji: "📦", path: "/fdt", store: "fdt_data", recordKey: "fdt_records",
    fields: [{ key: "idFDT", label: "ID FDT", primary: true }, { key: "area", label: "Area", primary: true }, { key: "provinsi", label: "Provinsi" }, { key: "tikor", label: "Tikor" }] },
  { id: "olt", title: "List OLT", emoji: "📟", path: "/olt", store: "olt_data", recordKey: "olt_records",
    fields: [{ key: "hostnameOlt", label: "Hostname OLT", primary: true }, { key: "idOlt", label: "ID OLT", primary: true }, { key: "ipNmsOlt", label: "IP NMS" }, { key: "hostnameUpe", label: "Hostname UPE" }, { key: "provinsi", label: "Provinsi" }, { key: "tikorOlt", label: "Tikor" }] },
  { id: "upe", title: "List UPE", emoji: "🔗", path: "/upe", store: "upe_data", recordKey: "upe_records",
    fields: [{ key: "hostnameUPE", label: "Hostname UPE", primary: true }, { key: "hostnameOLT", label: "Hostname OLT", primary: true }] },
  { id: "bng", title: "List BNG", emoji: "🛰", path: "/bng", store: "bng_data", recordKey: "bng_records",
    fields: [{ key: "hostnameBng", label: "Hostname BNG", primary: true }, { key: "ipBng", label: "IP BNG", primary: true }, { key: "hostnameOlt", label: "Hostname OLT" }, { key: "upe", label: "UPE" }, { key: "portUpe", label: "Port UPE" }, { key: "npe", label: "NPE" }, { key: "vlan", label: "VLAN" }, { key: "hostnameRadius", label: "Hostname Radius" }, { key: "ipRadius", label: "IP Radius" }, { key: "kotaKabupaten", label: "Kota/Kab" }] },
  { id: "team", title: "Team", emoji: "👥", path: "/teams", store: "regional_team_data", recordKey: "regional_team_records",
    fields: [{ key: "serpoName", label: "Nama Team", primary: true }, { key: "mitraName", label: "Mitra", primary: true }, { key: "teamMember", label: "Anggota", primary: true }, { key: "region", label: "Region" }, { key: "serpoType", label: "Tipe" }, { key: "hostnames", label: "Hostname" }] },
];

type Rec = Record<string, unknown>;
let cache: Partial<Record<SearchCategory, Rec[]>> | null = null;

/** Muat ulang semua data list dari IndexedDB (dipanggil saat dialog dibuka). */
export async function loadSearchData(): Promise<void> {
  const db = await openDB().catch(() => null);
  const next: Partial<Record<SearchCategory, Rec[]>> = {};
  await Promise.all(SEARCH_CATEGORIES.map((c) => new Promise<void>((resolve) => {
    if (!db || !db.objectStoreNames.contains(c.store)) { next[c.id] = []; return resolve(); }
    try {
      const req = db.transaction([c.store], "readonly").objectStore(c.store).get(c.recordKey);
      req.onsuccess = () => { next[c.id] = Array.isArray(req.result) ? req.result : []; resolve(); };
      req.onerror = () => { next[c.id] = []; resolve(); };
    } catch { next[c.id] = []; resolve(); }
  })));
  cache = next;
}

export interface SearchHit {
  id: string;
  title: string;
  subtitle: string;
  matchLabel: string;
  matchValue: string;
  jumpValue: string;
  score: number;
}

export interface CategoryResult { category: CategoryDef; total: number; hits: SearchHit[] }

export function searchAll(term: string, allowed: string[], limit = 5): CategoryResult[] {
  const q = term.trim().toLowerCase();
  if (!cache || q.length < 2) return [];
  const out: CategoryResult[] = [];
  for (const c of SEARCH_CATEGORIES) {
    if (!allowed.includes(c.path)) continue;
    const rows = cache[c.id] ?? [];
    const scored: SearchHit[] = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      let best = 0; let bestField: FieldDef | null = null; let bestVal = "";
      for (const f of c.fields) {
        const v = r[f.key] == null ? "" : String(r[f.key]);
        if (!v) continue;
        const lv = v.toLowerCase();
        const idx = lv.indexOf(q);
        if (idx < 0) continue;
        let s = lv === q ? 100 : idx === 0 ? 60 : 30;
        if (f.primary) s += 10;
        if (s > best) { best = s; bestField = f; bestVal = v; }
      }
      if (!bestField) continue;
      const p = c.fields.filter((f) => f.primary);
      const title = String(r[p[0].key] ?? "") || bestVal;
      scored.push({
        id: String(r.id ?? `${c.id}-${i}`),
        title,
        subtitle: [p[1] && r[p[1].key], r.provinsi].filter(Boolean).map(String).join(" · "),
        matchLabel: bestField.label,
        matchValue: bestVal,
        jumpValue: bestVal,
        score: best,
      });
    }
    if (!scored.length) continue;
    scored.sort((a, b) => b.score - a.score);
    out.push({ category: c, total: scored.length, hits: scored.slice(0, limit) });
  }
  return out.sort((a, b) => (b.hits[0]?.score ?? 0) - (a.hits[0]?.score ?? 0));
}
