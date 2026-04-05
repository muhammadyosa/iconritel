import { useState, useEffect } from "react";

function formatDuration(ms: number): string {
  if (ms < 0) ms = 0;
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} HARI`);
  if (hours > 0) parts.push(`${hours} JAM`);
  parts.push(`${minutes} MENIT`);

  return parts.join(" ");
}

interface DurationCellProps {
  createdISO: string;
  status: string;
  resolvedAt?: string;
}

export function DurationCell({ createdISO, status, resolvedAt }: DurationCellProps) {
  const [now, setNow] = useState(Date.now());

  const isFinished = status === "Resolved" || status === "Pending";

  useEffect(() => {
    if (isFinished) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isFinished]);

  const startTime = new Date(createdISO).getTime();
  const endTime = isFinished && resolvedAt ? new Date(resolvedAt).getTime() : now;
  const elapsed = endTime - startTime;

  const SLA_MS = 8 * 60 * 60 * 1000;
  const isOverSLA = elapsed >= SLA_MS;

  return (
    <span
      className={`text-[9px] sm:text-[10px] font-mono whitespace-nowrap ${
        isFinished
          ? "text-muted-foreground"
          : isOverSLA
          ? "text-destructive font-semibold"
          : "text-foreground"
      }`}
    >
      {formatDuration(elapsed)}
    </span>
  );
}
