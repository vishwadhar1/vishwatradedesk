ALTER TABLE "positions" ALTER COLUMN "planned_entry" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "positions" ALTER COLUMN "initial_stop_loss" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "positions" ALTER COLUMN "planned_qty" DROP NOT NULL;