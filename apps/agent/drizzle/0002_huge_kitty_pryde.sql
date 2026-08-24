ALTER TYPE "public"."job_status" ADD VALUE 'casting' BEFORE 'cast';--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "proposal_type" varchar(24) DEFAULT '' NOT NULL;