import { formatSignedINR } from "@/lib/calc/format";

export function PnL({
  value,
  compact,
}: {
  value: number | string | null;
  compact?: boolean;
}) {
  if (value === null) return <span className="text-muted">—</span>;

  const numeric = Number(value);
  // Colour is never the only signal — the sign is always in the text, and
  // an arrow shape rides alongside it, for red-green colour vision.
  const tone =
    numeric === 0 ? "text-muted" : numeric > 0 ? "text-profit" : "text-loss";
  const arrow = numeric === 0 ? null : numeric > 0 ? "▲" : "▼";

  return (
    <span className={`inline-flex items-center gap-1 tabular-nums ${tone}`}>
      {arrow && <span aria-hidden="true">{arrow}</span>}
      {formatSignedINR(value, { compact })}
    </span>
  );
}
