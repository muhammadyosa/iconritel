import type { AppRoleName } from "@/lib/menuAccess";

/** Sub-tab yang boleh diakses per role. "*" = Full Akses. */
type TabMap = Record<AppRoleName, string[] | "*">;

export const TICKET_TABS: TabMap = {
  admin: "*",
  noc: "*",
  superior: "*",
  reviewer: ["daftar-ticket", "over-sla"],
  cs: ["daftar-ticket", "over-sla"],
  intern: ["daftar-ticket"],
};

export const TEAM_TABS: TabMap = {
  admin: "*",
  noc: "*",
  superior: "*",
  reviewer: ["team-stats", "regional-office"],
  cs: ["team-stats", "regional-office"],
  intern: ["team-stats", "regional-office"],
};

export const REPORT_TABS: TabMap = {
  admin: "*",
  noc: "*",
  superior: ["shift", "pending", "reporting-gangguan"],
  reviewer: ["shift", "reporting-gangguan"],
  cs: ["shift", "reporting-gangguan"],
  intern: ["shift", "sla", "reporting-gangguan"],
};

export const SETTINGS_TABS: TabMap = {
  admin: "*",
  noc: ["import", "history", "info"],
  superior: ["import", "history", "info"],
  reviewer: ["import", "history", "info"],
  cs: ["import", "history", "info"],
  intern: ["import", "info"],
};

export function canSeeTab(map: TabMap, role: AppRoleName, tab: string): boolean {
  const allowed = map[role] ?? map.noc;
  return allowed === "*" || allowed.includes(tab);
}

export function firstAllowedTab(map: TabMap, role: AppRoleName, order: string[]): string {
  return order.find((t) => canSeeTab(map, role, t)) ?? order[0];
}

/** Reviewer: Settings hanya lihat (View Only) */
export function isSettingsViewOnly(role: AppRoleName): boolean {
  return role === "reviewer";
}
