export type AppRoleName = "admin" | "noc" | "superior" | "reviewer" | "cs" | "intern";

export interface MenuDef {
  title: string;
  path: string;
  emoji: string;
}

/** Semua menu yang bisa diberikan aksesnya oleh Admin */
export const ALL_MENUS: MenuDef[] = [
  { title: "Dashboard", path: "/", emoji: "🖥️" },
  { title: "Incident Management", path: "/tickets", emoji: "🎫" },
  { title: "List Team", path: "/teams", emoji: "👥" },
  { title: "List AKV User", path: "/akv", emoji: "🗂️" },
  { title: "List FAT", path: "/fat", emoji: "📍" },
  { title: "List FDT", path: "/fdt", emoji: "📦" },
  { title: "List OLT", path: "/olt", emoji: "📟" },
  { title: "List UPE", path: "/upe", emoji: "🔗" },
  { title: "List BNG", path: "/bng", emoji: "🛰" },
  { title: "List Config", path: "/auto-config", emoji: "💻" },
  { title: "List Note NOC", path: "/notes", emoji: "📖" },
  { title: "Report", path: "/report", emoji: "📝" },
  { title: "Settings", path: "/settings", emoji: "🛠" },
];

const ALL_PATHS = ALL_MENUS.map((m) => m.path);

/** Akses default per role, dipakai kalau Admin belum melakukan kustomisasi */
export const ROLE_DEFAULT_PATHS: Record<AppRoleName, string[]> = {
  admin: ALL_PATHS,
  noc: ALL_PATHS,
  superior: ALL_PATHS.filter((p) => p !== "/notes"),
  reviewer: ["/", "/tickets", "/teams", "/akv", "/fat", "/fdt", "/olt", "/upe", "/bng", "/report", "/settings"],
  cs: ["/", "/tickets", "/teams", "/report", "/settings"],
  intern: ["/", "/tickets", "/teams", "/report", "/settings"],
};

export function getDefaultPaths(role: AppRoleName): string[] {
  return ROLE_DEFAULT_PATHS[role] ?? ROLE_DEFAULT_PATHS.noc;
}
