-- SQL script to seed sprints for testing
-- Run this with: psql -U jiravision_dev -d jiravisiondb_local -f seed-sprints.sql

-- First check if there are users and tasks to work with
DO $$
DECLARE
    user_count INTEGER;
    task_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO task_count FROM tasks;
    
    IF user_count = 0 THEN
        RAISE EXCEPTION 'No users found in the database. Please create users first.';
    END IF;
    
    IF task_count = 0 THEN
        RAISE EXCEPTION 'No tasks found in the database. Please create tasks first.';
    END IF;
END $$;

-- Insert sprints
INSERT INTO sprints (name, description, start_date, end_date, status, capacity, completed, created_at, updated_at) VALUES
(
    'May 2025 Sprint',
    'First sprint focusing on core authentication and dashboard features',
    '2025-05-01',
    '2025-05-15',
    'completed',
    20,
    18,
    NOW(),
    NOW()
),
(
    'Mid-May 2025 Sprint',
    'Focus on chat functionality and task management',
    '2025-05-16',
    '2025-05-31',
    'in_progress',
    25,
    8,
    NOW(),
    NOW()
),
(
    'June 2025 Sprint',
    'Implement user profiles and wellbeing metrics',
    '2025-06-01',
    '2025-06-15',
    'planning',
    18,
    0,
    NOW(),
    NOW()
);

-- Assign tasks to sprints
-- Sprint 1 (Completed) - Assign completed tasks
UPDATE tasks 
SET sprint_id = 1
WHERE id IN (
    SELECT id FROM tasks 
    WHERE (status = 'completed' OR title IN ('Create user authentication flow', 'Design dashboard UI components'))
    AND sprint_id IS NULL
    LIMIT 3
);

-- Sprint 2 (In Progress) - Assign in-progress and some todo tasks
UPDATE tasks 
SET sprint_id = 2
WHERE id IN (
    SELECT id FROM tasks
    WHERE status IN ('in_progress', 'todo') 
    AND title NOT LIKE '%wellbeing%'
    AND sprint_id IS NULL
    LIMIT 5
);

-- Sprint 3 (Planning) - Assign backlog tasks and remaining todos
UPDATE tasks 
SET sprint_id = 3
WHERE id IN (
    SELECT id FROM tasks
    WHERE (status = 'backlog' OR title LIKE '%wellbeing%')
    AND sprint_id IS NULL
    LIMIT 3
);

-- Output success message
DO $$
BEGIN
    RAISE NOTICE 'Successfully added sprints and assigned tasks to them!';
END $$;
