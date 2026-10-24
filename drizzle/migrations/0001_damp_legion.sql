CREATE TABLE "calendar_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"location" text,
	"event_type" varchar(50) DEFAULT 'meeting' NOT NULL,
	"organizer_id" integer NOT NULL,
	"is_all_day" boolean DEFAULT false,
	"is_recurring" boolean DEFAULT false,
	"recurring_pattern" jsonb DEFAULT '{}'::jsonb,
	"attendees" jsonb DEFAULT '[]'::jsonb,
	"color" varchar(50) DEFAULT 'blue',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" varchar(50) DEFAULT 'info' NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"is_read" boolean DEFAULT false,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "messages" DROP CONSTRAINT "messages_reply_to_id_messages_id_fk";
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "skills" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_organizer_id_users_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;