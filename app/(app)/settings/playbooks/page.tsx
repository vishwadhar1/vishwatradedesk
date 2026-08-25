import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { playbooks, positions } from "@/db/schema";
import { PlaybooksList } from "./PlaybooksList";

export default async function PlaybooksSettingsPage() {
  const rows = await db
    .select({
      id: playbooks.id,
      name: playbooks.name,
      description: playbooks.description,
      rules: playbooks.rules,
      isArchived: playbooks.isArchived,
      positionCount: sql<number>`count(${positions.id})::int`,
    })
    .from(playbooks)
    .leftJoin(positions, eq(positions.playbookId, playbooks.id))
    .groupBy(playbooks.id)
    .orderBy(playbooks.name);

  return <PlaybooksList playbooks={rows} />;
}
