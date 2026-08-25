ALTER TABLE "settings" ALTER COLUMN "strategies" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "strategies" SET DATA TYPE jsonb USING '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "strategies" SET DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "setups" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "setups" SET DATA TYPE jsonb USING '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "setups" SET DEFAULT '[]'::jsonb;