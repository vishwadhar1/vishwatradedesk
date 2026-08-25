import { describe, expect, it } from "vitest";
import {
  computePosition,
  openR,
  plannedRiskPct,
  readRuleSnapshot,
  realizedR,
  type PositionInput,
  type TransactionInput,
} from "./position";

describe("computePosition — RELIANCE seed shape", () => {
  const position: PositionInput = {
    direction: "LONG",
    plannedEntry: "2500",
    initialStopLoss: "2400",
    targetPrice: "2800",
    plannedQty: 150,
    currentPrice: "2650",
    previousClose: "2630",
  };
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

  it("asserts every value the spec pins down exactly", () => {
    const result = computePosition(position, transactions);
    expect(result.realizedNet).toBeCloseTo(9940, 9);
    expect(result.unrealizedNet).toBeCloseTo(17465, 9);
    expect(result.netPnl).toBeCloseTo(27405, 9);
    expect(result.avgBuyPrice).toBeCloseTo(2475.0, 9);
    expect(result.avgCostBasis).toBeCloseTo(2475.35, 9);
    expect(result.openQty).toBe(100);
    expect(result.investedValue).toBeCloseTo(247500, 9);
    expect(result.currentValue).toBeCloseTo(265000, 9);
    expect(result.status).toBe("PARTIALLY_CLOSED");
  });

  it("computes the rest of the shape consistently", () => {
    const result = computePosition(position, transactions);
    // unrealizedGross uses avgBuyPrice (no charges): 100 * (2650 - 2475) = 17500
    expect(result.unrealizedGross).toBeCloseTo(17500, 9);
    // riskPerShare = 2500 - 2400 = 100
    expect(result.riskPerShare).toBeCloseTo(100, 9);
    expect(result.plannedRisk).toBeCloseTo(100 * 150, 9);
    // plannedRR = (2800 - 2500) / 100 = 3
    expect(result.plannedRR).toBeCloseTo(3, 9);
    // realizedR = 9940 / (100 * 50) = 1.988
    expect(result.realizedR).toBeCloseTo(1.988, 9);
    // openR = 17465 / (100 * 100) = 1.7465
    expect(result.openR).toBeCloseTo(1.7465, 9);
    // todayPnl = 100 * (2650 - 2630) = 2000
    expect(result.todayPnl).toBeCloseTo(2000, 9);
    expect(result.totalQtyBought).toBe(150);
    expect(result.totalQtySold).toBe(50);
    expect(result.avgSellPrice).toBeCloseTo(2700, 9);
    expect(result.totalCharges).toBeCloseTo(95, 9);
    expect(result.entryDate).toBe("2026-07-06");
    expect(result.exitDate).toBeNull(); // not CLOSED — only PARTIALLY_CLOSED
    expect(result.adherence).toBeNull(); // no playbook attached
  });
});

describe("computePosition — full exit across two lots", () => {
  it("reports CLOSED with a real exitDate and no live-price fields", () => {
    const position: PositionInput = {
      direction: "LONG",
      plannedEntry: "2500",
      initialStopLoss: "2400",
      plannedQty: 150,
    };
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
    const result = computePosition(position, transactions);
    expect(result.status).toBe("CLOSED");
    expect(result.openQty).toBe(0);
    expect(result.realizedNet).toBeCloseTo(32390, 9);
    expect(result.exitDate).toBe("2026-08-10");
    expect(result.avgBuyPrice).toBeNull();
    expect(result.currentValue).toBeNull();
    expect(result.unrealizedNet).toBeNull();
    expect(result.openR).toBeNull();
    expect(result.holdingDays).toBe(35); // 2026-07-06 -> 2026-08-10
  });
});

describe("computePosition — PLANNED position", () => {
  it("returns zeros/nulls, never NaN", () => {
    const position: PositionInput = {
      direction: "LONG",
      plannedEntry: "1650",
      initialStopLoss: "1580",
      plannedQty: 200,
    };
    const result = computePosition(position, []);
    expect(result.status).toBe("PLANNED");
    expect(result.openQty).toBe(0);
    expect(result.realizedNet).toBe(0);
    expect(result.netPnl).toBe(0);
    expect(result.totalCharges).toBe(0);
    expect(result.totalQtyBought).toBe(0);
    expect(result.totalQtySold).toBe(0);
    expect(result.avgBuyPrice).toBeNull();
    expect(result.avgCostBasis).toBeNull();
    expect(result.investedValue).toBeNull();
    expect(result.currentValue).toBeNull();
    expect(result.unrealizedGross).toBeNull();
    expect(result.unrealizedNet).toBeNull();
    expect(result.netPnlPct).toBeNull();
    expect(result.todayPnl).toBeNull();
    expect(result.entryDate).toBeNull();
    expect(result.exitDate).toBeNull();
    expect(result.holdingDays).toBeNull();
    expect(result.realizedR).toBeNull();
    expect(result.openR).toBeNull();
    expect(Number.isNaN(result.realizedNet)).toBe(false);
    expect(Number.isNaN(result.netPnl)).toBe(false);
  });
});

describe("computePosition — bare position, no plan set yet", () => {
  it("returns null risk/plannedRisk/plannedRR/R instead of throwing on a null plan", () => {
    const bare: PositionInput = {
      direction: "LONG",
      plannedEntry: null,
      initialStopLoss: null,
      plannedQty: null,
    };
    const result = computePosition(bare, []);
    expect(result.status).toBe("PLANNED");
    expect(result.riskPerShare).toBeNull();
    expect(result.plannedRisk).toBeNull();
    expect(result.plannedRR).toBeNull();
    expect(result.realizedR).toBeNull();
    expect(result.openR).toBeNull();
  });

  it("plannedRisk is null when only plannedQty is missing, even with a real plan", () => {
    const partial: PositionInput = {
      direction: "LONG",
      plannedEntry: "2500",
      initialStopLoss: "2400",
      plannedQty: null,
    };
    const result = computePosition(partial, []);
    expect(result.riskPerShare).toBeCloseTo(100, 9);
    expect(result.plannedRisk).toBeNull();
  });

  it("a sale still computes realizedR once the plan is filled in, even though it started null", () => {
    const filledInLater: PositionInput = {
      direction: "LONG",
      plannedEntry: "2500",
      initialStopLoss: "2400",
      plannedQty: 100,
    };
    const transactions: TransactionInput[] = [
      {
        side: "BUY",
        quantity: 100,
        price: "2500",
        totalCharges: "0",
        date: "2026-07-06",
        seq: 1,
      },
      {
        side: "SELL",
        quantity: 100,
        price: "2600",
        totalCharges: "0",
        date: "2026-07-20",
        seq: 2,
      },
    ];
    const result = computePosition(filledInLater, transactions);
    expect(result.realizedR).toBeCloseTo(1, 9);
  });
});

describe("plannedRiskPct", () => {
  it("returns a fraction, not a percentage", () => {
    expect(plannedRiskPct(10000, 1000000)).toBeCloseTo(0.01, 9);
  });

  it("is null when either input is null, not NaN or Infinity", () => {
    expect(plannedRiskPct(null, 1000000)).toBeNull();
    expect(plannedRiskPct(10000, null)).toBeNull();
    expect(plannedRiskPct(null, null)).toBeNull();
  });

  it("is null, not Infinity, when account capital is zero", () => {
    expect(plannedRiskPct(10000, 0)).toBeNull();
  });
});

describe("computePosition — zero-risk guard (planned_entry === initial_stop_loss)", () => {
  const zeroRiskPosition: PositionInput = {
    direction: "LONG",
    plannedEntry: "2500",
    initialStopLoss: "2500",
    plannedQty: 100,
    currentPrice: "2650",
  };

  it("realizedR is null, not Infinity/NaN, when a sale exists but risk is zero", () => {
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
        side: "SELL",
        quantity: 50,
        price: "2700",
        totalCharges: "45",
        date: "2026-08-10",
        seq: 2,
      },
    ];
    const result = computePosition(zeroRiskPosition, transactions);
    expect(result.realizedR).toBeNull();
    expect(result.openR).toBeNull();
    expect(result.plannedRR).toBeNull();
    expect(result.realizedR).not.toBe(Infinity);
    expect(Number.isNaN(result.realizedR)).toBe(false);
  });

  it("openR is null, not Infinity/NaN, for an open position with zero risk", () => {
    const transactions: TransactionInput[] = [
      {
        side: "BUY",
        quantity: 100,
        price: "2500",
        totalCharges: "30",
        date: "2026-07-06",
        seq: 1,
      },
    ];
    const result = computePosition(zeroRiskPosition, transactions);
    expect(result.openR).toBeNull();
    expect(result.openR).not.toBe(Infinity);
    expect(Number.isNaN(result.openR)).toBe(false);
  });

  it("realizedR/openR standalone wrappers agree with computePosition", () => {
    const transactions: TransactionInput[] = [
      {
        side: "BUY",
        quantity: 100,
        price: "2500",
        totalCharges: "30",
        date: "2026-07-06",
        seq: 1,
      },
    ];
    expect(realizedR(zeroRiskPosition, transactions)).toBeNull();
    expect(openR(zeroRiskPosition, transactions)).toBeNull();
  });
});

describe("computePosition — SHORT throws", () => {
  it("throws instead of silently computing wrong-signed P&L", () => {
    const position: PositionInput = {
      direction: "SHORT",
      plannedEntry: "2500",
      initialStopLoss: "2600",
      plannedQty: 100,
    };
    expect(() => computePosition(position, [])).toThrow(/long-only/i);
  });
});

describe("computePosition — status transitions", () => {
  const base: PositionInput = {
    direction: "LONG",
    plannedEntry: "1000",
    initialStopLoss: "950",
    plannedQty: 100,
  };

  it("OPEN — buys only, no sells", () => {
    const transactions: TransactionInput[] = [
      {
        side: "BUY",
        quantity: 100,
        price: "1000",
        totalCharges: "10",
        date: "2026-06-01",
        seq: 1,
      },
    ];
    expect(computePosition(base, transactions).status).toBe("OPEN");
  });

  it("adherence is null without a playbook, and a fraction with one", () => {
    const withPlaybook: PositionInput = {
      ...base,
      playbookId: "pb-1",
      rulesFollowed: [
        { id: "r1", text: "Base of at least 7 weeks", followed: true },
        { id: "r2", text: "Two or more contractions", followed: true },
        { id: "r3", text: "Volume dries up", followed: false },
        { id: "r4", text: "Entry above the pivot on volume", followed: true },
        { id: "r5", text: "Stop below the last contraction", followed: true },
        { id: "r6", text: "Risk <= 1% of account capital", followed: true },
      ],
    };
    expect(computePosition(base, []).adherence).toBeNull();
    expect(computePosition(withPlaybook, [])?.adherence).toBeCloseTo(5 / 6, 9);
  });

  it("adherence is computed from the followed flags only — snapshotted rule text never affects it", () => {
    // Simulates a playbook rule being edited after this position was
    // scored: only `text` differs, `id` and `followed` are identical.
    // The adherence figure must be byte-for-byte the same either way.
    const scoredAt: PositionInput = {
      ...base,
      playbookId: "pb-1",
      rulesFollowed: [
        { id: "r1", text: "Base of at least 7 weeks", followed: true },
        { id: "r2", text: "Volume dries up", followed: false },
      ],
    };
    const afterPlaybookEdited: PositionInput = {
      ...base,
      playbookId: "pb-1",
      rulesFollowed: [
        { id: "r1", text: "Base of at least 8 weeks (edited)", followed: true },
        {
          id: "r2",
          text: "Volume dries up through the pivot (edited)",
          followed: false,
        },
      ],
    };
    expect(computePosition(scoredAt, []).adherence).toBe(
      computePosition(afterPlaybookEdited, []).adherence,
    );
  });
});

describe("legacy rules_followed shape (rows written before migration 0002)", () => {
  const base: PositionInput = {
    direction: "LONG",
    plannedEntry: "2500",
    initialStopLoss: "2400",
    plannedQty: 150,
    playbookId: "pb-1",
  };

  it("does not throw on the object shape — it used to die on rules.filter", () => {
    const legacy: PositionInput = {
      ...base,
      rulesFollowed: {
        r1: true,
        r2: true,
        r3: false,
        r4: true,
        r5: true,
        r6: true,
      },
    };
    expect(() => computePosition(legacy, [])).not.toThrow();
    expect(computePosition(legacy, []).adherence).toBeCloseTo(5 / 6, 9);
  });

  it("scores the object and array shapes identically", () => {
    const legacy: PositionInput = {
      ...base,
      rulesFollowed: { r1: true, r2: false, r3: true, r4: false },
    };
    const migrated: PositionInput = {
      ...base,
      rulesFollowed: [
        { id: "r1", text: "Base of at least 7 weeks", followed: true },
        { id: "r2", text: "Two or more contractions", followed: false },
        { id: "r3", text: "Volume dries up", followed: true },
        { id: "r4", text: "Entry above the pivot", followed: false },
      ],
    };
    expect(computePosition(legacy, []).adherence).toBe(
      computePosition(migrated, []).adherence,
    );
  });

  it("treats a non-boolean legacy answer as not-followed rather than truthy", () => {
    // Guards against `Boolean("false")` — a stray string must never score.
    const raw = { r1: "false", r2: 1, r3: true } as unknown as Record<
      string,
      boolean
    >;
    expect(readRuleSnapshot(raw)?.map((r) => r.followed)).toEqual([
      false,
      false,
      true,
    ]);
  });

  it("returns null for an empty object and for null, never NaN", () => {
    expect(
      computePosition({ ...base, rulesFollowed: {} }, []).adherence,
    ).toBeNull();
    expect(
      computePosition({ ...base, rulesFollowed: null }, []).adherence,
    ).toBeNull();
  });

  it("passes an array straight through without rebuilding it", () => {
    const rules = [{ id: "r1", text: "Base", followed: true }];
    expect(readRuleSnapshot(rules)).toBe(rules);
  });
});
