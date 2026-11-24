import { cn } from "@/lib/utils";
import { STATUS_STYLE, type EvidenStatus } from "@/lib/eviden";

export function StatusBadge({ status }: { status: EvidenStatus }) {
  return <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap", STATUS_STYLE[status])}>{status}</span>;
}
