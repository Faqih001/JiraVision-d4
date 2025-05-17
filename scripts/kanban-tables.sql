
-- Create Kanban tables if they don't exist
CREATE TABLE IF NOT EXISTS kanban_columns (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'bg-slate-400',
  "order" INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS kanban_tasks (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  status VARCHAR(50) NOT NULL DEFAULT 'backlog',
  column_id INTEGER REFERENCES kanban_columns(id) NOT NULL,
  assignee_id INTEGER REFERENCES users(id),
  sprint_id INTEGER,
  due_date DATE,
  "order" INTEGER NOT NULL,
  tags TEXT[],
  attachments INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  subtasks JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS kanban_task_comments (
  id SERIAL PRIMARY KEY,
  task_id INTEGER REFERENCES kanban_tasks(id) NOT NULL,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS kanban_task_attachments (
  id SERIAL PRIMARY KEY,
  task_id INTEGER REFERENCES kanban_tasks(id) NOT NULL,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default columns if the table is empty
INSERT INTO kanban_columns (title, color, "order")
SELECT 'Backlog', 'bg-slate-400', 1
WHERE NOT EXISTS (SELECT 1 FROM kanban_columns WHERE title = 'Backlog');

INSERT INTO kanban_columns (title, color, "order")
SELECT 'To Do', 'bg-blue-500', 2
WHERE NOT EXISTS (SELECT 1 FROM kanban_columns WHERE title = 'To Do');

INSERT INTO kanban_columns (title, color, "order")
SELECT 'In Progress', 'bg-amber-500', 3
WHERE NOT EXISTS (SELECT 1 FROM kanban_columns WHERE title = 'In Progress');

INSERT INTO kanban_columns (title, color, "order")
SELECT 'Review', 'bg-purple-500', 4
WHERE NOT EXISTS (SELECT 1 FROM kanban_columns WHERE title = 'Review');

INSERT INTO kanban_columns (title, color, "order")
SELECT 'Done', 'bg-green-500', 5
WHERE NOT EXISTS (SELECT 1 FROM kanban_columns WHERE title = 'Done');

-- Insert some sample tasks
INSERT INTO kanban_tasks (title, description, priority, status, column_id, "order", tags, subtasks)
SELECT 
  'Set up project repository', 
  'Create GitHub repository with proper structure and documentation', 
  'high', 
  'backlog', 
  (SELECT id FROM kanban_columns WHERE title = 'Backlog' LIMIT 1), 
  1,
  ARRAY['setup', 'documentation'],
  '{"total": 3, "completed": 1}'
WHERE NOT EXISTS (SELECT 1 FROM kanban_tasks WHERE title = 'Set up project repository');

INSERT INTO kanban_tasks (title, description, priority, status, column_id, "order", tags, subtasks)
SELECT 
  'Design authentication flow', 
  'Create wireframes and user flow for sign up and login processes', 
  'medium', 
  'todo', 
  (SELECT id FROM kanban_columns WHERE title = 'To Do' LIMIT 1), 
  1,
  ARRAY['design', 'auth'],
  '{"total": 2, "completed": 0}'
WHERE NOT EXISTS (SELECT 1 FROM kanban_tasks WHERE title = 'Design authentication flow');

INSERT INTO kanban_tasks (title, description, priority, status, column_id, "order", tags, subtasks)
SELECT 
  'Implement dashboard layout', 
  'Code the dashboard layout with sidebar and main content area', 
  'medium', 
  'in-progress', 
  (SELECT id FROM kanban_columns WHERE title = 'In Progress' LIMIT 1), 
  1,
  ARRAY['frontend', 'layout'],
  '{"total": 4, "completed": 2}'
WHERE NOT EXISTS (SELECT 1 FROM kanban_tasks WHERE title = 'Implement dashboard layout');
