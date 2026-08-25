import Decimal from "decimal.js";

export type TransactionInput = {
  side: "BUY" | "SELL";
  quantity: number;
  price: number | string;
  totalCharges: number | string;
  date: string;
  seq: number;
};

/** Never lets a division produce Infinity/NaN — a zero denominator is "undefined", not infinite. */
export function safeDivide(
  numerator: Decimal.Value,
  denominator: Decimal.Value,
): number | null {
  const d = new Decimal(denominator);
  if (d.isZero()) return null;
  return new Decimal(numerator).dividedBy(d).toNumber();
}

export function sortTransactions(
  transactions: TransactionInput[],
): TransactionInput[] {
  return [...transactions].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return a.seq - b.seq;
  });
}

type Lot = { quantity: Decimal; price: Decimal; chargePerShare: Decimal };

export type FifoResult = {
  remainingQty: number;
  /** Weighted average of remaining lots' raw buy price. Excludes charges — display only. */
  avgBuyPrice: number | null;
  /** avgBuyPrice plus unreleased (not-yet-sold) buy charges per share. P&L only. */
  avgCostBasis: number | null;
  /** remainingQty * avgBuyPrice. */
  investedValue: number | null;
  /** Net of all buy and sell charges on the matched/sold portion — fully settled. */
  realizedPnl: number;
  totalQtyBought: number;
  totalQtySold: number;
  /** Weighted average raw sell price. Excludes charges — display only. */
  avgSellPrice: number | null;
  /** Sum of totalCharges across every transaction, buy and sell. */
  totalCharges: number;
  /** Total cost (price + charges) of every BUY, regardless of what's since sold. */
  totalBuyCost: number;
  entryDate: string | null;
  /** Date of the last SELL, or null if none. Caller decides whether this means "closed". */
  exitDate: string | null;
};

/**
 * FIFO cost basis. Buy charges are capitalised into each lot's per-share
 * cost; sell charges reduce that sale's proceeds directly. Never expensed
 * on entry — only released (as realized P&L) when the matching shares sell.
 *
 * Models the LONG cash-flow direction only (BUY adds a lot, SELL releases
 * one) — the only direction lib/calc/position.ts supports.
 */
export function fifoCostBasis(transactions: TransactionInput[]): FifoResult {
  const lots: Lot[] = [];
  let realizedPnl = new Decimal(0);
  let totalQtyBought = 0;
  let totalQtySold = 0;
  let totalCharges = new Decimal(0);
  let totalBuyCost = new Decimal(0);
  let sellValueSum = new Decimal(0);
  let entryDate: string | null = null;
  let exitDate: string | null = null;

  for (const txn of sortTransactions(transactions)) {
    totalCharges = totalCharges.plus(txn.totalCharges);
    const quantity = new Decimal(txn.quantity);

    if (txn.side === "BUY") {
      if (entryDate === null) entryDate = txn.date;
      const chargePerShare = safeDivide(txn.totalCharges, txn.quantity) ?? 0;
      const price = new Decimal(txn.price);
      lots.push({
        quantity,
        price,
        chargePerShare: new Decimal(chargePerShare),
      });
      totalQtyBought += txn.quantity;
      totalBuyCost = totalBuyCost
        .plus(quantity.times(price))
        .plus(txn.totalCharges);
      continue;
    }

    // SELL — charges reduce this sale's proceeds; cost is matched FIFO.
    let toMatch = quantity;
    let matchedCost = new Decimal(0);
    while (toMatch.greaterThan(0) && lots.length > 0) {
      const lot = lots[0];
      const taken = Decimal.min(toMatch, lot.quantity);
      const costPerShare = lot.price.plus(lot.chargePerShare);
      matchedCost = matchedCost.plus(taken.times(costPerShare));
      lot.quantity = lot.quantity.minus(taken);
      toMatch = toMatch.minus(taken);
      if (lot.quantity.isZero()) lots.shift();
    }

    const proceeds = quantity.times(txn.price).minus(txn.totalCharges);
    realizedPnl = realizedPnl.plus(proceeds.minus(matchedCost));
    totalQtySold += txn.quantity;
    sellValueSum = sellValueSum.plus(quantity.times(txn.price));
    exitDate = txn.date;
  }

  const remainingQty = lots.reduce(
    (sum, lot) => sum.plus(lot.quantity),
    new Decimal(0),
  );
  const remainingPriceValue = lots.reduce(
    (sum, lot) => sum.plus(lot.quantity.times(lot.price)),
    new Decimal(0),
  );
  const remainingChargeValue = lots.reduce(
    (sum, lot) => sum.plus(lot.quantity.times(lot.chargePerShare)),
    new Decimal(0),
  );

  const avgBuyPrice = safeDivide(remainingPriceValue, remainingQty);
  const unreleasedChargePerShare = safeDivide(
    remainingChargeValue,
    remainingQty,
  );
  const avgCostBasis =
    avgBuyPrice === null || unreleasedChargePerShare === null
      ? null
      : avgBuyPrice + unreleasedChargePerShare;

  return {
    remainingQty: remainingQty.toNumber(),
    avgBuyPrice,
    avgCostBasis,
    investedValue: remainingQty.isZero()
      ? null
      : remainingPriceValue.toNumber(),
    realizedPnl: realizedPnl.toNumber(),
    totalQtyBought,
    totalQtySold,
    avgSellPrice: safeDivide(sellValueSum, totalQtySold),
    totalCharges: totalCharges.toNumber(),
    totalBuyCost: totalBuyCost.toNumber(),
    entryDate,
    exitDate,
  };
}
