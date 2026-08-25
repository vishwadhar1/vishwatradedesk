import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const exchangeEnum = pgEnum("exchange", ["NSE", "BSE"]);
export const directionEnum = pgEnum("direction", ["LONG", "SHORT"]);
export const positionTypeEnum = pgEnum("position_type", [
  "SWING",
  "INVESTMENT",
  "POSITIONAL",
]);
export const transactionSideEnum = pgEnum("transaction_side", ["BUY", "SELL"]);
export const managementNoteTypeEnum = pgEnum("management_note_type", [
  "ADD",
  "REDUCE",
  "STOP_MOVED",
  "TARGET_CHANGED",
  "PARTIAL_EXIT",
  "OTHER",
]);

export type ManagedListItem = { name: string; archived: boolean };

// rules: [{ id: string, text: string }]
export const playbooks = pgTable("playbooks", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  rules: jsonb("rules").$type<{ id: string; text: string }[]>().notNull(),
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Status (PLANNED / OPEN / PARTIALLY_CLOSED / CLOSED) is derived from
// transactions in /lib/calc — never stored.
export const positions = pgTable(
  "positions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    symbol: text("symbol").notNull(),
    companyName: text("company_name").notNull(),
    exchange: exchangeEnum("exchange").notNull(),
    yahooSymbol: text("yahoo_symbol").notNull(),
    direction: directionEnum("direction").notNull().default("LONG"),
    positionType: positionTypeEnum("position_type").notNull(),
    strategy: text("strategy").notNull(),
    setup: text("setup").notNull(),

    playbookId: uuid("playbook_id").references(() => playbooks.id),
    // Snapshot of the playbook's rules (id + text) as they read at scoring
    // time, plus the answer — never re-derived from the live playbook, so
    // editing playbook.rules later can't alter a position's adherence or
    // the checklist text it was actually scored against.
    rulesFollowed:
      jsonb("rules_followed").$type<
        { id: string; text: string; followed: boolean }[]
      >(),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),

    plannedEntry: numeric("planned_entry").notNull(),
    initialStopLoss: numeric("initial_stop_loss").notNull(),
    currentStopLoss: numeric("current_stop_loss"),
    targetPrice: numeric("target_price"),
    plannedQty: integer("planned_qty").notNull(),

    thesisWhy: text("thesis_why").notNull().default(""),
    marketContext: text("market_context").notNull().default(""),
    technicalReasoning: text("technical_reasoning").notNull().default(""),
    fundamentalReasoning: text("fundamental_reasoning").notNull().default(""),
    invalidation: text("invalidation").notNull().default(""),

    confidence: smallint("confidence"),
    fomo: smallint("fomo"),
    discipline: smallint("discipline"),
    psychNotes: text("psych_notes").notNull().default(""),

    wentWell: text("went_well").notNull().default(""),
    wentWrong: text("went_wrong").notNull().default(""),
    learned: text("learned").notNull().default(""),
    mistakes: text("mistakes").notNull().default(""),
    grade: text("grade"),

    currentPrice: numeric("current_price"),
    previousClose: numeric("previous_close"),
    priceUpdatedAt: timestamp("price_updated_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("positions_symbol_idx").on(table.symbol)],
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    positionId: uuid("position_id")
      .notNull()
      .references(() => positions.id, { onDelete: "cascade" }),
    side: transactionSideEnum("side").notNull(),
    quantity: integer("quantity").notNull(),
    price: numeric("price").notNull(),
    date: date("date", { mode: "string" }).notNull(),
    totalCharges: numeric("total_charges").notNull().default("0"),
    notes: text("notes").notNull().default(""),
    seq: integer("seq").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("transactions_position_date_seq_idx").on(
      table.positionId,
      table.date,
      table.seq,
    ),
  ],
);

export const managementNotes = pgTable("management_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  positionId: uuid("position_id")
    .notNull()
    .references(() => positions.id, { onDelete: "cascade" }),
  type: managementNoteTypeEnum("type").notNull(),
  date: date("date", { mode: "string" }).notNull(),
  text: text("text").notNull(),
  oldValue: numeric("old_value"),
  newValue: numeric("new_value"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const screenshots = pgTable("screenshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  positionId: uuid("position_id")
    .notNull()
    .references(() => positions.id, { onDelete: "cascade" }),
  blobUrl: text("blob_url").notNull(),
  caption: text("caption").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const priceSnapshots = pgTable(
  "price_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    positionId: uuid("position_id")
      .notNull()
      .references(() => positions.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    close: numeric("close").notNull(),
    previousClose: numeric("previous_close"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    unique("price_snapshots_position_date_unique").on(
      table.positionId,
      table.date,
    ),
  ],
);

export const portfolioSnapshots = pgTable("portfolio_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  date: date("date", { mode: "string" }).notNull().unique(),
  investedValue: numeric("invested_value").notNull(),
  currentValue: numeric("current_value").notNull(),
  realizedPnlToDate: numeric("realized_pnl_to_date").notNull(),
  unrealizedPnl: numeric("unrealized_pnl").notNull(),
  openPositionsCount: integer("open_positions_count").notNull(),
});

// Singleton row — id is always 1.
export const settings = pgTable(
  "settings",
  {
    id: smallint("id").primaryKey().default(1),
    accountCapital: numeric("account_capital").notNull(),
    // Archiving hides a value from new-position dropdowns without deleting
    // it — positions already holding it (a plain text column, not an FK)
    // keep displaying it, and it stays available to Trade Log filters.
    strategies: jsonb("strategies")
      .$type<ManagedListItem[]>()
      .notNull()
      .default([]),
    setups: jsonb("setups").$type<ManagedListItem[]>().notNull().default([]),
    defaultExchange: text("default_exchange").notNull().default("NSE"),
    breakevenHandling: text("breakeven_handling").notNull().default("EXCLUDE"),
  },
  (table) => [check("settings_singleton_check", sql`${table.id} = 1`)],
);
