"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { PnL } from "@/components/PnL";
import { R } from "@/components/R";
import { StatusPill } from "@/components/StatusPill";
import { formatHolding } from "@/lib/calc/format";
import type { ComputedPosition, PositionStatus } from "@/lib/calc/position";

export type JournalRow = {
  id: string;
  symbol: string;
  companyName: string;
  positionType: "SWING" | "INVESTMENT" | "POSITIONAL";
  computed: ComputedPosition | null;
  lastActivityDate: string;
};

const STATUS_FILTERS: { label: string; value: PositionStatus | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Planned", value: "PLANNED" },
  { label: "Open", value: "OPEN" },
  { label: "Partially closed", value: "PARTIALLY_CLOSED" },
  { label: "Closed", value: "CLOSED" },
];

// realizedR when something's actually settled, else the live openR estimate —
// not a new calc metric, just which of the two existing ones is most concrete.
function currentR(computed: ComputedPosition | null): number | null {
  if (!computed) return null;
  return computed.realizedR ?? computed.openR;
}

export function JournalList({ rows }: { rows: JournalRow[] }) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<PositionStatus | "ALL">(
    "ALL",
  );

  const filteredRows = useMemo(
    () =>
      statusFilter === "ALL"
        ? rows
        : rows.filter((r) => r.computed?.status === statusFilter),
    [rows, statusFilter],
  );

  const columns: DataTableColumn<JournalRow>[] = [
    {
      key: "symbol",
      header: "Symbol",
      render: (row) => (
        <div>
          <div className="text-text">{row.symbol}</div>
          <div className="text-muted text-xs">{row.companyName}</div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) =>
        row.computed ? (
          <StatusPill status={row.computed.status} />
        ) : (
          <span className="text-muted text-xs">—</span>
        ),
    },
    {
      key: "type",
      header: "Type",
      render: (row) => <span className="text-muted">{row.positionType}</span>,
    },
    {
      key: "netPnl",
      header: "Net P&L",
      numeric: true,
      sortable: true,
      sortAccessor: (row) => row.computed?.netPnl ?? 0,
      render: (row) => <PnL value={row.computed?.netPnl ?? null} />,
    },
    {
      key: "r",
      header: "R",
      numeric: true,
      sortable: true,
      sortAccessor: (row) => currentR(row.computed) ?? 0,
      render: (row) => <R value={currentR(row.computed)} />,
    },
    {
      key: "holding",
      header: "Held",
      numeric: true,
      sortable: true,
      sortAccessor: (row) => row.computed?.holdingDays ?? 0,
      render: (row) =>
        row.computed?.holdingDays == null ? (
          <span className="text-muted">—</span>
        ) : (
          formatHolding(row.computed.holdingDays)
        ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setStatusFilter(f.value)}
            className={`rounded-sm border px-2 py-1 text-xs transition-colors duration-[120ms] ${
              statusFilter === f.value
                ? "border-accent text-accent bg-accent/10"
                : "border-border text-muted hover:text-text"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <DataTable
        columns={columns}
        rows={filteredRows}
        rowKey={(row) => row.id}
        onRowClick={(row) => router.push(`/journal/${row.id}`)}
      />
    </div>
  );
}
