import { formatINR } from "@/lib/calc/format";

export function Money({
  value,
  compact,
}: {
  value: number | string | null;
  compact?: boolean;
}) {
  if (value === null) return <span className="text-muted">—</span>;
  return <span className="tabular-nums">{formatINR(value, { compact })}</span>;
}
