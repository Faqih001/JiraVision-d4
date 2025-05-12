import { pgTable, serial, text, varchar, timestamp, boolean, date, integer, decimal, jsonb } from "drizzle-orm/pg-core"

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 50 }).notNull().default("user"),
  avatar: text("avatar"),
  emailVerified: boolean("email_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

// Password reset tokens table
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
})

// Sprints table
export const sprints = pgTable("sprints", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("planning"),
  capacity: integer("capacity").notNull().default(0),
  completed: integer("completed").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

// Tasks table
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: varchar("status", { length: 50 }).notNull().default("todo"),
  priority: varchar("priority", { length: 50 }).notNull().default("medium"),
  storyPoints: integer("story_points").notNull().default(0),
  assigneeId: integer("assignee_id").references(() => users.id),
  sprintId: integer("sprint_id").references(() => sprints.id),
  dueDate: date("due_date"),
  tags: jsonb("tags").default("[]"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

// Wellbeing metrics table
export const wellbeingMetrics = pgTable("wellbeing_metrics", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  date: date("date").notNull(),
  wellbeingScore: integer("wellbeing_score").notNull(),
  mood: varchar("mood", { length: 50 }).notNull(),
  workload: varchar("workload", { length: 50 }).notNull(),
  stressLevel: integer("stress_level").notNull(),
  overtimeHours: decimal("overtime_hours").notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow(),
})

// Gamification table
export const gamification = pgTable("gamification", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  level: integer("level").notNull().default(1),
  xp: integer("xp").notNull().default(0),
  tasksCompleted: integer("tasks_completed").notNull().default(0),
  achievements: jsonb("achievements").default("[]"),
  skillTrees: jsonb("skill_trees").default("{}"),
  rewards: jsonb("rewards").default("[]"),
  updatedAt: timestamp("updated_at").defaultNow(),
})

// Ethical metrics table
export const ethicalMetrics = pgTable("ethical_metrics", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  payEquityScore: integer("pay_equity_score").notNull(),
  workloadBalanceScore: integer("workload_balance_score").notNull(),
  deiTaskDistributionScore: integer("dei_task_distribution_score").notNull(),
  overtimeCompliance: integer("overtime_compliance").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
})

// Sprint analytics table
export const sprintAnalytics = pgTable("sprint_analytics", {
  id: serial("id").primaryKey(),
  sprintId: integer("sprint_id")
    .references(() => sprints.id)
    .notNull(),
  velocity: integer("velocity").notNull().default(0),
  completionRate: integer("completion_rate").notNull().default(0),
  qualityScore: integer("quality_score").notNull().default(0),
  teamSentiment: varchar("team_sentiment", { length: 50 }).default("neutral"),
  createdAt: timestamp("created_at").defaultNow(),
})

// AI insights table
export const aiInsights = pgTable("ai_insights", {
  id: serial("id").primaryKey(),
  type: varchar("type", { length: 50 }).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
})

// Kanban Columns table
export const kanbanColumns = pgTable("kanban_columns", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  color: text("color").notNull().default("bg-slate-400"),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

// Kanban Tasks table
export const kanbanTasks = pgTable("kanban_tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  priority: varchar("priority", { length: 20 }).notNull().default("medium"),
  status: varchar("status", { length: 50 }).notNull().default("backlog"),
  columnId: integer("column_id").references(() => kanbanColumns.id).notNull(),
  assigneeId: integer("assignee_id").references(() => users.id),
  sprintId: integer("sprint_id").references(() => sprints.id),
  dueDate: date("due_date"),
  order: integer("order").notNull(),
  tags: text("tags").array(),
  attachments: integer("attachments").default(0),
  comments: integer("comments").default(0),
  subtasks: jsonb("subtasks"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

// Kanban Task Comments table
export const kanbanTaskComments = pgTable("kanban_task_comments", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => kanbanTasks.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

// Kanban Task Attachments table
export const kanbanTaskAttachments = pgTable("kanban_task_attachments", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => kanbanTasks.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  filename: text("filename").notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size").notNull(),
  fileType: varchar("file_type", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
})
