import { describe, expect, it } from "vitest";
import {
  formatHolding,
  formatINR,
  formatPct,
  formatQty,
  formatSignedINR,
} from "./format";

describe("formatINR", () => {
  it("groups by the Indian numbering system, not the international one", () => {
    expect(formatINR(247500)).toBe("₹2,47,500.00");
  });

  it("handles small values under a thousand", () => {
    expect(formatINR(500)).toBe("₹500.00");
  });

  it("handles values under a lakh", () => {
    expect(formatINR(1500)).toBe("₹1,500.00");
  });

  it("handles crores", () => {
    expect(formatINR(12345678)).toBe("₹1,23,45,678.00");
  });

  it("compact: crore", () => {
    expect(formatINR(12400000, { compact: true })).toBe("₹1.24Cr");
  });

  it("compact: lakh", () => {
    expect(formatINR(248000, { compact: true })).toBe("₹2.48L");
  });

  it("compact: below a lakh falls back to full grouping", () => {
    expect(formatINR(24800, { compact: true })).toBe("₹24,800.00");
  });

  it("handles negative values", () => {
    expect(formatINR(-247500)).toBe("-₹2,47,500.00");
  });
});

describe("formatSignedINR", () => {
  it("always carries a sign, even for a positive value", () => {
    expect(formatSignedINR(9940)).toBe("+₹9,940.00");
  });

  it("uses the minus sign − for negatives, not a hyphen", () => {
    expect(formatSignedINR(-9940)).toBe("−₹9,940.00");
  });

  it("defaults zero to +", () => {
    expect(formatSignedINR(0)).toBe("+₹0.00");
  });
});

describe("formatQty", () => {
  it("groups Indian-style with no currency symbol or decimals", () => {
    expect(formatQty(150000)).toBe("1,50,000");
    expect(formatQty(100)).toBe("100");
  });
});

describe("formatPct", () => {
  it("takes a 0-1 fraction and renders it as a percentage", () => {
    expect(formatPct(0.5)).toBe("50.00%");
    expect(formatPct(0.735, 1)).toBe("73.5%");
  });
});

describe("formatHolding", () => {
  it("days only, under a month", () => {
    expect(formatHolding(14)).toBe("14d");
  });

  it("months and days, under a year", () => {
    expect(formatHolding(102)).toBe("3m 12d");
  });

  it("years and months, beyond a year", () => {
    expect(formatHolding(485)).toBe("1y 4m");
  });
});
