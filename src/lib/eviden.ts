import { toLocalDateStr } from "@/lib/dateUtils";

export const EVIDEN_STATUSES = ["SENT", "OPENED", "IN PROGRESS", "ANSWERED", "REVISION REQUESTED", "CLOSED"] as const;
export type EvidenStatus = (typeof EVIDEN_STATUSES)[number];
export type ViewerKind = "admin" | "sender" | "recipient";

export const EVIDEN_BUCKET = "eviden-noc";
export const EVIDEN_MAX_BYTES = 5 * 1024 * 1024;
export const EVIDEN_MIME = ["image/jpeg", "image/png", "image/webp"];
export const EVIDEN_ACCEPT = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";

/** Status yang masih menunggu jawaban penerima. */
export const PENDING_STATUSES: EvidenStatus[] = ["SENT", "OPENED", "IN PROGRESS", "REVISION REQUESTED"];

export interface EvidenListRow {
  id: string;
  code: string;
  status: EvidenStatus;
  viewer_kind: ViewerKind;
  sender_name: string;
  recipient_user_id: string;
  recipient_name: string | null;
  recipient_team: string | null;
  customer_information: string;
  problem: string;
  created_at: string;
  sent_at: string | null;
  opened_at: string | null;
  answered_at: string | null;
  closed_at: string | null;
  answer_count: number;
}

export interface EvidenAttachment {
  id: string;
  answer_id: string | null;
  attachment_type: "initial" | "answer";
  file_path: string;
  file_name: string | null;
  mime_type: string;
  file_size: number;
  created_at: string;
}
export interface EvidenAnswer { id: string; revision_number: number; reason: string; submitted_by_name: string | null; created_at: string }
export interface EvidenLog { id: string; action: string; from_status: string | null; to_status: string | null; note: string | null; actor_kind: string; actor_name: string | null; created_at: string }
export interface EvidenDetail extends Omit<EvidenListRow, "answer_count" | "recipient_user_id"> {
  is_recipient: boolean;
  is_sender: boolean;
  answers: EvidenAnswer[];
  attachments: EvidenAttachment[];
  logs: EvidenLog[];
}

export function validateEvidenFile(file: { type: string; size: number; name: string }): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!EVIDEN_MIME.includes(file.type) || !["jpg", "jpeg", "png", "webp"].includes(ext)) return `${file.name}: format harus JPG, JPEG, PNG, atau WEBP`;
  if (file.size > EVIDEN_MAX_BYTES) return `${file.name}: ukuran maksimal 5 MB`;
  return null;
}

/** Nama pengirim yang boleh ditampilkan: penerima selalu melihat ANONYMOUS. */
export function visibleSenderName(viewer: ViewerKind, realName: string | null | undefined): string {
  return viewer === "recipient" ? "ANONYMOUS" : realName || "-";
}

export function responseMinutes(r: Pick<EvidenListRow, "sent_at" | "answered_at">): number | null {
  if (!r.sent_at || !r.answered_at) return null;
  return Math.max(0, Math.round((new Date(r.answered_at).getTime() - new Date(r.sent_at).getTime()) / 60000));
}

export function formatMinutes(m: number | null): string {
  if (m == null) return "-";
  if (m < 60) return `${m} mnt`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam ${m % 60} mnt`;
  return `${Math.floor(h / 24)} hari ${h % 24} jam`;
}

export function evidenStats(rows: EvidenListRow[]) {
  const byStatus = Object.fromEntries(EVIDEN_STATUSES.map((s) => [s, 0])) as Record<EvidenStatus, number>;
  rows.forEach((r) => { if (r.status in byStatus) byStatus[r.status]++; });
  const pending = rows.filter((r) => PENDING_STATUSES.includes(r.status)).length;
  const times = rows.map(responseMinutes).filter((x): x is number => x != null);
  const avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null;

  const team = new Map<string, number>();
  const user = new Map<string, number>();
  const trend = new Map<string, number>();
  rows.forEach((r) => {
    team.set(r.recipient_team || "-", (team.get(r.recipient_team || "-") ?? 0) + 1);
    user.set(r.recipient_name || "-", (user.get(r.recipient_name || "-") ?? 0) + 1);
    const d = toLocalDateStr(new Date(r.sent_at ?? r.created_at));
    trend.set(d, (trend.get(d) ?? 0) + 1);
  });
  const sortDesc = (m: Map<string, number>) => [...m.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  return {
    total: rows.length,
    byStatus,
    pending,
    avgResponseMinutes: avg,
    byTeam: sortDesc(team),
    topUsers: sortDesc(user).slice(0, 5),
    trend: [...trend.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count })),
  };
}

export const STATUS_STYLE: Record<EvidenStatus, string> = {
  SENT: "bg-primary/10 text-primary border-primary/30",
  OPENED: "bg-accent text-accent-foreground border-border",
  "IN PROGRESS": "bg-warning/15 text-warning border-warning/30",
  ANSWERED: "bg-success/15 text-success border-success/30",
  "REVISION REQUESTED": "bg-destructive/10 text-destructive border-destructive/30",
  CLOSED: "bg-muted text-muted-foreground border-border",
};
