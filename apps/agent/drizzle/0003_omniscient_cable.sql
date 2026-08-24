CREATE TABLE "contexts" (
	"address" varchar(100) NOT NULL,
	"space" varchar(64) NOT NULL,
	"context" text NOT NULL,
	"created" integer NOT NULL,
	"updated" integer NOT NULL,
	CONSTRAINT "contexts_address_space_pk" PRIMARY KEY("address","space")
);
