import { describe, expect, it } from "vitest";
import {
  formatHolding,
  formatINR,
  formatPct,
  formatQty,
  formatR,
  formatSignedINR,
  formatSignedPct,
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
    expect(formatINR(-247500)).toBe("−₹2,47,500.00");
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

  it("uses the minus sign − for a negative fraction, not a hyphen", () => {
    // Native toFixed() on a negative number produces a hyphen — this is
    // exactly the class of bug the rest of this file guards against, just
    // never previously exercised with a negative formatPct input.
    const rendered = formatPct(-0.0537);
    expect(rendered).toBe("−5.37%");
    expect(rendered).not.toContain("-");
  });
});

describe("formatSignedPct", () => {
  it("always carries a sign, even for a positive value", () => {
    expect(formatSignedPct(0.045)).toBe("+4.50%");
  });

  it("uses the minus sign − for negatives, not a hyphen", () => {
    const rendered = formatSignedPct(-0.045);
    expect(rendered).toBe("−4.50%");
    expect(rendered).not.toContain("-");
  });

  it("defaults zero to +", () => {
    expect(formatSignedPct(0)).toBe("+0.00%");
  });
});

describe("minus sign consistency", () => {
  // U+2212 MINUS SIGN, not U+002D HYPHEN-MINUS. Different width under
  // tabular-nums — a table mixing the two misaligns. Every formatter that
  // can render a negative value must agree on this exact character.
  const MINUS_SIGN = "−";
  const HYPHEN_MINUS = "-";

  it("formatINR uses the minus sign, not a hyphen", () => {
    const rendered = formatINR(-9940);
    expect(rendered.charAt(0)).toBe(MINUS_SIGN);
    expect(rendered).not.toContain(HYPHEN_MINUS);
  });

  it("formatSignedINR uses the minus sign, not a hyphen", () => {
    const rendered = formatSignedINR(-9940);
    expect(rendered.charAt(0)).toBe(MINUS_SIGN);
    expect(rendered).not.toContain(HYPHEN_MINUS);
  });

  it("formatQty uses the minus sign, not a hyphen", () => {
    const rendered = formatQty(-150000);
    expect(rendered.charAt(0)).toBe(MINUS_SIGN);
    expect(rendered).not.toContain(HYPHEN_MINUS);
  });
});

describe("formatR", () => {
  it("formats a positive R multiple with no sign", () => {
    expect(formatR(1.988)).toBe("1.99R");
  });

  it("uses the minus sign − for a negative R multiple, not a hyphen", () => {
    const rendered = formatR(-0.5);
    expect(rendered).toBe("−0.50R");
    expect(rendered).not.toContain("-");
  });

  it("never carries a ₹ symbol or Indian digit grouping — it isn't currency", () => {
    expect(formatR(12345.6)).toBe("12345.60R");
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
