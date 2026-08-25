import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { ManagedLists } from "./ManagedLists";

export default async function ListsSettingsPage() {
  const [row] = await db.select().from(settings).where(eq(settings.id, 1));

  return (
    <ManagedLists
      strategies={row?.strategies ?? []}
      setups={row?.setups ?? []}
    />
  );
}
