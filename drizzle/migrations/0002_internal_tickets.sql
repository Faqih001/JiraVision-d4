CREATE TABLE IF NOT EXISTS "ticket_departments" (
  "id" serial PRIMARY KEY NOT NULL,
  "organization_id" integer NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "name" varchar(120) NOT NULL,
  "code" varchar(40) NOT NULL,
  "manager_id" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "ticket_departments_org_code_idx" ON "ticket_departments" ("organization_id", "code");

CREATE TABLE IF NOT EXISTS "tickets" (
  "id" serial PRIMARY KEY NOT NULL,
  "organization_id" integer NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "subject" varchar(255) NOT NULL,
  "description" text NOT NULL,
  "status" varchar(30) DEFAULT 'new' NOT NULL,
  "priority" varchar(20) DEFAULT 'medium' NOT NULL,
  "category" varchar(80),
  "requester_id" integer NOT NULL REFERENCES "users"("id"),
  "created_by" integer NOT NULL REFERENCES "users"("id"),
  "assignee_id" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "department_id" integer REFERENCES "ticket_departments"("id") ON DELETE SET NULL,
  "sla_due_at" timestamp with time zone,
  "resolved_at" timestamp with time zone,
  "closed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "tickets_org_status_idx" ON "tickets" ("organization_id", "status");
CREATE INDEX IF NOT EXISTS "tickets_org_updated_idx" ON "tickets" ("organization_id", "updated_at");
CREATE INDEX IF NOT EXISTS "tickets_requester_idx" ON "tickets" ("requester_id");
CREATE INDEX IF NOT EXISTS "tickets_assignee_idx" ON "tickets" ("assignee_id");

CREATE TABLE IF NOT EXISTS "ticket_comments" (
  "id" serial PRIMARY KEY NOT NULL,
  "ticket_id" integer NOT NULL REFERENCES "tickets"("id") ON DELETE CASCADE,
  "author_id" integer NOT NULL REFERENCES "users"("id"),
  "body" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "ticket_comments_ticket_created_idx" ON "ticket_comments" ("ticket_id", "created_at");

CREATE TABLE IF NOT EXISTS "ticket_events" (
  "id" serial PRIMARY KEY NOT NULL,
  "ticket_id" integer NOT NULL REFERENCES "tickets"("id") ON DELETE CASCADE,
  "actor_id" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "type" varchar(40) NOT NULL,
  "from_value" text,
  "to_value" text,
  "metadata" jsonb DEFAULT '{}' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "ticket_events_ticket_created_idx" ON "ticket_events" ("ticket_id", "created_at");
