import { formatR } from "@/lib/calc/format";

export function R({
  value,
  decimals = 2,
}: {
  value: number | null;
  decimals?: number;
}) {
  if (value === null) return <span className="text-muted">—</span>;

  const tone =
    value === 0 ? "text-muted" : value > 0 ? "text-profit" : "text-loss";

  return (
    <span className={`tabular-nums ${tone}`}>{formatR(value, decimals)}</span>
  );
}
