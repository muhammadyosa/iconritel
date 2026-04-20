import { memo } from "react";

interface HighlightTextProps {
  text: string | number | null | undefined;
  query: string;
  enabled?: boolean;
  className?: string;
}

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Renders text with matched query substrings highlighted (bold + warna).
 * Uses semantic warning token for theming consistency.
 */
export const HighlightText = memo(function HighlightText({
  text,
  query,
  enabled = true,
  className,
}: HighlightTextProps) {
  const value = text == null ? "" : String(text);
  const q = query.trim();

  if (!enabled || !q || !value) {
    return <span className={className}>{value}</span>;
  }

  const lowerQ = q.toLowerCase();
  const regex = new RegExp(`(${escapeRegex(q)})`, "ig");
  const parts = value.split(regex);

  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.toLowerCase() === lowerQ ? (
          <mark
            key={i}
            className="bg-warning/40 text-foreground font-bold rounded-sm px-0.5"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
});
