-- First create the necessary extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create a function for UUID generation if it doesn't exist
CREATE OR REPLACE FUNCTION gen_random_uuid()
RETURNS uuid
AS $$
BEGIN
    RETURN gen_random_uuid();
EXCEPTION
    WHEN undefined_function THEN
        RETURN uuid_generate_v4();
END;
$$ LANGUAGE plpgsql;

-- Create tables in the correct order (dependencies first)

-- Users table
CREATE TABLE IF NOT EXISTS "users" (
    "id" serial PRIMARY KEY NOT NULL,
    "name" text NOT NULL,
    "email" varchar(255) NOT NULL UNIQUE,
    "password_hash" text NOT NULL,
    "role" varchar(50) NOT NULL DEFAULT 'user',
    "avatar" text,
    "email_verified" boolean DEFAULT false,
    "job_title" varchar(255),
    "department" varchar(255),
    "location" varchar(255),
    "bio" text,
    "language" varchar(10) DEFAULT 'en-US',
    "timezone" varchar(50) DEFAULT 'Africa/Nairobi',
    "preferences" jsonb DEFAULT '{}',
    "status" varchar(20) DEFAULT 'offline',
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
);

-- Chats table
CREATE TABLE IF NOT EXISTS "chats" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "type" varchar(20) NOT NULL,
    "name" text NOT NULL,
    "avatar" text,
    "is_pinned" boolean DEFAULT false,
    "is_muted" boolean DEFAULT false,
    "is_archived" boolean DEFAULT false,
    "is_group_admin" boolean DEFAULT false,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
);

-- Chat participants table
CREATE TABLE IF NOT EXISTS "chat_participants" (
    "chat_id" uuid NOT NULL,
    "user_id" integer NOT NULL,
    "joined_at" timestamp DEFAULT now(),
    "last_read" timestamp,
    CONSTRAINT "chat_participants_chat_id_user_id_pk" PRIMARY KEY("chat_id","user_id")
);

-- Messages table
CREATE TABLE IF NOT EXISTS "messages" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "content" text NOT NULL,
    "type" varchar(20) NOT NULL,
    "timestamp" timestamp DEFAULT now(),
    "file_url" text,
    "file_name" text,
    "file_size" integer,
    "is_read" boolean DEFAULT false,
    "deleted" boolean DEFAULT false,
    "chat_id" uuid NOT NULL,
    "sender_id" integer NOT NULL,
    "reply_to_id" uuid
);

-- Reactions table
CREATE TABLE IF NOT EXISTS "reactions" (
    "emoji" text NOT NULL,
    "message_id" uuid NOT NULL,
    "user_id" integer NOT NULL,
    CONSTRAINT "reactions_message_id_user_id_pk" PRIMARY KEY("message_id","user_id")
);

-- Password reset tokens table
CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
    "id" serial PRIMARY KEY NOT NULL,
    "user_id" serial NOT NULL,
    "token" text NOT NULL UNIQUE,
    "expires_at" timestamp NOT NULL,
    "created_at" timestamp DEFAULT now()
);

-- Other tables as needed...

-- Add foreign key constraints
ALTER TABLE "chat_participants" ADD CONSTRAINT "chat_participants_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "chat_participants" ADD CONSTRAINT "chat_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "messages" ADD CONSTRAINT "messages_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "messages" ADD CONSTRAINT "messages_reply_to_id_fkey" FOREIGN KEY ("reply_to_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "reactions" ADD CONSTRAINT "reactions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
