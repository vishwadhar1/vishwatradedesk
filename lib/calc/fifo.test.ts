import { describe, expect, it } from "vitest";
import { fifoCostBasis, safeDivide, type TransactionInput } from "./fifo";

describe("safeDivide", () => {
  it("returns the quotient for a non-zero denominator", () => {
    expect(safeDivide(10, 4)).toBe(2.5);
  });

  it("returns null instead of Infinity for a zero denominator", () => {
    expect(safeDivide(10, 0)).toBeNull();
  });

  it("returns null instead of NaN for 0/0", () => {
    expect(safeDivide(0, 0)).toBeNull();
  });
});

describe("fifoCostBasis — RELIANCE seed shape", () => {
  // BUY 100 @ 2500 charges 30; BUY 50 @ 2450 charges 20; SELL 50 @ 2700
  // charges 45. Matches db/seed.ts exactly.
  const transactions: TransactionInput[] = [
    {
      side: "BUY",
      quantity: 100,
      price: "2500",
      totalCharges: "30",
      date: "2026-07-06",
      seq: 1,
    },
    {
      side: "BUY",
      quantity: 50,
      price: "2450",
      totalCharges: "20",
      date: "2026-07-20",
      seq: 2,
    },
    {
      side: "SELL",
      quantity: 50,
      price: "2700",
      totalCharges: "45",
      date: "2026-08-10",
      seq: 3,
    },
  ];

  it("matches the hand-computed FIFO result", () => {
    // Lot 1 cost/share: 2500 + 30/100 = 2500.3
    // Lot 2 cost/share: 2450 + 20/50 = 2450.4
    // Sell 50 consumes 50 from lot 1 (FIFO): matched cost = 50 * 2500.3 = 125015
    // Proceeds = 50 * 2700 - 45 = 134955 → realized P&L = 9940
    // Remaining: 50 @ 2500 + 50 @ 2450 (price only) → avgBuyPrice = 2475.00
    // Remaining unreleased charge/share: (50*0.3 + 50*0.4)/100 = 0.35 → avgCostBasis = 2475.35
    const result = fifoCostBasis(transactions);
    expect(result.totalQtySold).toBe(50);
    expect(result.remainingQty).toBe(100);
    expect(result.realizedPnl).toBeCloseTo(9940, 9);
    expect(result.avgBuyPrice).toBeCloseTo(2475.0, 9);
    expect(result.avgCostBasis).toBeCloseTo(2475.35, 9);
    expect(result.investedValue).toBeCloseTo(247500, 9);
    expect(result.avgSellPrice).toBeCloseTo(2700, 9);
    expect(result.totalCharges).toBeCloseTo(95, 9);
    expect(result.totalBuyCost).toBeCloseTo(372550, 9);
    expect(result.entryDate).toBe("2026-07-06");
    expect(result.exitDate).toBe("2026-08-10");
  });
});

describe("fifoCostBasis — full exit across two lots", () => {
  it("consumes both lots and closes the position out", () => {
    const transactions: TransactionInput[] = [
      {
        side: "BUY",
        quantity: 100,
        price: "2500",
        totalCharges: "30",
        date: "2026-07-06",
        seq: 1,
      },
      {
        side: "BUY",
        quantity: 50,
        price: "2450",
        totalCharges: "20",
        date: "2026-07-20",
        seq: 2,
      },
      {
        side: "SELL",
        quantity: 150,
        price: "2700",
        totalCharges: "60",
        date: "2026-08-10",
        seq: 3,
      },
    ];
    // matchedCost = 100*2500.3 + 50*2450.4 = 250030 + 122520 = 372550
    // proceeds = 150*2700 - 60 = 404940 → realized P&L = 32390
    const result = fifoCostBasis(transactions);
    expect(result.remainingQty).toBe(0);
    expect(result.realizedPnl).toBeCloseTo(32390, 9);
    expect(result.avgBuyPrice).toBeNull();
    expect(result.avgCostBasis).toBeNull();
    expect(result.investedValue).toBeNull();
  });
});

describe("fifoCostBasis — same-day transactions respect seq", () => {
  it("orders same-date buys by seq, not array order", () => {
    const transactions: TransactionInput[] = [
      // Listed out of seq order on purpose — array/insertion order must not matter.
      {
        side: "BUY",
        quantity: 50,
        price: "2100",
        totalCharges: "0",
        date: "2026-01-05",
        seq: 2,
      },
      {
        side: "BUY",
        quantity: 100,
        price: "2000",
        totalCharges: "0",
        date: "2026-01-05",
        seq: 1,
      },
      {
        side: "SELL",
        quantity: 120,
        price: "2500",
        totalCharges: "0",
        date: "2026-01-10",
        seq: 1,
      },
    ];
    // Correct FIFO (seq 1 lot first): 100 @ 2000 + 20 @ 2100 = 200000 + 42000 = 242000
    // proceeds = 120*2500 = 300000 → realized P&L = 58000
    // remaining: 30 @ 2100 (seq 2 lot, partially consumed)
    const result = fifoCostBasis(transactions);
    expect(result.realizedPnl).toBeCloseTo(58000, 9);
    expect(result.remainingQty).toBe(30);
    expect(result.avgBuyPrice).toBeCloseTo(2100, 9);
  });
});

describe("fifoCostBasis — no transactions", () => {
  it("returns zeros/nulls, never NaN", () => {
    const result = fifoCostBasis([]);
    expect(result.remainingQty).toBe(0);
    expect(result.avgBuyPrice).toBeNull();
    expect(result.avgCostBasis).toBeNull();
    expect(result.investedValue).toBeNull();
    expect(result.realizedPnl).toBe(0);
    expect(result.totalQtyBought).toBe(0);
    expect(result.totalQtySold).toBe(0);
    expect(result.avgSellPrice).toBeNull();
    expect(result.totalCharges).toBe(0);
    expect(result.totalBuyCost).toBe(0);
    expect(result.entryDate).toBeNull();
    expect(result.exitDate).toBeNull();
    expect(Number.isNaN(result.realizedPnl)).toBe(false);
  });
});
