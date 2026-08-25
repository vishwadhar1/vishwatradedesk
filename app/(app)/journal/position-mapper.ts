import type { positions, transactions } from "@/db/schema";
import type { PositionInput, TransactionInput } from "@/lib/calc/position";

type PositionRow = typeof positions.$inferSelect;
type TransactionRow = typeof transactions.$inferSelect;

export function toPositionInput(row: PositionRow): PositionInput {
  return {
    direction: row.direction,
    positionType: row.positionType,
    plannedEntry: row.plannedEntry,
    initialStopLoss: row.initialStopLoss,
    targetPrice: row.targetPrice,
    plannedQty: row.plannedQty,
    currentPrice: row.currentPrice,
    previousClose: row.previousClose,
    playbookId: row.playbookId,
    rulesFollowed: row.rulesFollowed,
  };
}

export function toTransactionInput(row: TransactionRow): TransactionInput {
  return {
    side: row.side,
    quantity: row.quantity,
    price: row.price,
    totalCharges: row.totalCharges,
    date: row.date,
    seq: row.seq,
  };
}
