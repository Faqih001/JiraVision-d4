-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT,
    "avatar" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT
);

-- CreateTable
CREATE TABLE "chats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isMuted" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "isGroupAdmin" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "chatId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "replyToId" TEXT,
    FOREIGN KEY ("chatId") REFERENCES "chats" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("senderId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("replyToId") REFERENCES "messages" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "chat_participants" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chatId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastRead" DATETIME,
    FOREIGN KEY ("chatId") REFERENCES "chats" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "reactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "emoji" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    FOREIGN KEY ("messageId") REFERENCES "messages" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "chat_participants_chatId_userId_key" ON "chat_participants"("chatId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "reactions_messageId_userId_key" ON "reactions"("messageId", "userId");

-- Insert seed data for team members
INSERT INTO "users" ("id", "name", "email", "role", "avatar", "status") VALUES
('1', 'You (Current User)', 'you@example.com', 'Product Manager', 'https://randomuser.me/api/portraits/men/32.jpg', 'active'),
('2', 'Herbert Strayhorn', 'herbert.strayhorn@example.com', 'Project Lead', 'https://randomuser.me/api/portraits/men/32.jpg', 'busy'),
('3', 'Jitu Chauhan', 'jitu.chauhan@example.com', 'Frontend Developer', 'https://randomuser.me/api/portraits/men/44.jpg', 'online'),
('4', 'Denise Reece', 'denise.reece@example.com', 'UX Designer', 'https://randomuser.me/api/portraits/women/65.jpg', 'active'),
('5', 'Kevin White', 'kevin.white@example.com', 'Backend Developer', 'https://randomuser.me/api/portraits/men/22.jpg', 'active'),
('6', 'Mary Newton', 'mary.newton@example.com', 'Project Manager', 'https://randomuser.me/api/portraits/women/45.jpg', 'active'),
('7', 'Richard Sousa', 'richard.sousa@example.com', 'QA Engineer', 'https://randomuser.me/api/portraits/men/46.jpg', 'away'),
('8', 'Melissa Westbrook', 'melissa.westbrook@example.com', 'UI Designer', 'https://randomuser.me/api/portraits/women/28.jpg', 'active'),
('9', 'Christy Obrien', 'christy.obrien@example.com', 'UX Researcher', 'https://randomuser.me/api/portraits/women/36.jpg', 'active'),
('10', 'Joe Lindahl', 'joe.lindahl@example.com', 'DevOps Engineer', 'https://randomuser.me/api/portraits/men/53.jpg', 'active');

-- Insert seed data for individual chats
INSERT INTO "chats" ("id", "type", "name", "avatar", "createdAt") VALUES
('chat-1', 'individual', 'Herbert Strayhorn', 'https://randomuser.me/api/portraits/men/32.jpg', datetime('now', '-2 days')),
('chat-2', 'individual', 'Jitu Chauhan', 'https://randomuser.me/api/portraits/men/44.jpg', datetime('now', '-1 days')),
('chat-3', 'individual', 'Denise Reece', 'https://randomuser.me/api/portraits/women/65.jpg', datetime('now', '-3 days')),
('chat-4', 'group', 'Design Team', 'https://randomuser.me/api/portraits/women/28.jpg', datetime('now', '-5 days'));

-- Insert chat participants
INSERT INTO "chat_participants" ("id", "chatId", "userId", "joinedAt") VALUES
('cp-1', 'chat-1', '1', datetime('now', '-2 days')),
('cp-2', 'chat-1', '2', datetime('now', '-2 days')),
('cp-3', 'chat-2', '1', datetime('now', '-1 days')),
('cp-4', 'chat-2', '3', datetime('now', '-1 days')),
('cp-5', 'chat-3', '1', datetime('now', '-3 days')),
('cp-6', 'chat-3', '4', datetime('now', '-3 days')),
('cp-7', 'chat-4', '1', datetime('now', '-5 days')),
('cp-8', 'chat-4', '4', datetime('now', '-5 days')),
('cp-9', 'chat-4', '8', datetime('now', '-5 days')),
('cp-10', 'chat-4', '9', datetime('now', '-5 days'));

-- Insert sample messages
INSERT INTO "messages" ("id", "content", "type", "timestamp", "chatId", "senderId") VALUES
('msg-1', 'Hey Herbert, how are you doing?', 'text', datetime('now', '-2 days', '+1 hour'), 'chat-1', '1'),
('msg-2', 'I''m doing great! Working on the project plan.', 'text', datetime('now', '-2 days', '+1 hour', '+5 minutes'), 'chat-1', '2'),
('msg-3', 'That sounds awesome. Let me know if you need any help.', 'text', datetime('now', '-2 days', '+1 hour', '+10 minutes'), 'chat-1', '1'),
('msg-4', 'Hi Jitu, can you help me with the frontend task?', 'text', datetime('now', '-1 days', '+2 hours'), 'chat-2', '1'),
('msg-5', 'Sure, I''m available. What do you need?', 'text', datetime('now', '-1 days', '+2 hours', '+3 minutes'), 'chat-2', '3'),
('msg-6', 'I need help with the UI components we discussed yesterday.', 'text', datetime('now', '-1 days', '+2 hours', '+7 minutes'), 'chat-2', '1'),
('msg-7', 'Denise, the wireframes you sent look amazing!', 'text', datetime('now', '-3 days', '+4 hours'), 'chat-3', '1'),
('msg-8', 'Thanks! I put a lot of effort into them.', 'text', datetime('now', '-3 days', '+4 hours', '+2 minutes'), 'chat-3', '4'),
('msg-9', 'Could you walk me through the user flow later?', 'text', datetime('now', '-3 days', '+4 hours', '+8 minutes'), 'chat-3', '1'),
('msg-10', 'Welcome everyone to the Design Team group!', 'text', datetime('now', '-5 days', '+1 hour'), 'chat-4', '1'),
('msg-11', 'Thanks for creating this group!', 'text', datetime('now', '-5 days', '+1 hour', '+10 minutes'), 'chat-4', '4'),
('msg-12', 'This will help us collaborate more efficiently.', 'text', datetime('now', '-5 days', '+1 hour', '+15 minutes'), 'chat-4', '8'),
('msg-13', 'I''m excited to be part of this team!', 'text', datetime('now', '-5 days', '+1 hour', '+25 minutes'), 'chat-4', '9');

-- Add some reactions to messages
INSERT INTO "reactions" ("id", "emoji", "messageId", "userId") VALUES
('react-1', '👍', 'msg-2', '1'),
('react-2', '❤️', 'msg-8', '1'),
('react-3', '🙏', 'msg-5', '1'),
('react-4', '😊', 'msg-10', '4'),
('react-5', '👏', 'msg-10', '8'),
('react-6', '🎉', 'msg-10', '9'); 