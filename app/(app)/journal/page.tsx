import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { positions, transactions } from "@/db/schema";
import { EmptyState } from "@/components/EmptyState";
import { computePosition, type ComputedPosition } from "@/lib/calc/position";
import { JournalList, type JournalRow } from "./JournalList";
import { toPositionInput, toTransactionInput } from "./position-mapper";

export default async function JournalPage() {
  const positionRows = await db.select().from(positions);

  if (positionRows.length === 0) {
    return (
      <EmptyState
        message="No positions in your journal yet."
        actionLabel="+ New Position"
        href="/journal/new"
      />
    );
  }

  const positionIds = positionRows.map((p) => p.id);
  const txnRows = await db
    .select()
    .from(transactions)
    .where(inArray(transactions.positionId, positionIds));

  const txnsByPosition = new Map<
    string,
    ReturnType<typeof toTransactionInput>[]
  >();
  for (const t of txnRows) {
    const list = txnsByPosition.get(t.positionId) ?? [];
    list.push(toTransactionInput(t));
    txnsByPosition.set(t.positionId, list);
  }

  const rows: JournalRow[] = positionRows.map((row) => {
    const txns = txnsByPosition.get(row.id) ?? [];
    let computed: ComputedPosition | null = null;
    try {
      computed = computePosition(toPositionInput(row), txns);
    } catch {
      // SHORT isn't computable in V1 — the row still shows, derived figures don't.
      computed = null;
    }

    // Most recent transaction date, falling back to updatedAt only when
    // there's no activity at all (a PLANNED position) — not the other way
    // round, since "today" is later than any past transaction and would
    // otherwise always win, silently sorting by insertion order instead.
    const lastActivityDate =
      txns.length > 0
        ? txns.reduce((max, t) => (t.date > max ? t.date : max), txns[0].date)
        : row.updatedAt.toISOString().slice(0, 10);

    return {
      id: row.id,
      symbol: row.symbol,
      companyName: row.companyName,
      positionType: row.positionType,
      computed,
      lastActivityDate,
    };
  });

  rows.sort((a, b) => (a.lastActivityDate < b.lastActivityDate ? 1 : -1));

  return <JournalList rows={rows} />;
}
