ALTER TYPE "public"."job_status" ADD VALUE 'predicting' BEFORE 'predicted';--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "model" varchar(64);--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "cost" numeric(10, 6);--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "proposal_end" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "locked_until" integer;