import Decimal from "decimal.js";
import { safeDivide, type TransactionInput } from "./fifo";
import {
  computePosition,
  todayIso,
  type ComputedPosition,
  type PositionInput,
} from "./position";

export type PositionWithTransactions = {
  position: PositionInput;
  transactions: TransactionInput[];
};

type SplitStats = {
  n: number;
  winRate: number | null;
  expectancy: number | null;
};

export type ClosedTradeMetrics = {
  n: number;
  /** Wins / (wins + losses) — breakeven trades excluded from both. */
  winRate: number | null;
  breakevenCount: number;
  avgWin: number | null;
  /** Positive magnitude, not signed. */
  avgLoss: number | null;
  /** grossProfit / grossLoss. Null when there are no losses (not Infinity). */
  profitFactor: number | null;
  avgReturnPct: number | null;
  /** Average realizedNet per closed trade (includes breakeven trades). */
  expectancy: number | null;
  avgR: number | null;
  adherenceSplit: {
    followedAll: SplitStats;
    broke: SplitStats;
  };
};

function summarizeClosedTrades(
  closed: ComputedPosition[],
): Omit<ClosedTradeMetrics, "adherenceSplit"> {
  const wins = closed.filter((c) => c.realizedNet > 0);
  const losses = closed.filter((c) => c.realizedNet < 0);
  const breakevenCount = closed.filter((c) => c.realizedNet === 0).length;

  const grossProfit = wins.reduce((sum, c) => sum + c.realizedNet, 0);
  const grossLoss = losses.reduce((sum, c) => sum + Math.abs(c.realizedNet), 0);

  const returnPcts = closed
    .map((c) => c.netPnlPct)
    .filter((v): v is number => v !== null);
  const rValues = closed
    .map((c) => c.realizedR)
    .filter((v): v is number => v !== null);

  return {
    n: closed.length,
    winRate: safeDivide(wins.length, wins.length + losses.length),
    breakevenCount,
    avgWin: safeDivide(grossProfit, wins.length),
    avgLoss: safeDivide(grossLoss, losses.length),
    profitFactor: safeDivide(grossProfit, grossLoss),
    avgReturnPct: safeDivide(
      returnPcts.reduce((sum, v) => sum + v, 0),
      returnPcts.length,
    ),
    expectancy: safeDivide(
      closed.reduce((sum, c) => sum + c.realizedNet, 0),
      closed.length,
    ),
    avgR: safeDivide(
      rValues.reduce((sum, v) => sum + v, 0),
      rValues.length,
    ),
  };
}

function toSplitStats(
  stats: Omit<ClosedTradeMetrics, "adherenceSplit">,
): SplitStats {
  return { n: stats.n, winRate: stats.winRate, expectancy: stats.expectancy };
}

export function closedTradeMetrics(
  positionsWithTransactions: PositionWithTransactions[],
  filter?: { positionType?: "SWING" | "INVESTMENT" | "POSITIONAL" },
): ClosedTradeMetrics {
  const closed = positionsWithTransactions
    .filter(
      ({ position }) =>
        !filter?.positionType || position.positionType === filter.positionType,
    )
    .map(({ position, transactions }) =>
      computePosition(position, transactions),
    )
    .filter((c) => c.status === "CLOSED");

  const followedAll = closed.filter((c) => c.adherence === 1);
  const broke = closed.filter((c) => c.adherence !== null && c.adherence < 1);

  return {
    ...summarizeClosedTrades(closed),
    adherenceSplit: {
      followedAll: toSplitStats(summarizeClosedTrades(followedAll)),
      broke: toSplitStats(summarizeClosedTrades(broke)),
    },
  };
}

export type EquityPoint = { date: string; value: number };
export type EquityCurve = { mode: "MTM" | "REALIZED"; points: EquityPoint[] };

export type PortfolioSnapshotInput = {
  date: string;
  realizedPnlToDate: number | string;
  unrealizedPnl: number | string;
};

const MTM_MIN_SNAPSHOTS = 5;

/**
 * >= 5 portfolio_snapshots rows: mark-to-market curve straight from those
 * snapshots. Otherwise: a running sum of realized P&L on each exit date,
 * with one final point today that adds in the still-open positions'
 * unrealized P&L — an approximation, not a stored fact, since there isn't
 * enough snapshot history yet to show the real day-by-day mark.
 */
export function equityCurve(
  positionsWithTransactions: PositionWithTransactions[],
  portfolioSnapshots: PortfolioSnapshotInput[],
): EquityCurve {
  if (portfolioSnapshots.length >= MTM_MIN_SNAPSHOTS) {
    const points = [...portfolioSnapshots]
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
      .map((snapshot) => ({
        date: snapshot.date,
        value: new Decimal(snapshot.realizedPnlToDate)
          .plus(snapshot.unrealizedPnl)
          .toNumber(),
      }));
    return { mode: "MTM", points };
  }

  const computed = positionsWithTransactions.map(({ position, transactions }) =>
    computePosition(position, transactions),
  );

  const closedByExit = computed
    .filter(
      (c): c is ComputedPosition & { exitDate: string } =>
        c.status === "CLOSED" && c.exitDate !== null,
    )
    .sort((a, b) => (a.exitDate < b.exitDate ? -1 : 1));

  let running = new Decimal(0);
  const points: EquityPoint[] = closedByExit.map((c) => {
    running = running.plus(c.realizedNet);
    return { date: c.exitDate, value: running.toNumber() };
  });

  const openUnrealized = computed
    .filter((c) => c.openQty > 0)
    .reduce((sum, c) => sum.plus(c.unrealizedNet ?? 0), new Decimal(0));

  points.push({
    date: todayIso(),
    value: running.plus(openUnrealized).toNumber(),
  });

  return { mode: "REALIZED", points };
}

export type MonthlyPnl = { month: string; realizedNet: number };

/** Realized net P&L bucketed by exit month, over a fixed trailing window ending this month — includes zero-value months so charts don't gap. */
export function monthlyPnl(
  positionsWithTransactions: PositionWithTransactions[],
  months = 12,
): MonthlyPnl[] {
  const now = new Date();
  const buckets = new Map<string, Decimal>();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1),
    );
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, new Decimal(0));
  }

  for (const { position, transactions } of positionsWithTransactions) {
    const computed = computePosition(position, transactions);
    if (computed.status !== "CLOSED" || !computed.exitDate) continue;
    const key = computed.exitDate.slice(0, 7);
    const existing = buckets.get(key);
    if (existing !== undefined) {
      buckets.set(key, existing.plus(computed.realizedNet));
    }
  }

  return [...buckets.entries()].map(([month, value]) => ({
    month,
    realizedNet: value.toNumber(),
  }));
}
