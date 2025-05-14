CREATE TABLE "ai_insights" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" varchar(50) NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "chat_participants" (
	"id" uniqueidentifier PRIMARY KEY DEFAULT NEWID() NOT NULL,
	"chat_id" uniqueidentifier NOT NULL,
	"user_id" integer NOT NULL,
	"joined_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"last_read" timestamp,
	CONSTRAINT "chat_participants_chat_id_user_id_pk" PRIMARY KEY("chat_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "chats" (
	"id" uniqueidentifier PRIMARY KEY DEFAULT NEWID() NOT NULL,
	"type" varchar(20) NOT NULL,
	"name" text NOT NULL,
	"avatar" text,
	"is_pinned" bit DEFAULT 0,
	"is_muted" bit DEFAULT 0,
	"is_archived" bit DEFAULT 0,
	"is_group_admin" bit DEFAULT 0,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "ethical_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"pay_equity_score" integer NOT NULL,
	"workload_balance_score" integer NOT NULL,
	"dei_task_distribution_score" integer NOT NULL,
	"overtime_compliance" integer NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "gamification" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"tasks_completed" integer DEFAULT 0 NOT NULL,
	"achievements" nvarchar(max) DEFAULT '[]',
	"skill_trees" nvarchar(max) DEFAULT '{}',
	"rewards" nvarchar(max) DEFAULT '[]',
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "kanban_columns" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"color" text DEFAULT 'bg-slate-400' NOT NULL,
	"order" integer NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "kanban_task_attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"filename" text NOT NULL,
	"file_url" text NOT NULL,
	"file_size" integer NOT NULL,
	"file_type" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "kanban_task_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "kanban_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"priority" varchar(20) DEFAULT 'medium' NOT NULL,
	"status" varchar(50) DEFAULT 'backlog' NOT NULL,
	"column_id" integer NOT NULL,
	"assignee_id" integer,
	"sprint_id" integer,
	"due_date" date,
	"order" integer NOT NULL,
	"tags" nvarchar(max),
	"attachments" integer DEFAULT 0,
	"comments" integer DEFAULT 0,
	"subtasks" nvarchar(max),
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uniqueidentifier PRIMARY KEY DEFAULT NEWID() NOT NULL,
	"content" text NOT NULL,
	"type" varchar(20) NOT NULL,
	"timestamp" timestamp DEFAULT CURRENT_TIMESTAMP,
	"file_url" text,
	"file_name" text,
	"file_size" integer,
	"is_read" bit DEFAULT 0,
	"deleted" bit DEFAULT 0,
	"chat_id" uniqueidentifier NOT NULL,
	"sender_id" integer NOT NULL,
	"reply_to_id" uniqueidentifier
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" serial NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "reactions" (
	"id" uniqueidentifier PRIMARY KEY DEFAULT NEWID() NOT NULL,
	"emoji" text NOT NULL,
	"message_id" uniqueidentifier NOT NULL,
	"user_id" integer NOT NULL,
	CONSTRAINT "reactions_message_id_user_id_pk" PRIMARY KEY("message_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "sprint_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"sprint_id" integer NOT NULL,
	"velocity" integer DEFAULT 0 NOT NULL,
	"completion_rate" integer DEFAULT 0 NOT NULL,
	"quality_score" integer DEFAULT 0 NOT NULL,
	"team_sentiment" varchar(50) DEFAULT 'neutral',
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "sprints" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" varchar(50) DEFAULT 'planning' NOT NULL,
	"capacity" integer DEFAULT 0 NOT NULL,
	"completed" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" varchar(50) DEFAULT 'todo' NOT NULL,
	"priority" varchar(50) DEFAULT 'medium' NOT NULL,
	"story_points" integer DEFAULT 0 NOT NULL,
	"assignee_id" integer,
	"sprint_id" integer,
	"due_date" date,
	"tags" nvarchar(max) DEFAULT '[]',
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"role" varchar(50) DEFAULT 'user' NOT NULL,
	"avatar" text,
	"email_verified" bit DEFAULT 0,
	"job_title" varchar(255),
	"department" varchar(255),
	"location" varchar(255),
	"bio" text,
	"language" varchar(10) DEFAULT 'en-US',
	"timezone" varchar(50) DEFAULT 'Africa/Nairobi',
	"preferences" nvarchar(max) DEFAULT '{}',
	"status" varchar(20) DEFAULT 'offline',
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "wellbeing_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"date" date NOT NULL,
	"wellbeing_score" integer NOT NULL,
	"mood" varchar(50) NOT NULL,
	"workload" varchar(50) NOT NULL,
	"stress_level" integer NOT NULL,
	"overtime_hours" decimal(10,2) DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE "chat_participants" ADD CONSTRAINT "chat_participants_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "chat_participants" ADD CONSTRAINT "chat_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id");
--> statement-breakpoint
ALTER TABLE "gamification" ADD CONSTRAINT "gamification_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id");
--> statement-breakpoint
ALTER TABLE "kanban_task_attachments" ADD CONSTRAINT "kanban_task_attachments_task_id_kanban_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "kanban_tasks"("id");
--> statement-breakpoint
ALTER TABLE "kanban_task_attachments" ADD CONSTRAINT "kanban_task_attachments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id");
--> statement-breakpoint
ALTER TABLE "kanban_task_comments" ADD CONSTRAINT "kanban_task_comments_task_id_kanban_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "kanban_tasks"("id");
--> statement-breakpoint
ALTER TABLE "kanban_task_comments" ADD CONSTRAINT "kanban_task_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id");
--> statement-breakpoint
ALTER TABLE "kanban_tasks" ADD CONSTRAINT "kanban_tasks_column_id_kanban_columns_id_fk" FOREIGN KEY ("column_id") REFERENCES "kanban_columns"("id");
--> statement-breakpoint
ALTER TABLE "kanban_tasks" ADD CONSTRAINT "kanban_tasks_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "users"("id");
--> statement-breakpoint
ALTER TABLE "kanban_tasks" ADD CONSTRAINT "kanban_tasks_sprint_id_sprints_id_fk" FOREIGN KEY ("sprint_id") REFERENCES "sprints"("id");
--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "users"("id");
--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_reply_to_id_messages_id_fk" FOREIGN KEY ("reply_to_id") REFERENCES "messages"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id");
--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id");
--> statement-breakpoint
ALTER TABLE "sprint_analytics" ADD CONSTRAINT "sprint_analytics_sprint_id_sprints_id_fk" FOREIGN KEY ("sprint_id") REFERENCES "sprints"("id");
--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "users"("id");
--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_sprint_id_sprints_id_fk" FOREIGN KEY ("sprint_id") REFERENCES "sprints"("id");
--> statement-breakpoint
ALTER TABLE "wellbeing_metrics" ADD CONSTRAINT "wellbeing_metrics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id");