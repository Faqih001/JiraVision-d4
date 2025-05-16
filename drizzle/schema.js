const { pgTable, serial, text, varchar, timestamp, boolean, date, integer, decimal, jsonb, primaryKey, uuid } = require("drizzle-orm/pg-core");

// Users table
const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 50 }).notNull().default("user"),
  avatar: text("avatar"),
  emailVerified: boolean("email_verified").default(false)
});

// Messages table
const messages = pgTable("messages", {
  id: uuid("id").primaryKey(),
  content: text("content").notNull(),
  chatId: uuid("chat_id").notNull(),
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

// Chats table
const chats = pgTable("chats", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

// Chat participants table
const chatParticipants = pgTable("chat_participants", {
  chatId: uuid("chat_id").notNull(),
  userId: integer("user_id").notNull(),
  isAdmin: boolean("is_admin").default(false),
  joinedAt: timestamp("joined_at").defaultNow()
});

module.exports = {
  users,
  messages,
  chats,
  chatParticipants
};
