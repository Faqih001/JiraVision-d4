-- Grant all privileges on the database to jiravision_dev
-- Grant all privileges on the database to jiravision_dev
USE jiravisiondb_local;
GRANT CONTROL ON DATABASE::jiravisiondb_local TO jiravision_dev;

-- Grant all privileges on all tables in the schema to jiravision_dev
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::dbo TO jiravision_dev;

-- Grant all privileges on all sequences in the schema to jiravision_dev
GRANT REFERENCES ON SCHEMA::dbo TO jiravision_dev;

-- Grant all privileges on the schema to jiravision_dev
GRANT CONTROL ON SCHEMA::dbo TO jiravision_dev;

-- Make sure jiravision_dev has ownership of all tables
ALTER AUTHORIZATION ON OBJECT::dbo.users TO jiravision_dev;
ALTER AUTHORIZATION ON OBJECT::dbo.chats TO jiravision_dev;
ALTER AUTHORIZATION ON OBJECT::dbo.chat_participants TO jiravision_dev;
ALTER AUTHORIZATION ON OBJECT::dbo.messages TO jiravision_dev;
ALTER AUTHORIZATION ON OBJECT::dbo.reactions TO jiravision_dev;
ALTER AUTHORIZATION ON OBJECT::dbo.password_reset_tokens TO jiravision_dev;
ALTER AUTHORIZATION ON OBJECT::dbo.ai_insights TO jiravision_dev;
ALTER AUTHORIZATION ON OBJECT::dbo.ethical_metrics TO jiravision_dev;
ALTER AUTHORIZATION ON OBJECT::dbo.gamification TO jiravision_dev;
ALTER AUTHORIZATION ON OBJECT::dbo.kanban_columns TO jiravision_dev;
ALTER AUTHORIZATION ON OBJECT::dbo.kanban_task_attachments TO jiravision_dev;
ALTER AUTHORIZATION ON OBJECT::dbo.kanban_task_comments TO jiravision_dev;
ALTER AUTHORIZATION ON OBJECT::dbo.kanban_tasks TO jiravision_dev;
ALTER AUTHORIZATION ON OBJECT::dbo.sprint_analytics TO jiravision_dev;
ALTER AUTHORIZATION ON OBJECT::dbo.sprints TO jiravision_dev;
ALTER AUTHORIZATION ON OBJECT::dbo.tasks TO jiravision_dev;
ALTER AUTHORIZATION ON OBJECT::dbo.wellbeing_metrics TO jiravision_dev;