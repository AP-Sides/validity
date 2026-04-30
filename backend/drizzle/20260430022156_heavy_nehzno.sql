CREATE TABLE "nutrition_myths_cache" (
	"id" text PRIMARY KEY NOT NULL,
	"date_key" text NOT NULL,
	"claim" text NOT NULL,
	"verdict" text NOT NULL,
	"one_liner" text NOT NULL,
	"explanation" text NOT NULL,
	"studies_json" text DEFAULT '[]' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
