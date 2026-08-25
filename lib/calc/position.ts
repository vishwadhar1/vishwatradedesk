import Decimal from "decimal.js";
import { fifoCostBasis, safeDivide, type TransactionInput } from "./fifo";

export type { TransactionInput };

export type PositionStatus = "PLANNED" | "OPEN" | "PARTIALLY_CLOSED" | "CLOSED";

export type PositionInput = {
  direction: "LONG" | "SHORT";
  positionType?: "SWING" | "INVESTMENT" | "POSITIONAL";
  plannedEntry: number | string;
  initialStopLoss: number | string;
  targetPrice?: number | string | null;
  plannedQty: number;
  currentPrice?: number | string | null;
  previousClose?: number | string | null;
  playbookId?: string | null;
  rulesFollowed?: Record<string, boolean> | null;
};

export type ComputedPosition = {
  status: PositionStatus;
  openQty: number;
  avgBuyPrice: number | null;
  avgCostBasis: number | null;
  investedValue: number | null;
  currentValue: number | null;
  unrealizedGross: number | null;
  unrealizedNet: number | null;
  realizedNet: number;
  netPnl: number;
  /** Fraction (0.0735, not 7.35) — pair with formatPct for display. */
  netPnlPct: number | null;
  todayPnl: number | null;
  totalCharges: number;
  totalQtyBought: number;
  totalQtySold: number;
  avgSellPrice: number | null;
  entryDate: string | null;
  exitDate: string | null;
  holdingDays: number | null;
  riskPerShare: number;
  plannedRisk: number;
  plannedRR: number | null;
  realizedR: number | null;
  openR: number | null;
  /** Fraction (0.833, not 83.3) — null when there's no playbook. */
  adherence: number | null;
};

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

/** V1 is long-only — every position-level calculation funnels through here so a SHORT position always fails loudly instead of silently computing the wrong sign. */
function riskPerShare(position: PositionInput): Decimal {
  if (position.direction === "SHORT") {
    throw new Error(
      "computePosition does not support SHORT positions — V1 is long-only, and silently wrong P&L is worse than a loud failure.",
    );
  }
  return new Decimal(position.plannedEntry).minus(position.initialStopLoss);
}

function computeAdherence(position: PositionInput): number | null {
  if (!position.playbookId || !position.rulesFollowed) return null;
  const values = Object.values(position.rulesFollowed);
  if (values.length === 0) return null;
  return safeDivide(values.filter(Boolean).length, values.length);
}

export function computePosition(
  position: PositionInput,
  transactions: TransactionInput[],
): ComputedPosition {
  const risk = riskPerShare(position);
  const fifo = fifoCostBasis(transactions);
  const openQty = fifo.remainingQty;

  const status: PositionStatus =
    transactions.length === 0
      ? "PLANNED"
      : openQty === 0
        ? "CLOSED"
        : fifo.totalQtySold > 0
          ? "PARTIALLY_CLOSED"
          : "OPEN";

  const { currentPrice, previousClose } = position;

  const currentValue =
    currentPrice == null || openQty === 0
      ? null
      : new Decimal(currentPrice).times(openQty).toNumber();

  const unrealizedGross =
    currentPrice == null || openQty === 0 || fifo.avgBuyPrice === null
      ? null
      : new Decimal(currentPrice)
          .minus(fifo.avgBuyPrice)
          .times(openQty)
          .toNumber();

  const unrealizedNet =
    currentPrice == null || openQty === 0 || fifo.avgCostBasis === null
      ? null
      : new Decimal(currentPrice)
          .minus(fifo.avgCostBasis)
          .times(openQty)
          .toNumber();

  const realizedNet = fifo.realizedPnl;
  const netPnl = realizedNet + (unrealizedNet ?? 0);
  const netPnlPct = safeDivide(netPnl, fifo.totalBuyCost);

  const todayPnl =
    previousClose == null || currentPrice == null || openQty === 0
      ? null
      : new Decimal(currentPrice)
          .minus(previousClose)
          .times(openQty)
          .toNumber();

  const exitDate = status === "CLOSED" ? fifo.exitDate : null;
  const holdingDays =
    fifo.entryDate === null
      ? null
      : daysBetween(fifo.entryDate, exitDate ?? todayIso());

  const plannedRisk = risk.times(position.plannedQty).toNumber();
  const plannedRR =
    position.targetPrice == null
      ? null
      : safeDivide(
          new Decimal(position.targetPrice).minus(position.plannedEntry),
          risk,
        );

  const realizedR =
    fifo.totalQtySold === 0
      ? null
      : safeDivide(realizedNet, risk.times(fifo.totalQtySold));
  const openR =
    openQty === 0 || unrealizedNet === null
      ? null
      : safeDivide(unrealizedNet, risk.times(openQty));

  return {
    status,
    openQty,
    avgBuyPrice: fifo.avgBuyPrice,
    avgCostBasis: fifo.avgCostBasis,
    investedValue: fifo.investedValue,
    currentValue,
    unrealizedGross,
    unrealizedNet,
    realizedNet,
    netPnl,
    netPnlPct,
    todayPnl,
    totalCharges: fifo.totalCharges,
    totalQtyBought: fifo.totalQtyBought,
    totalQtySold: fifo.totalQtySold,
    avgSellPrice: fifo.avgSellPrice,
    entryDate: fifo.entryDate,
    exitDate,
    holdingDays,
    riskPerShare: risk.toNumber(),
    plannedRisk,
    plannedRR,
    realizedR,
    openR,
    adherence: computeAdherence(position),
  };
}

/** Thin convenience wrapper — same value as computePosition(...).realizedR. */
export function realizedR(
  position: PositionInput,
  transactions: TransactionInput[],
): number | null {
  return computePosition(position, transactions).realizedR;
}

/** Thin convenience wrapper — same value as computePosition(...).openR. */
export function openR(
  position: PositionInput,
  transactions: TransactionInput[],
): number | null {
  return computePosition(position, transactions).openR;
}
