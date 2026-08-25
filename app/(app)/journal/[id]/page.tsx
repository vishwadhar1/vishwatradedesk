import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { playbooks, positions, settings, transactions } from "@/db/schema";
import { computePosition, type ComputedPosition } from "@/lib/calc/position";
import { toPositionInput, toTransactionInput } from "../position-mapper";
import { PositionDetail } from "./PositionDetail";

export default async function PositionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [position] = await db
    .select()
    .from(positions)
    .where(eq(positions.id, id));
  if (!position) notFound();

  const txnRows = await db
    .select()
    .from(transactions)
    .where(eq(transactions.positionId, id));
  const txns = txnRows.map(toTransactionInput);

  let computed: ComputedPosition | null = null;
  let computeError: string | null = null;
  try {
    computed = computePosition(toPositionInput(position), txns);
  } catch (e) {
    computeError =
      e instanceof Error ? e.message : "Could not compute this position.";
  }

  const [settingsRow] = await db
    .select()
    .from(settings)
    .where(eq(settings.id, 1));
  const allPlaybooks = await db.select().from(playbooks);

  // Archived entries are hidden from selection, but a value this position
  // already uses stays available so it keeps rendering correctly.
  const strategies = (settingsRow?.strategies ?? [])
    .filter((s) => !s.archived || s.name === position.strategy)
    .map((s) => s.name);
  const setups = (settingsRow?.setups ?? [])
    .filter((s) => !s.archived || s.name === position.setup)
    .map((s) => s.name);
  const playbookOptions = allPlaybooks
    .filter((p) => !p.isArchived || p.id === position.playbookId)
    .map((p) => ({ id: p.id, name: p.name }));

  return (
    <PositionDetail
      position={position}
      computed={computed}
      computeError={computeError}
      strategies={strategies}
      setups={setups}
      playbooks={playbookOptions}
    />
  );
}
