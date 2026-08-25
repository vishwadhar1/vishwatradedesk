"use client";

import { notFound } from "next/navigation";
import { useState } from "react";
import { AdherenceBar } from "@/components/AdherenceBar";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { Field } from "@/components/Field";
import { GradePill } from "@/components/GradePill";
import { Money } from "@/components/Money";
import { Percent } from "@/components/Percent";
import { PnL } from "@/components/PnL";
import { Section } from "@/components/Section";
import { StalenessDot } from "@/components/StalenessDot";
import { StatusPill } from "@/components/StatusPill";
import { TagChip } from "@/components/TagChip";
import { formatHolding } from "@/lib/calc/format";
import type { PositionStatus } from "@/lib/calc/position";

type DemoRow = {
  symbol: string;
  company: string;
  qty: number;
  avgBuy: number;
  cmp: number;
  invested: number;
  current: number;
  pnl: number;
  pnlPct: number;
  status: PositionStatus;
};

const DEMO_ROWS: DemoRow[] = [
  {
    symbol: "RELIANCE",
    company: "Reliance Industries",
    qty: 100,
    avgBuy: 2475.0,
    cmp: 2650,
    invested: 247500,
    current: 265000,
    pnl: 9940,
    pnlPct: 0.0402,
    status: "PARTIALLY_CLOSED",
  },
  {
    symbol: "HDFCBANK",
    company: "HDFC Bank",
    qty: 200,
    avgBuy: 1660.0,
    cmp: 1640,
    invested: 332000,
    current: 328000,
    pnl: -3210,
    pnlPct: -0.0097,
    status: "OPEN",
  },
  {
    symbol: "INFY",
    company: "Infosys",
    qty: 300,
    avgBuy: 1510.0,
    cmp: 1580,
    invested: 453000,
    current: 474000,
    pnl: 21000,
    pnlPct: 0.0464,
    status: "OPEN",
  },
  {
    symbol: "LT",
    company: "Larsen & Toubro",
    qty: 0,
    avgBuy: 3560.0,
    cmp: 3720,
    invested: 0,
    current: 0,
    pnl: 12800,
    pnlPct: 0.036,
    status: "CLOSED",
  },
];

const DEMO_COLUMNS: DataTableColumn<DemoRow>[] = [
  {
    key: "symbol",
    header: "Symbol",
    render: (row) => (
      <div>
        <div className="text-text">{row.symbol}</div>
        <div className="text-muted text-xs">{row.company}</div>
      </div>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (row) => <StatusPill status={row.status} />,
  },
  {
    key: "qty",
    header: "Qty",
    numeric: true,
    sortable: true,
    sortAccessor: (row) => row.qty,
    render: (row) => row.qty,
  },
  {
    key: "avgBuy",
    header: "Avg Buy",
    numeric: true,
    sortable: true,
    sortAccessor: (row) => row.avgBuy,
    render: (row) => <Money value={row.avgBuy} />,
  },
  {
    key: "cmp",
    header: "CMP",
    numeric: true,
    sortable: true,
    sortAccessor: (row) => row.cmp,
    render: (row) => <Money value={row.cmp} />,
  },
  {
    key: "invested",
    header: "Invested",
    numeric: true,
    sortable: true,
    sortAccessor: (row) => row.invested,
    render: (row) => <Money value={row.invested} />,
  },
  {
    key: "current",
    header: "Current",
    numeric: true,
    sortable: true,
    sortAccessor: (row) => row.current,
    render: (row) => <Money value={row.current} />,
  },
  {
    key: "pnl",
    header: "P&L",
    numeric: true,
    sortable: true,
    sortAccessor: (row) => row.pnl,
    render: (row) => <PnL value={row.pnl} />,
  },
  {
    key: "pnlPct",
    header: "P&L %",
    numeric: true,
    sortable: true,
    sortAccessor: (row) => row.pnlPct,
    render: (row) => <Percent value={row.pnlPct} />,
  },
];

export default function DevUiPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const [tags, setTags] = useState([
    "earnings",
    "added-early",
    "high-conviction",
  ]);

  return (
    <div className="flex flex-col">
      <Section id="money" title="Money">
        <div className="flex flex-wrap items-center gap-4">
          <Money value={247500} />
          <Money value={12400000} compact />
          <Money value={248000} compact />
          <Money value={null} />
        </div>
      </Section>

      <Section id="pnl" title="PnL">
        <div className="flex flex-wrap items-center gap-4">
          <PnL value={9940} />
          <PnL value={-3210} />
          <PnL value={0} />
          <PnL value={null} />
        </div>
      </Section>

      <Section id="percent" title="Percent">
        <div className="flex flex-wrap items-center gap-4">
          <Percent value={0.0402} />
          <Percent value={0.833} decimals={1} />
          <Percent value={null} />
        </div>
      </Section>

      <Section id="status-pill" title="StatusPill">
        <div className="flex flex-wrap items-center gap-3">
          <StatusPill status="PLANNED" />
          <StatusPill status="OPEN" />
          <StatusPill status="PARTIALLY_CLOSED" />
          <StatusPill status="CLOSED" />
        </div>
      </Section>

      <Section id="grade-pill" title="GradePill">
        <div className="flex flex-wrap items-center gap-3">
          <GradePill grade="A" />
          <GradePill grade="B+" />
          <GradePill grade="C" />
          <GradePill grade="D" />
          <GradePill grade="F" />
          <GradePill grade={null} />
        </div>
      </Section>

      <Section id="tag-chip" title="TagChip">
        <div className="flex flex-wrap items-center gap-2">
          {tags.map((tag) => (
            <TagChip
              key={tag}
              label={tag}
              onRemove={() => setTags((prev) => prev.filter((t) => t !== tag))}
            />
          ))}
          <TagChip label="read-only" />
        </div>
      </Section>

      <Section id="adherence-bar" title="AdherenceBar">
        <div className="flex flex-wrap items-center gap-4">
          <AdherenceBar followed={5} total={6} />
          <AdherenceBar followed={6} total={6} />
          <AdherenceBar followed={null} total={null} />
        </div>
      </Section>

      <Section id="staleness-dot" title="StalenessDot">
        <div className="text-muted flex flex-wrap items-center gap-4 text-xs">
          <span className="inline-flex items-center gap-1.5">
            <StalenessDot timestamp={new Date(Date.now() - 2 * 60_000)} /> 2m
            ago
          </span>
          <span className="inline-flex items-center gap-1.5">
            <StalenessDot timestamp={new Date(Date.now() - 40 * 60_000)} /> 40m
            ago
          </span>
          <span className="inline-flex items-center gap-1.5">
            <StalenessDot timestamp={new Date(Date.now() - 3 * 60 * 60_000)} />{" "}
            3h ago
          </span>
          <span className="inline-flex items-center gap-1.5">
            <StalenessDot timestamp={null} /> never
          </span>
        </div>
      </Section>

      <Section id="field" title="Field">
        <div className="max-w-xs">
          <Field
            label="Symbol"
            htmlFor="demo-symbol"
            helper="Uppercase, e.g. RELIANCE"
          >
            <input
              id="demo-symbol"
              defaultValue="RELIANCE"
              className="border-border bg-surface text-text focus:border-accent w-full border px-2 py-1.5 text-sm outline-none"
            />
          </Field>
        </div>
      </Section>

      <Section id="data-table" title="DataTable">
        <DataTable
          columns={DEMO_COLUMNS}
          rows={DEMO_ROWS}
          rowKey={(row) => row.symbol}
          onRowClick={() => {}}
          renderExpanded={(row) => (
            <div className="text-muted text-xs">
              {row.symbol} · held {formatHolding(24)} · adherence{" "}
              <AdherenceBar followed={5} total={6} />
            </div>
          )}
          footer={{
            symbol: <span className="text-muted">Total</span>,
            invested: (
              <Money value={DEMO_ROWS.reduce((s, r) => s + r.invested, 0)} />
            ),
            current: (
              <Money value={DEMO_ROWS.reduce((s, r) => s + r.current, 0)} />
            ),
            pnl: <PnL value={DEMO_ROWS.reduce((s, r) => s + r.pnl, 0)} />,
          }}
        />
      </Section>

      <Section id="empty-state" title="EmptyState">
        <div className="border-border border">
          <EmptyState
            message="No positions yet."
            actionLabel="+ New Position"
            href="/journal/new"
          />
        </div>
      </Section>
    </div>
  );
}
