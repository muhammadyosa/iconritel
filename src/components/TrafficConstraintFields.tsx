import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TrafficDetails } from "@/types/ticket";

interface Props {
  constraint: string;
  value: TrafficDetails;
  onChange: (value: TrafficDetails) => void;
}

export function TrafficConstraintFields({ constraint, value, onChange }: Props) {
  if (constraint !== "FULL TRAFFIC" && constraint !== "FULL TRAFFIC SEGMENT") return null;
  const segment = constraint === "FULL TRAFFIC SEGMENT";
  const fields: { key: keyof TrafficDetails; label: string; placeholder: string }[] = [
    { key: "destination", label: segment ? "Hostname NPE Tujuan" : "Hostname OLT/UPE Tujuan", placeholder: segment ? "Hostname NPE" : "Hostname OLT/UPE" },
    ...(segment ? [
      { key: "impactHostname" as const, label: "Hostname UPE Impact", placeholder: "Hostname UPE terdampak" },
      { key: "impactPort" as const, label: "Port Impact", placeholder: "TE0 0 2" },
      { key: "linkHostname" as const, label: "Hostname UPE Link Tujuan", placeholder: "Hostname UPE link tujuan" },
    ] : []),
  ];
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    {fields.map(({ key, label, placeholder }) => <Label key={key} className="min-w-0 space-y-1">
      <span>{label}</span>
      <Input aria-label={label} value={value[key]} placeholder={placeholder} onChange={(event) => onChange({ ...value, [key]: event.target.value })} />
    </Label>)}
  </div>;
}