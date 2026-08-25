import type { PositionStatus } from "@/lib/calc/position";

const STYLES: Record<PositionStatus, string> = {
  PLANNED: "border-dashed border-muted/50 text-muted",
  OPEN: "border-accent/50 bg-accent/10 text-accent",
  PARTIALLY_CLOSED: "border-dashed border-accent/50 bg-accent/5 text-accent",
  CLOSED: "border-border bg-surface text-text",
};

const LABELS: Record<PositionStatus, string> = {
  PLANNED: "PLANNED",
  OPEN: "OPEN",
  PARTIALLY_CLOSED: "PARTIALLY CLOSED",
  CLOSED: "CLOSED",
};

export function StatusPill({ status }: { status: PositionStatus }) {
  return (
    <span
      className={`inline-block rounded-sm border px-1.5 py-0.5 text-xs font-medium ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
