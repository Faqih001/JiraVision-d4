-- PostgreSQL permissions fix for JiraVision
-- This grants all necessary permissions to the jiravision_dev user

-- Grant all privileges on the database to jiravision_dev
GRANT ALL PRIVILEGES ON DATABASE jiravisiondb_local TO jiravision_dev;

-- Grant all privileges on all tables in the current schema to jiravision_dev
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO jiravision_dev;

-- Grant all privileges on all sequences in the current schema to jiravision_dev
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO jiravision_dev;

-- Grant all privileges on the schema to jiravision_dev
GRANT ALL PRIVILEGES ON SCHEMA public TO jiravision_dev;

-- Change ownership of all tables to jiravision_dev
-- This requires superuser privileges, so it should be run as postgres user
ALTER TABLE users OWNER TO jiravision_dev;
ALTER TABLE chats OWNER TO jiravision_dev;
ALTER TABLE chat_participants OWNER TO jiravision_dev;
ALTER TABLE messages OWNER TO jiravision_dev;
ALTER TABLE reactions OWNER TO jiravision_dev;
ALTER TABLE password_reset_tokens OWNER TO jiravision_dev;
ALTER TABLE ai_insights OWNER TO jiravision_dev;
ALTER TABLE ethical_metrics OWNER TO jiravision_dev;
ALTER TABLE gamification OWNER TO jiravision_dev;
ALTER TABLE kanban_columns OWNER TO jiravision_dev;
ALTER TABLE kanban_task_attachments OWNER TO jiravision_dev;
ALTER TABLE kanban_task_comments OWNER TO jiravision_dev;
ALTER TABLE kanban_tasks OWNER TO jiravision_dev;
ALTER TABLE sprint_analytics OWNER TO jiravision_dev;
ALTER TABLE sprints OWNER TO jiravision_dev;
ALTER TABLE tasks OWNER TO jiravision_dev;
ALTER TABLE wellbeing_metrics OWNER TO jiravision_dev;
