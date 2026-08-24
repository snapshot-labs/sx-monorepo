CREATE TYPE "public"."job_status" AS ENUM('pending', 'predicted', 'cast', 'skipped', 'failed');--> statement-breakpoint
CREATE TABLE "jobs" (
	"proposal" varchar(66) NOT NULL,
	"space" varchar(64) NOT NULL,
	"voter" varchar(100) NOT NULL,
	"status" "job_status" DEFAULT 'pending' NOT NULL,
	"choice" integer,
	"confidence" varchar(8),
	"reasoning" text,
	"skip_reason" varchar(64),
	"attempts" smallint DEFAULT 0 NOT NULL,
	"not_before" integer NOT NULL,
	"vote_id" varchar(66),
	"created" integer NOT NULL,
	"updated" integer NOT NULL,
	CONSTRAINT "jobs_proposal_voter_pk" PRIMARY KEY("proposal","voter")
);
