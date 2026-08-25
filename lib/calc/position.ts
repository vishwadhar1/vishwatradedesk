import Decimal from "decimal.js";
import { fifoCostBasis, safeDivide, type TransactionInput } from "./fifo";

export type { TransactionInput };

export type PositionStatus = "PLANNED" | "OPEN" | "PARTIALLY_CLOSED" | "CLOSED";

/** One playbook rule as it read at the moment the position was scored. */
export type RuleSnapshot = { id: string; text: string; followed: boolean };

/** Pre-0002 shape: answers keyed by rule id, with no snapshotted rule text. */
export type LegacyRulesFollowed = Record<string, boolean>;

export type PositionInput = {
  direction: "LONG" | "SHORT";
  positionType?: "SWING" | "INVESTMENT" | "POSITIONAL";
  /** Null when the plan hasn't been filled in yet — a bare symbol+direction position. */
  plannedEntry: number | string | null;
  initialStopLoss: number | string | null;
  targetPrice?: number | string | null;
  plannedQty: number | null;
  currentPrice?: number | string | null;
  previousClose?: number | string | null;
  playbookId?: string | null;
  /**
   * The scoring snapshot. New code must only ever write `RuleSnapshot[]`; the
   * legacy arm exists because this value arrives from a `jsonb` column, where
   * `$type<>()` is erased at compile time — a row written before migration
   * 0002 still holds `Record<ruleId, boolean>` and TypeScript cannot see the
   * difference. Spelling the union out keeps writers type-checked (unlike
   * `unknown`) while forcing every reader through `readRuleSnapshot`.
   */
  rulesFollowed?: RuleSnapshot[] | LegacyRulesFollowed | null;
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
  /** Null when there's no plan yet (planned_entry or initial_stop_loss unset). */
  riskPerShare: number | null;
  plannedRisk: number | null;
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

/**
 * V1 is long-only — every position-level calculation funnels through here so
 * a SHORT position always fails loudly instead of silently computing the
 * wrong sign. Null, not a throw, when the plan simply hasn't been set yet —
 * that's a normal state (a bare symbol+direction position), not an error.
 */
function riskPerShare(position: PositionInput): Decimal | null {
  if (position.direction === "SHORT") {
    throw new Error(
      "computePosition does not support SHORT positions — V1 is long-only, and silently wrong P&L is worse than a loud failure.",
    );
  }
  if (position.plannedEntry == null || position.initialStopLoss == null) {
    return null;
  }
  return new Decimal(position.plannedEntry).minus(position.initialStopLoss);
}

/**
 * Normalises whatever the `rules_followed` column holds into the current
 * shape. Returns null when there is nothing scorable.
 *
 * Two shapes exist in the wild:
 *   current — [{ id, text, followed }]  (rule text snapshotted at scoring time)
 *   legacy  — { [ruleId]: boolean }     (answers only, no text)
 *
 * The legacy shape predates migration 0002 and should not survive it. This
 * still handles it, because the alternative is `rules.filter is not a
 * function` thrown out of the engine every screen reads from — a crash, not a
 * wrong number. Adherence is recoverable from the legacy shape (it only needs
 * the flags); the rule text is not, which is exactly why 0002 backfills it
 * from the playbook rather than leaving this function to cope forever.
 */
export function readRuleSnapshot(
  raw: RuleSnapshot[] | LegacyRulesFollowed | null | undefined,
): RuleSnapshot[] | null {
  if (Array.isArray(raw)) return raw as RuleSnapshot[];
  if (raw !== null && typeof raw === "object") {
    return Object.entries(raw as Record<string, unknown>).map(
      ([id, followed]) => ({
        id,
        text: "",
        followed: followed === true,
      }),
    );
  }
  return null;
}

function computeAdherence(position: PositionInput): number | null {
  if (!position.playbookId) return null;
  const rules = readRuleSnapshot(position.rulesFollowed);
  if (!rules || rules.length === 0) return null;
  return safeDivide(rules.filter((r) => r.followed).length, rules.length);
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

  const plannedRisk =
    risk === null || position.plannedQty == null
      ? null
      : risk.times(position.plannedQty).toNumber();
  const plannedRR =
    risk === null || position.targetPrice == null
      ? null
      : safeDivide(
          new Decimal(position.targetPrice).minus(position.plannedEntry!),
          risk,
        );

  const realizedR =
    risk === null || fifo.totalQtySold === 0
      ? null
      : safeDivide(realizedNet, risk.times(fifo.totalQtySold));
  const openR =
    risk === null || openQty === 0 || unrealizedNet === null
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
    riskPerShare: risk === null ? null : risk.toNumber(),
    plannedRisk,
    plannedRR,
    realizedR,
    openR,
    adherence: computeAdherence(position),
  };
}

/**
 * Planned risk as a fraction of account capital (0.02, not 2) — pair with
 * formatPct. Account capital lives on settings, not the position, so it
 * can't be folded into computePosition itself; this keeps the division out
 * of the UI layer, which is the point.
 */
export function plannedRiskPct(
  plannedRisk: number | null,
  accountCapital: number | null,
): number | null {
  if (plannedRisk === null || accountCapital === null) return null;
  return safeDivide(plannedRisk, accountCapital);
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
