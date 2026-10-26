import { pgTable, serial, text, varchar, timestamp, boolean, date, integer, decimal, jsonb, primaryKey, unique, uuid, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 50 }).notNull().default("user"),
  avatar: text("avatar"),
  emailVerified: boolean("email_verified").default(false),
  // Additional user profile fields
  jobTitle: varchar("job_title", { length: 255 }),
  department: varchar("department", { length: 255 }),
  location: varchar("location", { length: 255 }),
  bio: text("bio"),
  language: varchar("language", { length: 10 }).default("en-US"),
  timezone: varchar("timezone", { length: 50 }).default("Africa/Nairobi"),
  preferences: jsonb("preferences").default({}),
  // User status for chat
  status: varchar("status", { length: 20 }).default("offline"),
  // Team member skills
  skills: jsonb("skills").default([]),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

// Chat tables
export const chats = pgTable("chats", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: varchar("type", { length: 20 }).notNull(), // 'individual' or 'group'
  name: text("name").notNull(),
  description: text("description"),
  avatar: text("avatar"),
  isPinned: boolean("is_pinned").default(false),
  isMuted: boolean("is_muted").default(false),
  isArchived: boolean("is_archived").default(false),
  isGroupAdmin: boolean("is_group_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

export const chatParticipants = pgTable("chat_participants", {
  chatId: uuid("chat_id").notNull().references(() => chats.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id),
  joinedAt: timestamp("joined_at").defaultNow(),
  lastRead: timestamp("last_read"),
  // Per-participant settings blob: { isMuted, isPinned, isBlocked, isAdmin,
  // notificationLevel ('all' | 'mentions' | 'none'), theme }. Kept as one jsonb
  // column instead of six booleans so the chat workspace can evolve without
  // migrations.
  settings: jsonb("settings").notNull().default({}),
}, (table): { pk: ReturnType<typeof primaryKey> } => {
  return {
    pk: primaryKey({ columns: [table.chatId, table.userId] }),
  }
})

// Messages table with explicit replyToId as a nullable UUID column
export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  content: text("content").notNull(),
  type: varchar("type", { length: 20 }).notNull(), // 'text', 'image', 'video', 'document', 'audio', 'voice'
  timestamp: timestamp("timestamp").defaultNow(),
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  fileSize: integer("file_size"),
  isRead: boolean("is_read").default(false),
  deleted: boolean("deleted").default(false),
  chatId: uuid("chat_id").notNull().references(() => chats.id, { onDelete: "cascade" }),
  senderId: integer("sender_id").notNull().references(() => users.id),
  // Handle replyToId separately with a plain UUID column
  replyToId: uuid("reply_to_id"),
  // Reaction map stored inline: { "👍": [userId, ...], ... }. Toggled by
  // /api/chat/messages/[messageId]/reactions (PUT/POST).
  reactions: jsonb("reactions").notNull().default({}),
  // Original content preserved when a message is soft-deleted so the restore
  // flow can put it back verbatim.
  originalContent: text("original_content"),
  // Set by the edit (PATCH) flow; rendered as an "edited" badge.
  editedAt: timestamp("edited_at"),
})

// Define relations for the messages table
export const messagesRelations = relations(messages, ({ one }) => ({
  replyTo: one(messages, {
    fields: [messages.replyToId],
    references: [messages.id],
  }),
}));

export const reactions = pgTable("reactions", {
  emoji: text("emoji").notNull(),
  messageId: uuid("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id),
}, (table): { pk: ReturnType<typeof primaryKey> } => {
  return {
    pk: primaryKey({ columns: [table.messageId, table.userId] }),
  }
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
  // Phase 1 additions (design §13). All nullable: no existing route selects them and no
  // current behaviour changes. The Gantt needs a start, tasks only had a due date;
  // discipline is what makes a report role-aware; source_plan_id keeps a promoted task
  // traceable to the plan that created it, and is written ONLY by the promote route.
  // Declared last because Postgres ADD COLUMN appends.
  startDate: date("start_date"),
  discipline: varchar("discipline", { length: 40 }),
  sourcePlanId: integer("source_plan_id"),
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

// Calendar Events table
export const calendarEvents = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  location: text("location"),
  eventType: varchar("event_type", { length: 50 }).notNull().default("meeting"), // meeting, sprint, demo, etc
  organizerId: integer("organizer_id").references(() => users.id).notNull(),
  isAllDay: boolean("is_all_day").default(false),
  isRecurring: boolean("is_recurring").default(false),
  recurringPattern: jsonb("recurring_pattern").default({}),
  attendees: jsonb("attendees").default([]),
  color: varchar("color", { length: 50 }).default("blue"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

// Notifications table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: varchar("type", { length: 50 }).notNull().default("info"),
  title: text("title").notNull(),
  body: text("body"),
  isRead: boolean("is_read").default(false),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

// Saved reports table — analytics snapshots (name + filter config) persisted
// per user by the analytics workspace. Additive-only; nothing existing refers to it.
export const savedReports = pgTable("saved_reports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  config: jsonb("config").default({}),
  createdAt: timestamp("created_at").defaultNow(),
})

// Landing-page CMS: per-section content overrides edited by super-admins.
// One row per (page, section); `fields` holds only paths declared in
// lib/cms-registry.ts. Additive-only; nothing existing refers to it.
export const cmsContentOverrides = pgTable(
  "cms_content_overrides",
  {
    id: serial("id").primaryKey(),
    pageId: varchar("page_id", { length: 64 }).notNull(),
    sectionId: varchar("section_id", { length: 64 }).notNull(),
    fields: jsonb("fields").notNull().default({}),
    isPublished: boolean("is_published").notNull().default(true),
    updatedBy: integer("updated_by"),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [unique("cms_overrides_page_section").on(table.pageId, table.sectionId)],
)

// Audit trail for CMS mutations (save / publish / unpublish / reset).
export const cmsAuditLog = pgTable("cms_audit_log", {
  id: serial("id").primaryKey(),
  pageId: varchar("page_id", { length: 64 }).notNull(),
  sectionId: varchar("section_id", { length: 64 }).notNull(),
  action: varchar("action", { length: 32 }).notNull(),
  userId: integer("user_id"),
  detail: jsonb("detail").notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

// Team workspace settings: exactly one row, read by the team APIs so member
// defaults and notification preferences round-trip instead of being hard-coded.
export const teamSettings = pgTable("team_settings", {
  id: serial("id").primaryKey(),
  teamName: varchar("team_name", { length: 120 }).notNull().default("Team"),
  defaultMemberRole: varchar("default_member_role", { length: 32 }).notNull().default("user"),
  notifyMemberJoined: boolean("notify_member_joined").notNull().default(true),
  notifyMemberRemoved: boolean("notify_member_removed").notNull().default(true),
  notifyProfileUpdated: boolean("notify_profile_updated").notNull().default(true),
  notifyRoleChanged: boolean("notify_role_changed").notNull().default(true),
  notifyWellbeingAlert: boolean("notify_wellbeing_alert").notNull().default(true),
  updatedBy: integer("updated_by"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

// Who changed whose system role, and when. Written by /api/team/members/[id]/role.
export const teamRoleAudit = pgTable("team_role_audit", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").notNull(),
  memberName: varchar("member_name", { length: 160 }),
  fromRole: varchar("from_role", { length: 32 }),
  toRole: varchar("to_role", { length: 32 }).notNull(),
  changedBy: integer("changed_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

/* ------------------------------------------------------------------ worklog, reports,
      planner and assistant (design §13, phase 1)

   These tables are created in the live database by scripts/create-worklog-tables.mjs,
   which is raw SQL. The column names, modes and defaults below must match that DDL
   line for line — a drift here is a runtime type error against production, not a
   compile error, because the schema file is never pushed.                             */

// Every status transition on the tasks table, written by lib/worklog/capture.ts.
// The system of record for "what happened on day X". `cascade` on task_id means a
// deleted task takes its history with it, which is why there is no `deleted` event.
export const taskEvents = pgTable(
  "task_events",
  {
    id: serial("id").primaryKey(),
    taskId: integer("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    actorId: integer("actor_id").references(() => users.id, { onDelete: "set null" }),
    fromStatus: varchar("from_status", { length: 50 }).notNull(),
    toStatus: varchar("to_status", { length: 50 }).notNull(),
    at: timestamp("at", { withTimezone: true }).defaultNow().notNull(),
    source: varchar("source", { length: 20 }).notNull().default("route"),
  },
  (table) => [
    index("task_events_task_at_idx").on(table.taskId, table.at),
    index("task_events_at_idx").on(table.at),
  ],
)

export const agentPlans = pgTable("agent_plans", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  summary: text("summary"),
  sourceKind: varchar("source_kind", { length: 20 }).notNull().default("text"),
  sourceName: text("source_name"),
  sourceText: text("source_text"),
  objectKey: text("object_key"),
  model: varchar("model", { length: 80 }),
  horizonStart: date("horizon_start"),
  horizonEnd: date("horizon_end"),
  cadence: varchar("cadence", { length: 20 }).notNull().default("weekly"),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  promotedAt: timestamp("promoted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const planItems = pgTable(
  "plan_items",
  {
    id: serial("id").primaryKey(),
    planId: integer("plan_id")
      .notNull()
      .references(() => agentPlans.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    discipline: varchar("discipline", { length: 40 }),
    estimatePoints: integer("estimate_points").notNull().default(0),
    startDate: date("start_date"),
    dueDate: date("due_date"),
    status: varchar("status", { length: 50 }).notNull().default("todo"),
    dependsOn: jsonb("depends_on").notNull().default("[]"),
    milestone: boolean("milestone").notNull().default(false),
    cadence: varchar("cadence", { length: 20 }),
    // `sort_order`, not `order`: ORDER is a reserved word and every query would need it quoted.
    sortOrder: integer("sort_order").notNull().default(0),
    deliverable: jsonb("deliverable"),
    sourceTaskId: integer("source_task_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("plan_items_plan_idx").on(table.planId, table.sortOrder)],
)

export const deliverables = pgTable(
  "deliverables",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    type: varchar("type", { length: 30 }).notNull().default("other"),
    taskId: integer("task_id").references(() => tasks.id, { onDelete: "set null" }),
    planItemId: integer("plan_item_id").references(() => planItems.id, { onDelete: "set null" }),
    ownerId: integer("owner_id").references(() => users.id, { onDelete: "set null" }),
    discipline: varchar("discipline", { length: 40 }),
    status: varchar("status", { length: 20 }).notNull().default("draft"),
    producedOn: date("produced_on"),
    link: text("link"),
    objectKey: text("object_key"),
    evidence: text("evidence"),
    createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("deliverables_owner_status_idx").on(table.ownerId, table.status),
    index("deliverables_produced_idx").on(table.producedOn),
  ],
)

// The member's own account of a day. `worked_on` is a plain date on purpose: it is
// resolved through the member's timezone (lib/worklog/local-day.ts, shipped in phase 2),
// so a 23:40 entry lands on the day the member thinks it is.
export const workLogEntries = pgTable(
  "work_log_entries",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workedOn: date("worked_on").notNull(),
    taskId: integer("task_id").references(() => tasks.id, { onDelete: "set null" }),
    planItemId: integer("plan_item_id").references(() => planItems.id, { onDelete: "set null" }),
    kind: varchar("kind", { length: 20 }).notNull().default("action"),
    title: text("title").notNull(),
    body: text("body"),
    discipline: varchar("discipline", { length: 40 }),
    minutes: integer("minutes"),
    deliverableId: integer("deliverable_id").references(() => deliverables.id, {
      onDelete: "set null",
    }),
    // playbook_id gets its foreign key in phase 16, when the playbooks table is created.
    playbookId: integer("playbook_id"),
    playbookVersion: integer("playbook_version"),
    links: jsonb("links").notNull().default("[]"),
    source: varchar("source", { length: 20 }).notNull().default("manual"),
    redatedAt: timestamp("redated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("work_log_entries_user_day_idx").on(table.userId, table.workedOn),
    index("work_log_entries_task_idx").on(table.taskId),
  ],
)

export const workReports = pgTable(
  "work_reports",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    periodType: varchar("period_type", { length: 10 }).notNull().default("weekly"),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    title: text("title").notNull(),
    template: varchar("template", { length: 40 }).notNull().default("general"),
    status: varchar("status", { length: 20 }).notNull().default("draft"),
    content: jsonb("content").notNull().default("{}"),
    metrics: jsonb("metrics").notNull().default("{}"),
    revisionOf: integer("revision_of").references((): any => workReports.id, {
      onDelete: "set null",
    }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
    returnedNote: text("returned_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("work_reports_user_period_idx").on(table.userId, table.periodStart),
    index("work_reports_status_idx").on(table.status),
  ],
)

export const workReportRecipients = pgTable(
  "work_report_recipients",
  {
    reportId: integer("report_id")
      .notNull()
      .references(() => workReports.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    notifiedAt: timestamp("notified_at", { withTimezone: true }).defaultNow().notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    ackAt: timestamp("ack_at", { withTimezone: true }),
    note: text("note"),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.reportId, table.userId] }),
    userIdx: index("work_report_recipients_user_read_idx").on(table.userId, table.readAt),
  }),
)

export const assistantThreads = pgTable("assistant_threads", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  scope: varchar("scope", { length: 20 }).notNull().default("workspace"),
  title: text("title"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const assistantMessages = pgTable(
  "assistant_messages",
  {
    id: serial("id").primaryKey(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => assistantThreads.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 12 }).notNull(),
    content: text("content").notNull(),
    references: jsonb("references").notNull().default("[]"),
    tokens: integer("tokens").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("assistant_messages_thread_idx").on(table.threadId, table.id)],
)

// The durable half of the public-bot caps (design §7): in-memory rate limiting is
// per serverless instance, this is the ceiling.
export const aiUsageDaily = pgTable(
  "ai_usage_daily",
  {
    date: date("date").notNull(),
    scope: varchar("scope", { length: 20 }).notNull(),
    calls: integer("calls").notNull().default(0),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.date, table.scope] }),
  }),
)
