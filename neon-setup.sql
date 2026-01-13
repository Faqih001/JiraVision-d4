-- JiraVision Neon Database Schema
-- Complete SQL script to create all necessary tables and columns
-- Run this script in Neon SQL Editor to set up the database

-- =============================================
-- 1. USERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  avatar TEXT,
  email_verified BOOLEAN DEFAULT false,
  
  -- Additional user profile fields
  job_title VARCHAR(255),
  department VARCHAR(255),
  location VARCHAR(255),
  bio TEXT,
  language VARCHAR(10) DEFAULT 'en-US',
  timezone VARCHAR(50) DEFAULT 'Africa/Nairobi',
  preferences JSONB DEFAULT '{}',
  
  -- User status for chat
  status VARCHAR(20) DEFAULT 'offline',
  
  -- Team member skills
  skills JSONB DEFAULT '[]',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- =============================================
-- 2. PASSWORD RESET TOKENS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);

-- =============================================
-- 3. SPRINTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS sprints (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'planning',
  capacity INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sprints_status ON sprints(status);
CREATE INDEX IF NOT EXISTS idx_sprints_dates ON sprints(start_date, end_date);

-- =============================================
-- 4. TASKS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'todo',
  priority VARCHAR(50) NOT NULL DEFAULT 'medium',
  story_points INTEGER NOT NULL DEFAULT 0,
  assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  sprint_id INTEGER REFERENCES sprints(id) ON DELETE SET NULL,
  due_date DATE,
  tags JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_sprint_id ON tasks(sprint_id);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);

-- =============================================
-- 5. WELLBEING METRICS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS wellbeing_metrics (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  wellbeing_score INTEGER NOT NULL,
  mood VARCHAR(50) NOT NULL,
  workload VARCHAR(50) NOT NULL,
  stress_level INTEGER NOT NULL,
  overtime_hours DECIMAL NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wellbeing_metrics_user_id ON wellbeing_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_wellbeing_metrics_date ON wellbeing_metrics(date);

-- =============================================
-- 6. GAMIFICATION TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS gamification (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  tasks_completed INTEGER NOT NULL DEFAULT 0,
  achievements JSONB DEFAULT '[]',
  skill_trees JSONB DEFAULT '{}',
  rewards JSONB DEFAULT '[]',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gamification_user_id ON gamification(user_id);
CREATE INDEX IF NOT EXISTS idx_gamification_level ON gamification(level);

-- =============================================
-- 7. ETHICAL METRICS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS ethical_metrics (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  pay_equity_score INTEGER NOT NULL,
  workload_balance_score INTEGER NOT NULL,
  dei_task_distribution_score INTEGER NOT NULL,
  overtime_compliance INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ethical_metrics_date ON ethical_metrics(date);

-- =============================================
-- 8. SPRINT ANALYTICS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS sprint_analytics (
  id SERIAL PRIMARY KEY,
  sprint_id INTEGER REFERENCES sprints(id) ON DELETE CASCADE NOT NULL,
  velocity INTEGER NOT NULL DEFAULT 0,
  completion_rate INTEGER NOT NULL DEFAULT 0,
  quality_score INTEGER NOT NULL DEFAULT 0,
  team_sentiment VARCHAR(50) DEFAULT 'neutral',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sprint_analytics_sprint_id ON sprint_analytics(sprint_id);

-- =============================================
-- 9. AI INSIGHTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS ai_insights (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_insights_type ON ai_insights(type);
CREATE INDEX IF NOT EXISTS idx_ai_insights_status ON ai_insights(status);

-- =============================================
-- 10. CHATS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL, -- 'individual' or 'group'
  name TEXT NOT NULL,
  avatar TEXT,
  is_pinned BOOLEAN DEFAULT false,
  is_muted BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  is_group_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chats_type ON chats(type);

-- =============================================
-- 11. CHAT PARTICIPANTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS chat_participants (
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_read TIMESTAMP,
  PRIMARY KEY (chat_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON chat_participants(user_id);

-- =============================================
-- 12. MESSAGES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  type VARCHAR(20) NOT NULL, -- 'text', 'image', 'video', 'document', 'audio', 'voice'
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  is_read BOOLEAN DEFAULT false,
  deleted BOOLEAN DEFAULT false,
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);

-- =============================================
-- 13. REACTIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS reactions (
  emoji TEXT NOT NULL,
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_reactions_message_id ON reactions(message_id);

-- =============================================
-- 14. KANBAN COLUMNS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS kanban_columns (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'bg-slate-400',
  "order" INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kanban_columns_order ON kanban_columns("order");

-- =============================================
-- 15. KANBAN TASKS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS kanban_tasks (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  status VARCHAR(50) NOT NULL DEFAULT 'backlog',
  column_id INTEGER NOT NULL REFERENCES kanban_columns(id) ON DELETE CASCADE,
  assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  sprint_id INTEGER REFERENCES sprints(id) ON DELETE SET NULL,
  due_date DATE,
  "order" INTEGER NOT NULL,
  tags TEXT[],
  attachments INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  subtasks JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kanban_tasks_column_id ON kanban_tasks(column_id);
CREATE INDEX IF NOT EXISTS idx_kanban_tasks_assignee_id ON kanban_tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_kanban_tasks_status ON kanban_tasks(status);
CREATE INDEX IF NOT EXISTS idx_kanban_tasks_order ON kanban_tasks("order");

-- =============================================
-- 16. KANBAN TASK COMMENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS kanban_task_comments (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES kanban_tasks(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kanban_task_comments_task_id ON kanban_task_comments(task_id);

-- =============================================
-- 17. KANBAN TASK ATTACHMENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS kanban_task_attachments (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES kanban_tasks(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kanban_task_attachments_task_id ON kanban_task_attachments(task_id);

-- =============================================
-- 18. CALENDAR EVENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS calendar_events (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  location TEXT,
  event_type VARCHAR(50) NOT NULL DEFAULT 'meeting', -- meeting, sprint, demo, etc
  organizer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_all_day BOOLEAN DEFAULT false,
  is_recurring BOOLEAN DEFAULT false,
  recurring_pattern JSONB DEFAULT '{}',
  attendees JSONB DEFAULT '[]',
  color VARCHAR(50) DEFAULT 'blue',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_organizer_id ON calendar_events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_event_type ON calendar_events(event_type);

-- =============================================
-- 19. TRIGGER FUNCTIONS FOR UPDATED_AT
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables with updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sprints_updated_at BEFORE UPDATE ON sprints
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON chats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kanban_columns_updated_at BEFORE UPDATE ON kanban_columns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kanban_tasks_updated_at BEFORE UPDATE ON kanban_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON calendar_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 20. INSERT SAMPLE DATA (OPTIONAL)
-- =============================================

-- Insert a test user (password is 'password123' hashed with bcrypt)
INSERT INTO users (name, email, password_hash, role, job_title, department)
VALUES 
  ('Admin User', 'admin@jiravision.com', '$2a$10$YourHashedPasswordHere', 'admin', 'System Administrator', 'IT'),
  ('John Doe', 'john@jiravision.com', '$2a$10$YourHashedPasswordHere', 'user', 'Software Engineer', 'Engineering'),
  ('Jane Smith', 'jane@jiravision.com', '$2a$10$YourHashedPasswordHere', 'user', 'Product Manager', 'Product')
ON CONFLICT (email) DO NOTHING;

-- Insert default kanban columns
INSERT INTO kanban_columns (title, color, "order")
VALUES 
  ('Backlog', 'bg-slate-400', 1),
  ('To Do', 'bg-blue-400', 2),
  ('In Progress', 'bg-yellow-400', 3),
  ('In Review', 'bg-purple-400', 4),
  ('Done', 'bg-green-400', 5)
ON CONFLICT DO NOTHING;

-- Create a sample sprint
INSERT INTO sprints (name, description, start_date, end_date, status, capacity)
VALUES 
  ('Sprint 1', 'Initial development sprint', CURRENT_DATE, CURRENT_DATE + INTERVAL '14 days', 'active', 40)
ON CONFLICT DO NOTHING;

-- =============================================
-- SCRIPT COMPLETE
-- =============================================
-- All tables, indexes, and triggers have been created
-- Your JiraVision database is now ready to use with Neon!
