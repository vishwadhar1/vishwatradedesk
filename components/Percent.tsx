import { formatPct } from "@/lib/calc/format";

export function Percent({
  value,
  decimals = 2,
}: {
  value: number | string | null;
  decimals?: number;
}) {
  if (value === null) return <span className="text-muted">—</span>;
  return (
    <span className="tabular-nums">{formatPct(Number(value), decimals)}</span>
  );
}
