"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { managementNotes, playbooks, positions } from "@/db/schema";
import { todayIso, type RuleSnapshot } from "@/lib/calc/position";

function parsePositiveDecimal(rawValue: string, label: string): string | null {
  const trimmed = rawValue.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`${label} must be a positive number.`);
  }
  return trimmed;
}

// ---- Create ----

export type CreatePositionInput = {
  symbol: string;
  companyName: string;
  exchange: "NSE" | "BSE";
  yahooSymbol: string;
  direction: "LONG" | "SHORT";
  positionType: "SWING" | "INVESTMENT" | "POSITIONAL";
  strategy: string;
  setup: string;
  tags: string[];
  plannedEntry: string | null;
  initialStopLoss: string | null;
  targetPrice: string | null;
  plannedQty: number | null;
};

export async function createPosition(input: CreatePositionInput) {
  const symbol = input.symbol.trim().toUpperCase();
  if (!symbol) throw new Error("Symbol is required.");
  if (input.direction !== "LONG" && input.direction !== "SHORT") {
    throw new Error("Direction is required.");
  }

  const companyName = input.companyName.trim() || symbol;
  const yahooSymbol =
    input.yahooSymbol.trim() ||
    `${symbol}.${input.exchange === "BSE" ? "BO" : "NS"}`;

  const [row] = await db
    .insert(positions)
    .values({
      symbol,
      companyName,
      exchange: input.exchange,
      yahooSymbol,
      direction: input.direction,
      positionType: input.positionType,
      strategy: input.strategy.trim(),
      setup: input.setup.trim(),
      tags: input.tags,
      plannedEntry: input.plannedEntry,
      initialStopLoss: input.initialStopLoss,
      // Current stop starts as a copy of the initial anchor, if one was
      // given up front — it only diverges once the stop is actually trailed.
      currentStopLoss: input.initialStopLoss,
      targetPrice: input.targetPrice,
      plannedQty: input.plannedQty,
    })
    .returning({ id: positions.id });

  revalidatePath("/journal");
  redirect(`/journal/${row.id}`);
}

// ---- Basic fields (Plan section, no side effects) ----

export type BasicFieldUpdate = Partial<{
  symbol: string;
  companyName: string;
  exchange: "NSE" | "BSE";
  yahooSymbol: string;
  direction: "LONG" | "SHORT";
  positionType: "SWING" | "INVESTMENT" | "POSITIONAL";
  strategy: string;
  setup: string;
}>;

export async function updateBasicFields(
  positionId: string,
  update: BasicFieldUpdate,
) {
  await db.update(positions).set(update).where(eq(positions.id, positionId));
  revalidatePath(`/journal/${positionId}`);
  revalidatePath("/journal");
}

export async function updateTags(positionId: string, tags: string[]) {
  const cleaned = [...new Set(tags.map((t) => t.trim()).filter(Boolean))];
  await db
    .update(positions)
    .set({ tags: cleaned })
    .where(eq(positions.id, positionId));
  revalidatePath(`/journal/${positionId}`);
}

export async function updatePlannedEntry(positionId: string, rawValue: string) {
  const value = parsePositiveDecimal(rawValue, "Planned entry");
  await db
    .update(positions)
    .set({ plannedEntry: value })
    .where(eq(positions.id, positionId));
  revalidatePath(`/journal/${positionId}`);
}

export async function updatePlannedQty(positionId: string, rawValue: string) {
  const trimmed = rawValue.trim();
  const qty = trimmed === "" ? null : Number(trimmed);
  if (
    qty !== null &&
    (!Number.isFinite(qty) || qty <= 0 || !Number.isInteger(qty))
  ) {
    throw new Error("Planned quantity must be a positive whole number.");
  }
  await db
    .update(positions)
    .set({ plannedQty: qty })
    .where(eq(positions.id, positionId));
  revalidatePath(`/journal/${positionId}`);
}

// ---- initial_stop_loss: write-once ----

export async function setInitialStopLoss(positionId: string, rawValue: string) {
  const value = parsePositiveDecimal(rawValue, "Initial stop loss");
  if (value === null) throw new Error("Initial stop loss is required.");

  const [row] = await db
    .select({ initialStopLoss: positions.initialStopLoss })
    .from(positions)
    .where(eq(positions.id, positionId));
  if (!row) throw new Error("Position not found.");
  if (row.initialStopLoss !== null) {
    throw new Error("Initial stop loss is write-once and already set.");
  }

  // Current stop starts as a copy of the initial anchor — not a live
  // reference, so trailing it later never rewrites this moment.
  await db
    .update(positions)
    .set({ initialStopLoss: value, currentStopLoss: value })
    .where(eq(positions.id, positionId));
  revalidatePath(`/journal/${positionId}`);
}

// ---- current_stop_loss / target_price: each edit logs a management note ----

async function updateWithManagementNote(
  positionId: string,
  field: "currentStopLoss" | "targetPrice",
  rawValue: string,
  noteType: "STOP_MOVED" | "TARGET_CHANGED",
  label: string,
) {
  const value = parsePositiveDecimal(rawValue, label);

  const [row] =
    field === "currentStopLoss"
      ? await db
          .select({ old: positions.currentStopLoss })
          .from(positions)
          .where(eq(positions.id, positionId))
      : await db
          .select({ old: positions.targetPrice })
          .from(positions)
          .where(eq(positions.id, positionId));
  if (!row) throw new Error("Position not found.");
  if (row.old === value) return; // nothing actually changed

  await db.batch([
    field === "currentStopLoss"
      ? db
          .update(positions)
          .set({ currentStopLoss: value })
          .where(eq(positions.id, positionId))
      : db
          .update(positions)
          .set({ targetPrice: value })
          .where(eq(positions.id, positionId)),
    db.insert(managementNotes).values({
      positionId,
      type: noteType,
      date: todayIso(),
      text: `${label} changed from ${row.old ?? "—"} to ${value ?? "—"}`,
      oldValue: row.old,
      newValue: value,
    }),
  ]);

  revalidatePath(`/journal/${positionId}`);
}

export async function updateCurrentStopLoss(
  positionId: string,
  rawValue: string,
) {
  await updateWithManagementNote(
    positionId,
    "currentStopLoss",
    rawValue,
    "STOP_MOVED",
    "Stop",
  );
}

export async function updateTargetPrice(positionId: string, rawValue: string) {
  await updateWithManagementNote(
    positionId,
    "targetPrice",
    rawValue,
    "TARGET_CHANGED",
    "Target",
  );
}

// ---- Playbook selection + rule checklist ----

export async function updatePlaybookSelection(
  positionId: string,
  playbookId: string | null,
) {
  if (playbookId === null) {
    await db
      .update(positions)
      .set({ playbookId: null, rulesFollowed: null })
      .where(eq(positions.id, positionId));
    revalidatePath(`/journal/${positionId}`);
    return;
  }

  const [playbook] = await db
    .select()
    .from(playbooks)
    .where(eq(playbooks.id, playbookId));
  if (!playbook) throw new Error("Playbook not found.");

  // Snapshot the rule ids AND current text at the moment of scoring — never
  // a live reference back to the playbook, so editing it later can't
  // rewrite what this position was actually scored against.
  const freshSnapshot: RuleSnapshot[] = playbook.rules.map((rule) => ({
    id: rule.id,
    text: rule.text,
    followed: false,
  }));

  await db
    .update(positions)
    .set({ playbookId, rulesFollowed: freshSnapshot })
    .where(eq(positions.id, positionId));
  revalidatePath(`/journal/${positionId}`);
}

export async function updateRulesFollowed(
  positionId: string,
  rules: RuleSnapshot[],
) {
  await db
    .update(positions)
    .set({ rulesFollowed: rules })
    .where(eq(positions.id, positionId));
  revalidatePath(`/journal/${positionId}`);
}
