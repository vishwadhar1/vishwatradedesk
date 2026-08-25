import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";
import nseSymbols from "@/data/nse-symbols.json";
import { NewPositionForm } from "./NewPositionForm";

export default async function NewPositionPage() {
  const [row] = await db.select().from(settings).where(eq(settings.id, 1));

  const activeStrategies = (row?.strategies ?? [])
    .filter((s) => !s.archived)
    .map((s) => s.name);
  const activeSetups = (row?.setups ?? [])
    .filter((s) => !s.archived)
    .map((s) => s.name);
  const accountCapital = row?.accountCapital
    ? Number(row.accountCapital)
    : null;

  return (
    <NewPositionForm
      symbolMaster={nseSymbols}
      strategies={activeStrategies}
      setups={activeSetups}
      accountCapital={accountCapital}
    />
  );
}
