-- SQL script to seed tasks for dashboard testing
-- Run this with: psql -U jiravision_dev -d jiravisiondb_local -f seed-tasks.sql

-- First check if there are users to assign tasks to
DO $$
DECLARE
    user_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;
    
    IF user_count = 0 THEN
        RAISE EXCEPTION 'No users found in the database. Please create users first.';
    END IF;
END $$;

-- Clear existing tasks if any (optional - uncomment if needed)
-- TRUNCATE tasks CASCADE;

-- Insert tasks with proper tags format (JSON array)
INSERT INTO tasks (title, description, status, priority, story_points, assignee_id, due_date, tags, created_at, updated_at) VALUES
(
    'Create user authentication flow',
    'Implement login, registration, and password reset functionality using NextAuth.js',
    'completed',
    'high',
    5,
    (SELECT id FROM users ORDER BY id LIMIT 1),
    '2025-05-10',
    '["authentication", "security", "frontend"]',
    NOW(),
    NOW()
),
(
    'Design dashboard UI components',
    'Create reusable UI components for the main dashboard including charts, cards and navigation',
    'in_progress',
    'medium',
    3,
    (SELECT id FROM users ORDER BY id LIMIT 1),
    '2025-05-18',
    '["design", "ui", "frontend"]',
    NOW(),
    NOW()
),
(
    'Implement chat functionality',
    'Set up websockets for real-time messaging and implement the chat interface',
    'todo',
    'high',
    8,
    (SELECT id FROM users ORDER BY id LIMIT 1 OFFSET 1),
    '2025-05-25',
    '["chat", "websocket", "real-time"]',
    NOW(),
    NOW()
),
(
    'Create API documentation',
    'Document all API endpoints with Swagger/OpenAPI specification',
    'todo',
    'low',
    2,
    (SELECT id FROM users ORDER BY id LIMIT 1 OFFSET 2),
    '2025-06-05',
    '["documentation", "api"]',
    NOW(),
    NOW()
),
(
    'Set up CI/CD pipeline',
    'Configure GitHub Actions for continuous integration and deployment',
    'backlog',
    'medium',
    3,
    (SELECT id FROM users ORDER BY id LIMIT 1),
    '2025-06-10',
    '["devops", "automation"]',
    NOW(),
    NOW()
),
(
    'Implement task management API',
    'Create REST API endpoints for CRUD operations on tasks',
    'in_progress',
    'high',
    5,
    (SELECT id FROM users ORDER BY id LIMIT 1 OFFSET 1),
    '2025-05-20',
    '["backend", "api", "tasks"]',
    NOW(),
    NOW()
),
(
    'Add user profile management',
    'Allow users to update their profile information and preferences',
    'todo',
    'medium',
    3,
    (SELECT id FROM users ORDER BY id LIMIT 1 OFFSET 2),
    '2025-06-01',
    '["user", "profile", "frontend"]',
    NOW(),
    NOW()
),
(
    'Implement wellbeing dashboard',
    'Create visualizations for wellbeing metrics and insights',
    'backlog',
    'medium',
    5,
    (SELECT id FROM users ORDER BY id LIMIT 1),
    '2025-06-15',
    '["wellbeing", "dashboard", "visualization"]',
    NOW(),
    NOW()
);

-- Output success message
DO $$
BEGIN
    RAISE NOTICE 'Successfully added tasks to the database!';
END $$;
