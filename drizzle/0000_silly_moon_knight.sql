CREATE TYPE "public"."direction" AS ENUM('LONG', 'SHORT');--> statement-breakpoint
CREATE TYPE "public"."exchange" AS ENUM('NSE', 'BSE');--> statement-breakpoint
CREATE TYPE "public"."management_note_type" AS ENUM('ADD', 'REDUCE', 'STOP_MOVED', 'TARGET_CHANGED', 'PARTIAL_EXIT', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."position_type" AS ENUM('SWING', 'INVESTMENT', 'POSITIONAL');--> statement-breakpoint
CREATE TYPE "public"."transaction_side" AS ENUM('BUY', 'SELL');--> statement-breakpoint
CREATE TABLE "management_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"position_id" uuid NOT NULL,
	"type" "management_note_type" NOT NULL,
	"date" date NOT NULL,
	"text" text NOT NULL,
	"old_value" numeric,
	"new_value" numeric,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "playbooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"rules" jsonb NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"invested_value" numeric NOT NULL,
	"current_value" numeric NOT NULL,
	"realized_pnl_to_date" numeric NOT NULL,
	"unrealized_pnl" numeric NOT NULL,
	"open_positions_count" integer NOT NULL,
	CONSTRAINT "portfolio_snapshots_date_unique" UNIQUE("date")
);
--> statement-breakpoint
CREATE TABLE "positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"symbol" text NOT NULL,
	"company_name" text NOT NULL,
	"exchange" "exchange" NOT NULL,
	"yahoo_symbol" text NOT NULL,
	"direction" "direction" DEFAULT 'LONG' NOT NULL,
	"position_type" "position_type" NOT NULL,
	"strategy" text NOT NULL,
	"setup" text NOT NULL,
	"playbook_id" uuid,
	"rules_followed" jsonb,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"planned_entry" numeric NOT NULL,
	"initial_stop_loss" numeric NOT NULL,
	"current_stop_loss" numeric,
	"target_price" numeric,
	"planned_qty" integer NOT NULL,
	"thesis_why" text DEFAULT '' NOT NULL,
	"market_context" text DEFAULT '' NOT NULL,
	"technical_reasoning" text DEFAULT '' NOT NULL,
	"fundamental_reasoning" text DEFAULT '' NOT NULL,
	"invalidation" text DEFAULT '' NOT NULL,
	"confidence" smallint,
	"fomo" smallint,
	"discipline" smallint,
	"psych_notes" text DEFAULT '' NOT NULL,
	"went_well" text DEFAULT '' NOT NULL,
	"went_wrong" text DEFAULT '' NOT NULL,
	"learned" text DEFAULT '' NOT NULL,
	"mistakes" text DEFAULT '' NOT NULL,
	"grade" text,
	"current_price" numeric,
	"previous_close" numeric,
	"price_updated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"position_id" uuid NOT NULL,
	"date" date NOT NULL,
	"close" numeric NOT NULL,
	"previous_close" numeric,
	"fetched_at" timestamp with time zone NOT NULL,
	CONSTRAINT "price_snapshots_position_date_unique" UNIQUE("position_id","date")
);
--> statement-breakpoint
CREATE TABLE "screenshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"position_id" uuid NOT NULL,
	"blob_url" text NOT NULL,
	"caption" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"account_capital" numeric NOT NULL,
	"strategies" text[] DEFAULT '{}'::text[] NOT NULL,
	"setups" text[] DEFAULT '{}'::text[] NOT NULL,
	"default_exchange" text DEFAULT 'NSE' NOT NULL,
	"breakeven_handling" text DEFAULT 'EXCLUDE' NOT NULL,
	CONSTRAINT "settings_singleton_check" CHECK ("settings"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"position_id" uuid NOT NULL,
	"side" "transaction_side" NOT NULL,
	"quantity" integer NOT NULL,
	"price" numeric NOT NULL,
	"date" date NOT NULL,
	"total_charges" numeric DEFAULT '0' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"seq" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "management_notes" ADD CONSTRAINT "management_notes_position_id_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_playbook_id_playbooks_id_fk" FOREIGN KEY ("playbook_id") REFERENCES "public"."playbooks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_snapshots" ADD CONSTRAINT "price_snapshots_position_id_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screenshots" ADD CONSTRAINT "screenshots_position_id_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_position_id_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "positions_symbol_idx" ON "positions" USING btree ("symbol");--> statement-breakpoint
CREATE INDEX "transactions_position_date_seq_idx" ON "transactions" USING btree ("position_id","date","seq");