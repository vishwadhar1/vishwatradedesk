"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  playbooks,
  positions,
  settings,
  type ManagedListItem,
} from "@/db/schema";

// ---- General ----

export async function updateGeneralSettings(formData: FormData) {
  const accountCapital = String(formData.get("accountCapital") ?? "");
  const defaultExchange = String(formData.get("defaultExchange") ?? "NSE");
  const breakevenHandling = String(
    formData.get("breakevenHandling") ?? "EXCLUDE",
  );

  const capital = Number(accountCapital);
  if (!Number.isFinite(capital) || capital <= 0) {
    throw new Error("Account capital must be a positive number.");
  }
  if (defaultExchange !== "NSE" && defaultExchange !== "BSE") {
    throw new Error("Invalid exchange.");
  }
  if (
    breakevenHandling !== "EXCLUDE" &&
    breakevenHandling !== "COUNT_AS_LOSS"
  ) {
    throw new Error("Invalid breakeven handling.");
  }

  // Singleton row (CHECK id = 1) — always upsert against id 1, never a bare insert.
  await db
    .insert(settings)
    .values({
      id: 1,
      accountCapital,
      defaultExchange,
      breakevenHandling,
      strategies: [],
      setups: [],
    })
    .onConflictDoUpdate({
      target: settings.id,
      set: { accountCapital, defaultExchange, breakevenHandling },
    });

  revalidatePath("/settings/general");
}

// ---- Lists (strategies / setups) ----

type ListKind = "strategy" | "setup";

async function getManagedList(kind: ListKind): Promise<ManagedListItem[]> {
  const [row] = await db
    .select({
      list: kind === "strategy" ? settings.strategies : settings.setups,
    })
    .from(settings)
    .where(eq(settings.id, 1));
  return row?.list ?? [];
}

async function writeManagedList(kind: ListKind, list: ManagedListItem[]) {
  await db
    .update(settings)
    .set(kind === "strategy" ? { strategies: list } : { setups: list })
    .where(eq(settings.id, 1));
}

async function addToList(kind: ListKind, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;

  const list = await getManagedList(kind);
  if (list.some((item) => item.name === trimmed)) return; // already present

  await writeManagedList(kind, [...list, { name: trimmed, archived: false }]);
  revalidatePath("/settings/lists");
}

/**
 * Renaming updates every position holding the old value. The list update
 * and the position backfill run as one atomic Neon HTTP batch — either both
 * land or neither does, so a half-applied rename can't happen.
 */
async function renameInList(kind: ListKind, oldName: string, newName: string) {
  const trimmed = newName.trim();
  if (!trimmed || trimmed === oldName) return;

  const list = await getManagedList(kind);
  if (list.some((item) => item.name === trimmed)) {
    throw new Error(`"${trimmed}" already exists.`);
  }
  const updatedList = list.map((item) =>
    item.name === oldName ? { ...item, name: trimmed } : item,
  );

  const positionColumn =
    kind === "strategy" ? positions.strategy : positions.setup;
  const listUpdate =
    kind === "strategy"
      ? db
          .update(settings)
          .set({ strategies: updatedList })
          .where(eq(settings.id, 1))
      : db
          .update(settings)
          .set({ setups: updatedList })
          .where(eq(settings.id, 1));

  await db.batch([
    listUpdate,
    db
      .update(positions)
      .set({ [kind]: trimmed })
      .where(eq(positionColumn, oldName)),
  ]);

  revalidatePath("/settings/lists");
}

async function archiveInList(kind: ListKind, name: string) {
  const list = await getManagedList(kind);
  const updated = list.map((item) =>
    item.name === name ? { ...item, archived: true } : item,
  );
  await writeManagedList(kind, updated);
  revalidatePath("/settings/lists");
}

export async function addStrategy(name: string) {
  await addToList("strategy", name);
}
export async function renameStrategy(oldName: string, newName: string) {
  await renameInList("strategy", oldName, newName);
}
export async function archiveStrategy(name: string) {
  await archiveInList("strategy", name);
}

export async function addSetup(name: string) {
  await addToList("setup", name);
}
export async function renameSetup(oldName: string, newName: string) {
  await renameInList("setup", oldName, newName);
}
export async function archiveSetup(name: string) {
  await archiveInList("setup", name);
}

// ---- Playbooks ----

export type PlaybookRuleInput = { id: string; text: string };

export async function createPlaybook(
  name: string,
  description: string,
  rules: PlaybookRuleInput[],
) {
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error("Name is required.");

  const [row] = await db
    .insert(playbooks)
    .values({ name: trimmedName, description, rules })
    .returning({ id: playbooks.id });

  revalidatePath("/settings/playbooks");
  redirect(`/settings/playbooks/${row.id}`);
}

/**
 * Updates only the playbooks table — never touches positions.rules_followed.
 * That's what makes the snapshot guarantee hold: a position's scored rule
 * ids/text/answers are a separate copy, not a live reference back here.
 */
export async function updatePlaybook(
  id: string,
  name: string,
  description: string,
  rules: PlaybookRuleInput[],
) {
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error("Name is required.");

  await db
    .update(playbooks)
    .set({ name: trimmedName, description, rules })
    .where(eq(playbooks.id, id));

  revalidatePath(`/settings/playbooks/${id}`);
  revalidatePath("/settings/playbooks");
}

export async function archivePlaybook(id: string) {
  await db
    .update(playbooks)
    .set({ isArchived: true })
    .where(eq(playbooks.id, id));
  revalidatePath("/settings/playbooks");
}
