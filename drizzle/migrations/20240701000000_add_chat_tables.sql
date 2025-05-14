-- Add status field to users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'offline';

-- Create chats table
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY,
  type VARCHAR(20) NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT,
  is_pinned BOOLEAN DEFAULT false,
  is_muted BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  is_group_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create chat_participants table
CREATE TABLE IF NOT EXISTS chat_participants (
  id UUID PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  joined_at TIMESTAMP DEFAULT NOW(),
  last_read TIMESTAMP,
  UNIQUE(chat_id, user_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY,
  content TEXT NOT NULL,
  type VARCHAR(20) NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  is_read BOOLEAN DEFAULT false,
  deleted BOOLEAN DEFAULT false,
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL REFERENCES users(id),
  reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL
);

-- Create reactions table
CREATE TABLE IF NOT EXISTS reactions (
  id UUID PRIMARY KEY,
  emoji TEXT NOT NULL,
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  UNIQUE(message_id, user_id)
);

-- Insert seed data for testing
-- (Only if we're in development environment)
DO $$
BEGIN
  -- Only add test data if no chats exist yet
  IF NOT EXISTS (SELECT 1 FROM chats LIMIT 1) THEN
    -- Group chat
    INSERT INTO chats (id, type, name, avatar, created_at)
    VALUES (
      'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      'group',
      'Design Team',
      'https://randomuser.me/api/portraits/women/28.jpg',
      NOW() - INTERVAL '5 days'
    );

    -- Individual chats
    INSERT INTO chats (id, type, name, avatar, created_at)
    VALUES 
      (
        '6ec0bd7f-11c0-43da-975e-2a8ad9ebae0b',
        'individual',
        'Herbert Strayhorn',
        'https://randomuser.me/api/portraits/men/32.jpg',
        NOW() - INTERVAL '2 days'
      ),
      (
        '7fa624e8-64c9-4cc3-8e9b-89c2ee5df20a',
        'individual',
        'Jitu Chauhan',
        'https://randomuser.me/api/portraits/men/44.jpg',
        NOW() - INTERVAL '1 day'
      ),
      (
        'd4cce02a-9ea5-4b56-8a71-cf00c2be9e03',
        'individual',
        'Denise Reece',
        'https://randomuser.me/api/portraits/women/65.jpg',
        NOW() - INTERVAL '3 days'
      );

    -- Add participants to chats
    -- Assume current user id is 1
    INSERT INTO chat_participants (id, chat_id, user_id, joined_at)
    VALUES
      (gen_random_uuid(), 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 1, NOW() - INTERVAL '5 days'),
      (gen_random_uuid(), 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 5, NOW() - INTERVAL '5 days'),
      (gen_random_uuid(), 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 8, NOW() - INTERVAL '5 days'),
      (gen_random_uuid(), 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 9, NOW() - INTERVAL '5 days'),
      (gen_random_uuid(), '6ec0bd7f-11c0-43da-975e-2a8ad9ebae0b', 1, NOW() - INTERVAL '2 days'),
      (gen_random_uuid(), '6ec0bd7f-11c0-43da-975e-2a8ad9ebae0b', 2, NOW() - INTERVAL '2 days'),
      (gen_random_uuid(), '7fa624e8-64c9-4cc3-8e9b-89c2ee5df20a', 1, NOW() - INTERVAL '1 day'),
      (gen_random_uuid(), '7fa624e8-64c9-4cc3-8e9b-89c2ee5df20a', 3, NOW() - INTERVAL '1 day'),
      (gen_random_uuid(), 'd4cce02a-9ea5-4b56-8a71-cf00c2be9e03', 1, NOW() - INTERVAL '3 days'),
      (gen_random_uuid(), 'd4cce02a-9ea5-4b56-8a71-cf00c2be9e03', 4, NOW() - INTERVAL '3 days');

    -- Add some messages to chat
    INSERT INTO messages (id, content, type, chat_id, sender_id, timestamp)
    VALUES
      -- Group chat messages
      (gen_random_uuid(), 'Welcome everyone to the Design Team group!', 'text', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 1, NOW() - INTERVAL '5 days' + INTERVAL '1 hour'),
      (gen_random_uuid(), 'Thanks for creating this group!', 'text', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 5, NOW() - INTERVAL '5 days' + INTERVAL '1 hour 10 minutes'),
      (gen_random_uuid(), 'This will help us collaborate more efficiently.', 'text', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 8, NOW() - INTERVAL '5 days' + INTERVAL '1 hour 15 minutes'),
      (gen_random_uuid(), 'I''m excited to be part of this team!', 'text', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 9, NOW() - INTERVAL '5 days' + INTERVAL '1 hour 25 minutes'),
      
      -- Individual chat with Herbert
      (gen_random_uuid(), 'Hey Herbert, how are you doing?', 'text', '6ec0bd7f-11c0-43da-975e-2a8ad9ebae0b', 1, NOW() - INTERVAL '2 days' + INTERVAL '1 hour'),
      (gen_random_uuid(), 'I''m doing great! Working on the project plan.', 'text', '6ec0bd7f-11c0-43da-975e-2a8ad9ebae0b', 2, NOW() - INTERVAL '2 days' + INTERVAL '1 hour 5 minutes'),
      (gen_random_uuid(), 'That sounds awesome. Let me know if you need any help.', 'text', '6ec0bd7f-11c0-43da-975e-2a8ad9ebae0b', 1, NOW() - INTERVAL '2 days' + INTERVAL '1 hour 10 minutes'),
      
      -- Individual chat with Jitu
      (gen_random_uuid(), 'Hi Jitu, can you help me with the frontend task?', 'text', '7fa624e8-64c9-4cc3-8e9b-89c2ee5df20a', 1, NOW() - INTERVAL '1 day' + INTERVAL '2 hours'),
      (gen_random_uuid(), 'Sure, I''m available. What do you need?', 'text', '7fa624e8-64c9-4cc3-8e9b-89c2ee5df20a', 3, NOW() - INTERVAL '1 day' + INTERVAL '2 hours 3 minutes'),
      (gen_random_uuid(), 'I need help with the UI components we discussed yesterday.', 'text', '7fa624e8-64c9-4cc3-8e9b-89c2ee5df20a', 1, NOW() - INTERVAL '1 day' + INTERVAL '2 hours 7 minutes'),
      
      -- Individual chat with Denise
      (gen_random_uuid(), 'Denise, the wireframes you sent look amazing!', 'text', 'd4cce02a-9ea5-4b56-8a71-cf00c2be9e03', 1, NOW() - INTERVAL '3 days' + INTERVAL '4 hours'),
      (gen_random_uuid(), 'Thanks! I put a lot of effort into them.', 'text', 'd4cce02a-9ea5-4b56-8a71-cf00c2be9e03', 4, NOW() - INTERVAL '3 days' + INTERVAL '4 hours 2 minutes'),
      (gen_random_uuid(), 'Could you walk me through the user flow later?', 'text', 'd4cce02a-9ea5-4b56-8a71-cf00c2be9e03', 1, NOW() - INTERVAL '3 days' + INTERVAL '4 hours 8 minutes');
  END IF;
END $$; 