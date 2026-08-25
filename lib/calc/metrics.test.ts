import { describe, expect, it } from "vitest";
import {
  closedTradeMetrics,
  equityCurve,
  monthlyPnl,
  type PositionWithTransactions,
} from "./metrics";
import type { PositionInput, TransactionInput } from "./position";

function closedTrade(
  overrides: Partial<PositionInput>,
  buyPrice: number,
  sellPrice: number,
  exitDate: string,
): PositionWithTransactions {
  const position: PositionInput = {
    direction: "LONG",
    plannedEntry: String(buyPrice),
    initialStopLoss: String(buyPrice - 50),
    plannedQty: 100,
    ...overrides,
  };
  const transactions: TransactionInput[] = [
    {
      side: "BUY",
      quantity: 100,
      price: String(buyPrice),
      totalCharges: "0",
      date: "2026-01-01",
      seq: 1,
    },
    {
      side: "SELL",
      quantity: 100,
      price: String(sellPrice),
      totalCharges: "0",
      date: exitDate,
      seq: 2,
    },
  ];
  return { position, transactions };
}

describe("closedTradeMetrics", () => {
  it("excludes breakeven trades from winRate's numerator and denominator", () => {
    const trades: PositionWithTransactions[] = [
      closedTrade({}, 1000, 1100, "2026-01-05"), // win: +10000
      closedTrade({}, 1000, 900, "2026-01-10"), // loss: -10000
      closedTrade({}, 1000, 1000, "2026-01-15"), // breakeven: 0
    ];
    const result = closedTradeMetrics(trades);
    expect(result.n).toBe(3);
    expect(result.breakevenCount).toBe(1);
    // 1 win / (1 win + 1 loss) — breakeven trade excluded entirely
    expect(result.winRate).toBeCloseTo(0.5, 9);
  });

  it("profitFactor is null (not Infinity) when there are no losses", () => {
    const trades: PositionWithTransactions[] = [
      closedTrade({}, 1000, 1100, "2026-01-05"),
      closedTrade({}, 1000, 1200, "2026-01-10"),
    ];
    const result = closedTradeMetrics(trades);
    expect(result.profitFactor).toBeNull();
    expect(result.avgLoss).toBeNull();
  });

  it("filters by positionType", () => {
    const trades: PositionWithTransactions[] = [
      closedTrade({ positionType: "SWING" }, 1000, 1100, "2026-01-05"),
      closedTrade({ positionType: "POSITIONAL" }, 1000, 900, "2026-01-10"),
    ];
    const swingOnly = closedTradeMetrics(trades, { positionType: "SWING" });
    expect(swingOnly.n).toBe(1);
    expect(swingOnly.winRate).toBeCloseTo(1, 9);
  });

  it("splits adherenceSplit by whether all playbook rules were followed", () => {
    const trades: PositionWithTransactions[] = [
      closedTrade(
        { playbookId: "pb-1", rulesFollowed: { r1: true, r2: true } },
        1000,
        1100,
        "2026-01-05",
      ),
      closedTrade(
        { playbookId: "pb-1", rulesFollowed: { r1: true, r2: false } },
        1000,
        900,
        "2026-01-10",
      ),
      closedTrade({}, 1000, 1050, "2026-01-15"), // no playbook — excluded from the split
    ];
    const result = closedTradeMetrics(trades);
    expect(result.adherenceSplit.followedAll.n).toBe(1);
    expect(result.adherenceSplit.broke.n).toBe(1);
  });

  it("ignores non-CLOSED positions", () => {
    const open: PositionWithTransactions = {
      position: {
        direction: "LONG",
        plannedEntry: "1000",
        initialStopLoss: "950",
        plannedQty: 100,
      },
      transactions: [
        {
          side: "BUY",
          quantity: 100,
          price: "1000",
          totalCharges: "0",
          date: "2026-01-01",
          seq: 1,
        },
      ],
    };
    const result = closedTradeMetrics([open]);
    expect(result.n).toBe(0);
    expect(result.winRate).toBeNull();
  });
});

describe("equityCurve", () => {
  it("uses MTM mode with >= 5 snapshots", () => {
    const snapshots = Array.from({ length: 5 }, (_, i) => ({
      date: `2026-01-0${i + 1}`,
      realizedPnlToDate: 1000 * i,
      unrealizedPnl: 100,
    }));
    const result = equityCurve([], snapshots);
    expect(result.mode).toBe("MTM");
    expect(result.points).toHaveLength(5);
    expect(result.points[4].value).toBeCloseTo(4000 + 100, 9);
  });

  it("falls back to REALIZED mode under 5 snapshots, with a final today point", () => {
    const trades = [
      closedTrade({}, 1000, 1100, "2026-01-05"),
      closedTrade({}, 1000, 900, "2026-01-10"),
    ];
    const result = equityCurve(trades, []);
    expect(result.mode).toBe("REALIZED");
    // 2 closed-trade points + 1 final "today" point
    expect(result.points).toHaveLength(3);
    expect(result.points[0].value).toBeCloseTo(10000, 9);
    expect(result.points[1].value).toBeCloseTo(0, 9); // 10000 - 10000
    expect(result.points[2].value).toBeCloseTo(0, 9); // no open positions to add
  });
});

describe("monthlyPnl", () => {
  it("buckets realized net by exit month over the trailing window", () => {
    // Computed relative to "now" so this doesn't rot into a fragile,
    // date-pinned assertion once real time moves past this session.
    const now = new Date();
    const thisMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const trades = [
      closedTrade({}, 1000, 1100, "2026-01-01".replace("2026-01", thisMonth)),
      closedTrade({}, 1000, 1200, "2026-01-02".replace("2026-01", thisMonth)),
    ];
    const result = monthlyPnl(trades, 12);
    expect(result).toHaveLength(12);
    expect(result[result.length - 1].month).toBe(thisMonth);
    const current = result.find((m) => m.month === thisMonth);
    expect(current?.realizedNet).toBeCloseTo(30000, 9);
  });
});
