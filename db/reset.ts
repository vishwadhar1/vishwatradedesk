import { getTableName } from "drizzle-orm";
import "./env";
import { db } from "./index";
import {
  managementNotes,
  playbooks,
  portfolioSnapshots,
  positions,
  priceSnapshots,
  screenshots,
  settings,
  transactions,
} from "./schema";

async function main() {
  const tableNames = [
    transactions,
    managementNotes,
    screenshots,
    priceSnapshots,
    portfolioSnapshots,
    positions,
    playbooks,
    settings,
  ]
    .map(getTableName)
    .join(", ");

  await db.execute(`truncate table ${tableNames} restart identity cascade`);
  console.log("cleared all demo data");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
