// Dashboard overview aggregation: one round-trip assembles every card on the
// main dashboard — KPIs, sprint burndown, velocity, workload, wellbeing, ethics,
// gamification, insights and the live activity feed. All values are computed
// from real rows; empty tables produce empty series, never fabricated numbers.
//
// The main dashboard reads the "member" scope — the signed-in person's rows only, so
// a fresh account starts empty. Team, analytics and copilot pages keep the "team"
// scope: the workspace-wide aggregate.

import { db } from "@/lib/db"
import {
  aiInsights,
  calendarEvents,
  ethicalMetrics,
  gamification,
  notifications,
  sprintAnalytics,
  sprints,
  tasks,
  users,
  wellbeingMetrics,
} from "@/drizzle/schema"
import { and, asc, desc, eq, gte, lte, or, sql } from "drizzle-orm"
import { listNotifications } from "@/lib/notifications"

export interface Kpis {
  myOpenTasks: number
  myDueThisWeek: number
  myCompletedThisWeek: number
  sprintProgressPct: number
  teamHappiness: number
  blockedTasks: number
  myWellbeing: number
}

/**
 * "member" is the signed-in person's own dashboard: every task, sprint and event
 * read is narrowed to rows that are theirs, so a fresh account has nothing to show
 * even when the workspace around it is busy. "team" is the workspace aggregate the
 * team, analytics and copilot pages read.
 */
export type OverviewScope = "team" | "member"

export interface SprintSummary {
  id: number
  name: string
  description: string | null
  startDate: string
  endDate: string
  status: string
  capacity: number
  completed: number
  totalPoints: number
  donePoints: number
  progressPct: number
  daysLeft: number
  taskCount: number
}

export interface BurndownPoint {
  date: string
  label: string
  ideal: number | null
  actual: number | null
}

export interface VelocityBar {
  name: string
  committed: number
  completed: number
}

export interface SliceDatum {
  name: string
  value: number
}

export interface WorkloadRow {
  id: number
  name: string
  role: string | null
  avatar: string | null
  openPoints: number
  openTasks: number
  doneTasks: number
}

export interface ThroughputWeek {
  week: string
  label: string
  doneTasks: number
  donePoints: number
}

export interface DeadlineTask {
  id: number
  title: string
  status: string
  priority: string
  dueDate: string | null
  daysRemaining: number | null
}

export interface UpcomingEvent {
  id: number
  title: string
  eventType: string
  startTime: string
  color: string | null
  location: string | null
}

export interface WellbeingPoint {
  date: string
  score: number
  stress: number
  mood: string
}

export interface TeamMoodRow {
  id: number
  name: string
  avatar: string | null
  mood: string
  score: number
}

export interface EthicsSnapshot {
  latest: {
    date: string
    payEquity: number
    workloadBalance: number
    deiDistribution: number
    overtimeCompliance: number
  } | null
  deltas: {
    payEquity: number
    workloadBalance: number
    deiDistribution: number
    overtimeCompliance: number
  } | null
  trend: { date: string; workloadBalance: number; overtimeCompliance: number }[]
}

export interface GamificationSnapshot {
  level: number
  xp: number
  tasksCompleted: number
  achievements: number
  skillTrees: { name: string; level: number; progress: number }[]
  nextLevelXp: number
}

export interface LeaderboardRow {
  id: number
  name: string
  avatar: string | null
  level: number
  xp: number
}

export interface InsightCard {
  id: number
  type: string
  title: string
  description: string
  createdAt: string
}

export interface ActivityRow {
  id: number
  type: string
  title: string
  body: string | null
  isRead: boolean
  link: string | null
  createdAt: string
}

export interface DashboardOverview {
  user: { id: number; name: string; role: string; avatar: string | null }
  generatedAt: string
  kpis: Kpis
  activeSprint: SprintSummary | null
  burndown: BurndownPoint[]
  velocity: VelocityBar[]
  statusBreakdown: SliceDatum[]
  priorityBreakdown: SliceDatum[]
  workload: WorkloadRow[]
  throughput: ThroughputWeek[]
  deadlines: DeadlineTask[]
  myTasks: {
    id: number
    title: string
    description: string | null
    status: string
    priority: string
    storyPoints: number
    dueDate: string | null
    sprintId: number | null
    tags: unknown
  }[]
  events: UpcomingEvent[]
  wellbeingTrend: WellbeingPoint[]
  teamMood: TeamMoodRow[]
  ethics: EthicsSnapshot
  gamification: GamificationSnapshot | null
  leaderboard: LeaderboardRow[]
  insights: InsightCard[]
  activity: ActivityRow[]
  realtimeEnabled: boolean
}

function dayLabel(iso: string) {
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10)
}

export async function getDashboardOverview(
  userId: number,
  scope: OverviewScope = "team",
): Promise<DashboardOverview> {
  const member = scope === "member"
  const now = new Date()
  const todayIso = isoDay(now)
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000)
  const weekAhead = new Date(now.getTime() + 7 * 86_400_000)

  const [
    userRow,
    activeSprintRows,
    mySprintRows,
    statusCounts,
    myTasksRows,
    myOpenPriorityCounts,
    workloadRows,
    throughputRows,
    upcomingEventRows,
    wellbeingRows,
    teamMoodRows,
    ethicsRows,
    ethicsTrendRows,
    gamificationRow,
    leaderboardRows,
    insightRows,
    velocityRows,
    activityResult,
  ] = await Promise.all([
    db
      .select({ id: users.id, name: users.name, role: users.role, avatar: users.avatar })
      .from(users)
      .where(eq(users.id, userId))
      .then((r) => r[0] ?? null),

    // Candidate sprints: explicit status first, then date window as fallback. Which
    // one is "active" for this viewer is decided below, once their sprint rows are in.
    db
      .select()
      .from(sprints)
      .where(
        or(
          eq(sprints.status, "active"),
          and(lte(sprints.startDate, todayIso), gte(sprints.endDate, todayIso)),
        ),
      )
      .orderBy(desc(sprints.startDate))
      .limit(10),

    // Sprints this member actually works in. Skipped for the team scope, where the
    // newest active sprint is the workspace's own.
    member
      ? db
          .selectDistinct({ sprintId: tasks.sprintId })
          .from(tasks)
          .where(eq(tasks.assigneeId, userId))
      : Promise.resolve([] as { sprintId: number | null }[]),

    member
      ? db
          .select({ status: tasks.status, count: sql<number>`count(*)::int` })
          .from(tasks)
          .where(eq(tasks.assigneeId, userId))
          .groupBy(tasks.status)
      : db
          .select({ status: tasks.status, count: sql<number>`count(*)::int` })
          .from(tasks)
          .groupBy(tasks.status),

    db
      .select()
      .from(tasks)
      .where(eq(tasks.assigneeId, userId))
      .orderBy(asc(tasks.dueDate))
      .limit(60),

    db
      .select({ priority: tasks.priority, count: sql<number>`count(*)::int` })
      .from(tasks)
      .where(and(eq(tasks.assigneeId, userId), neqDone(tasks.status)))
      .groupBy(tasks.priority),

    db
      .select({
        id: users.id,
        name: users.name,
        role: users.role,
        avatar: users.avatar,
        openPoints: sql<number>`coalesce(sum(case when ${tasks.status} <> 'done' then ${tasks.storyPoints} else 0 end), 0)::int`,
        openTasks: sql<number>`count(case when ${tasks.status} <> 'done' then 1 end)::int`,
        doneTasks: sql<number>`count(case when ${tasks.status} = 'done' then 1 end)::int`,
      })
      .from(users)
      .leftJoin(tasks, eq(tasks.assigneeId, users.id))
      .groupBy(users.id, users.name, users.role, users.avatar)
      .orderBy(desc(sql`count(case when ${tasks.status} <> 'done' then 1 end)`)),

    db
      .select({
        week: sql<string>`to_char(date_trunc('week', ${tasks.updatedAt}), 'YYYY-MM-DD')`,
        doneTasks: sql<number>`count(*)::int`,
        donePoints: sql<number>`coalesce(sum(${tasks.storyPoints}), 0)::int`,
      })
      .from(tasks)
      .where(and(eq(tasks.status, "done"), gte(tasks.updatedAt, weekAgo), member ? eq(tasks.assigneeId, userId) : undefined))
      .groupBy(sql`date_trunc('week', ${tasks.updatedAt})`)
      .orderBy(asc(sql`date_trunc('week', ${tasks.updatedAt})`)),

    db
      .select({
        id: calendarEvents.id,
        title: calendarEvents.title,
        eventType: calendarEvents.eventType,
        startTime: calendarEvents.startTime,
        color: calendarEvents.color,
        location: calendarEvents.location,
      })
      .from(calendarEvents)
      .where(
        and(
          gte(calendarEvents.startTime, now),
          // A member's calendar is the events they run or were invited to; the team
          // scope keeps the whole workspace's schedule.
          member
            ? or(
                eq(calendarEvents.organizerId, userId),
                sql`${calendarEvents.attendees} @> ${JSON.stringify([userId])}::jsonb`,
              )
            : undefined,
        ),
      )
      .orderBy(asc(calendarEvents.startTime))
      .limit(6),

    db
      .select({
        date: wellbeingMetrics.date,
        score: wellbeingMetrics.wellbeingScore,
        stress: wellbeingMetrics.stressLevel,
        mood: wellbeingMetrics.mood,
      })
      .from(wellbeingMetrics)
      .where(eq(wellbeingMetrics.userId, userId))
      .orderBy(desc(wellbeingMetrics.date))
      .limit(14),

    db
      .select({
        id: users.id,
        name: users.name,
        avatar: users.avatar,
        mood: wellbeingMetrics.mood,
        score: wellbeingMetrics.wellbeingScore,
      })
      .from(users)
      .innerJoin(wellbeingMetrics, and(eq(wellbeingMetrics.userId, users.id), sql`${wellbeingMetrics.date} = (SELECT MAX(w2.date) FROM wellbeing_metrics w2 WHERE w2.user_id = ${users.id})`))
      .orderBy(asc(users.name)),

    db
      .select()
      .from(ethicalMetrics)
      .orderBy(desc(ethicalMetrics.date))
      .limit(2),

    db
      .select({
        date: ethicalMetrics.date,
        workloadBalance: ethicalMetrics.workloadBalanceScore,
        overtimeCompliance: ethicalMetrics.overtimeCompliance,
      })
      .from(ethicalMetrics)
      .orderBy(asc(ethicalMetrics.date))
      .limit(12),

    db
      .select()
      .from(gamification)
      .where(eq(gamification.userId, userId))
      .limit(1)
      .then((r) => r[0] ?? null),

    db
      .select({
        id: users.id,
        name: users.name,
        avatar: users.avatar,
        level: gamification.level,
        xp: gamification.xp,
      })
      .from(gamification)
      .innerJoin(users, eq(users.id, gamification.userId))
      .orderBy(desc(gamification.xp))
      .limit(5),

    db
      .select()
      .from(aiInsights)
      .where(eq(aiInsights.status, "active"))
      .orderBy(desc(aiInsights.createdAt))
      .limit(5),

    // A member's velocity is the points they personally carried and finished in each
    // completed sprint; the team scope reads the sprint's own analytics row.
    member
      ? db
          .select({
            name: sprints.name,
            committed: sql<number>`coalesce(sum(${tasks.storyPoints}), 0)::int`,
            completed: sql<number>`coalesce(sum(case when ${tasks.status} = 'done' then ${tasks.storyPoints} else 0 end), 0)::int`,
          })
          .from(tasks)
          .innerJoin(sprints, eq(sprints.id, tasks.sprintId))
          .where(and(eq(tasks.assigneeId, userId), eq(sprints.status, "completed")))
          .groupBy(sprints.id, sprints.name, sprints.endDate)
          .orderBy(asc(sprints.endDate))
          .limit(6)
      : db
          .select({
            name: sprints.name,
            committed: sprints.capacity,
            completed: sql<number>`coalesce(max(${sprintAnalytics.velocity}), max(${sprints.completed}))::int`,
          })
          .from(sprints)
          .leftJoin(sprintAnalytics, eq(sprintAnalytics.sprintId, sprints.id))
          .where(eq(sprints.status, "completed"))
          .groupBy(sprints.id, sprints.name, sprints.capacity, sprints.endDate)
          .orderBy(asc(sprints.endDate))
          .limit(6),

    listNotifications(userId, { limit: 20 }),
  ])

  // ---- sprint detail + burndown -------------------------------------------
  // A member's active sprint is one they have work in; the team scope takes the
  // newest active sprint as the workspace's own.
  const mySprintIds = new Set(
    mySprintRows.map((row) => row.sprintId).filter((id): id is number => id !== null),
  )
  const activeSprintRow = member
    ? (activeSprintRows.find((s) => mySprintIds.has(s.id)) ?? null)
    : (activeSprintRows[0] ?? null)

  let activeSprint: SprintSummary | null = null
  let burndown: BurndownPoint[] = []
  let sprintTaskRows: { storyPoints: number; status: string; updatedAt: Date | null; dueDate: string | null; assigneeId: number | null }[] = []

  if (activeSprintRow) {
    sprintTaskRows = await db
      .select({
        storyPoints: tasks.storyPoints,
        status: tasks.status,
        updatedAt: tasks.updatedAt,
        dueDate: tasks.dueDate,
        assigneeId: tasks.assigneeId,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.sprintId, activeSprintRow.id),
          member ? eq(tasks.assigneeId, userId) : undefined,
        ),
      )

    const totalPoints = sprintTaskRows.reduce((s, t) => s + t.storyPoints, 0)
    const donePoints = sprintTaskRows.filter((t) => t.status === "done").reduce((s, t) => s + t.storyPoints, 0)
    const start = new Date(`${activeSprintRow.startDate}T00:00:00`)
    const end = new Date(`${activeSprintRow.endDate}T23:59:59`)
    activeSprint = {
      id: activeSprintRow.id,
      name: activeSprintRow.name,
      description: activeSprintRow.description,
      startDate: activeSprintRow.startDate,
      endDate: activeSprintRow.endDate,
      status: activeSprintRow.status,
      capacity: activeSprintRow.capacity,
      completed: activeSprintRow.completed,
      totalPoints,
      donePoints,
      progressPct: totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0,
      daysLeft: Math.max(0, daysBetween(now, end)),
      taskCount: sprintTaskRows.length,
    }

    const days = Math.max(1, daysBetween(start, end))
    const idealStep = totalPoints / days
    // Actual line: remaining points per day, using updatedAt as completion day.
    const completedByDay = new Map<string, number>()
    for (const t of sprintTaskRows) {
      if (t.status !== "done" || !t.updatedAt) continue
      const key = isoDay(t.updatedAt)
      completedByDay.set(key, (completedByDay.get(key) ?? 0) + t.storyPoints)
    }
    let remaining = totalPoints
    let elapsed = 0
    burndown = []
    for (let i = 0; i <= days; i++) {
      const d = new Date(start.getTime() + i * 86_400_000)
      const key = isoDay(d)
      if (d <= end) {
        remaining -= completedByDay.get(key) ?? 0
        elapsed = Math.max(elapsed, remaining)
      }
      burndown.push({
        date: key,
        label: dayLabel(key),
        ideal: Math.max(0, Math.round(totalPoints - idealStep * i)),
        actual: key <= todayIso ? Math.max(0, Math.round(remaining)) : null,
      })
    }
  }

  // ---- KPIs -----------------------------------------------------------------
  const myTasks = myTasksRows
  const notDone = (t: (typeof myTasks)[number]) => t.status !== "done"
  const myDueThisWeek = myTasks.filter(
    (t) => notDone(t) && t.dueDate && new Date(`${t.dueDate}T00:00:00`) <= weekAhead,
  ).length
  const myCompletedThisWeek = myTasks.filter(
    (t) => t.status === "done" && t.updatedAt && t.updatedAt >= weekAgo,
  ).length
  const teamHappiness =
    teamMoodRows.length > 0
      ? Math.round(teamMoodRows.reduce((s, r) => s + r.score, 0) / teamMoodRows.length)
      : 0
  // The signed-in member's own latest check-in. A new account has none, which is a
  // zero — the dashboard must not borrow the team's average for it.
  const myWellbeing = wellbeingRows[0]?.score ?? 0
  const kpis: Kpis = {
    myOpenTasks: myTasks.filter(notDone).length,
    myDueThisWeek,
    myCompletedThisWeek,
    sprintProgressPct: activeSprint?.progressPct ?? 0,
    teamHappiness,
    blockedTasks: statusCounts.find((c) => c.status === "blocked")?.count ?? 0,
    myWellbeing,
  }

  // ---- breakdowns -----------------------------------------------------------
  const statusOrder = ["todo", "in_progress", "review", "blocked", "done"]
  const statusBreakdown: SliceDatum[] = statusOrder
    .map((s) => ({ name: s, value: statusCounts.find((c) => c.status === s)?.count ?? 0 }))
    .filter((d) => d.value > 0)
  const priorityOrder = ["urgent", "high", "medium", "low"]
  const priorityBreakdown: SliceDatum[] = priorityOrder
    .map((p) => ({ name: p, value: myOpenPriorityCounts.find((c) => c.priority === p)?.count ?? 0 }))
    .filter((d) => d.value > 0)

  // ---- deadlines ------------------------------------------------------------
  const deadlines: DeadlineTask[] = myTasks
    .filter((t) => notDone(t) && t.dueDate)
    .slice(0, 8)
    .map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate,
      daysRemaining: daysBetween(now, new Date(`${t.dueDate}T00:00:00`)),
    }))

  // ---- wellbeing ------------------------------------------------------------
  const wellbeingTrend: WellbeingPoint[] = [...wellbeingRows]
    .reverse()
    .map((w) => ({ date: w.date, score: w.score, stress: w.stress, mood: w.mood }))

  // ---- ethics ---------------------------------------------------------------
  const [latestEthics, prevEthics] = ethicsRows
  const ethics: EthicsSnapshot = {
    latest: latestEthics
      ? {
          date: latestEthics.date,
          payEquity: latestEthics.payEquityScore,
          workloadBalance: latestEthics.workloadBalanceScore,
          deiDistribution: latestEthics.deiTaskDistributionScore,
          overtimeCompliance: latestEthics.overtimeCompliance,
        }
      : null,
    deltas:
      latestEthics && prevEthics
        ? {
            payEquity: latestEthics.payEquityScore - prevEthics.payEquityScore,
            workloadBalance: latestEthics.workloadBalanceScore - prevEthics.workloadBalanceScore,
            deiDistribution: latestEthics.deiTaskDistributionScore - prevEthics.deiTaskDistributionScore,
            overtimeCompliance: latestEthics.overtimeCompliance - prevEthics.overtimeCompliance,
          }
        : null,
    trend: ethicsTrendRows.map((e) => ({
      date: e.date,
      workloadBalance: e.workloadBalance,
      overtimeCompliance: e.overtimeCompliance,
    })),
  }

  // ---- gamification ----------------------------------------------------------
  let gamificationSnapshot: GamificationSnapshot | null = null
  if (gamificationRow) {
    const xpPerLevel = 500
    const skillTreeEntries = Object.entries(
      (gamificationRow.skillTrees ?? {}) as Record<string, { level?: number; progress?: number }>,
    )
    gamificationSnapshot = {
      level: gamificationRow.level,
      xp: gamificationRow.xp,
      tasksCompleted: gamificationRow.tasksCompleted,
      achievements: Array.isArray(gamificationRow.achievements) ? gamificationRow.achievements.length : 0,
      skillTrees: skillTreeEntries.map(([name, data]) => ({
        name,
        level: data?.level ?? 1,
        progress: data?.progress ?? 0,
      })),
      nextLevelXp: (gamificationRow.level - 1) * xpPerLevel + xpPerLevel,
    }
  }

  const { neonRealtimeEnabled } = await import("@/lib/neon-realtime")

  return {
    user: userRow ?? { id: userId, name: "Teammate", role: "member", avatar: null },
    generatedAt: now.toISOString(),
    kpis,
    activeSprint,
    burndown,
    velocity: velocityRows.map((v) => ({ name: v.name, committed: v.committed, completed: v.completed })),
    statusBreakdown,
    priorityBreakdown,
    workload: workloadRows.map((w) => ({
      id: w.id,
      name: w.name,
      role: w.role,
      avatar: w.avatar,
      openPoints: w.openPoints,
      openTasks: w.openTasks,
      doneTasks: w.doneTasks,
    })),
    throughput: throughputRows.map((t) => ({ week: t.week, label: dayLabel(t.week), doneTasks: t.doneTasks, donePoints: t.donePoints })),
    deadlines,
    myTasks: myTasks.slice(0, 24).map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      storyPoints: t.storyPoints,
      dueDate: t.dueDate,
      sprintId: t.sprintId,
      tags: t.tags,
    })),
    events: upcomingEventRows.map((e) => ({
      id: e.id,
      title: e.title,
      eventType: e.eventType,
      startTime: e.startTime.toISOString(),
      color: e.color,
      location: e.location,
    })),
    wellbeingTrend,
    teamMood: teamMoodRows.map((m) => ({ id: m.id, name: m.name, avatar: m.avatar, mood: m.mood, score: m.score })),
    ethics,
    gamification: gamificationSnapshot,
    leaderboard: leaderboardRows.map((l) => ({ id: l.id, name: l.name, avatar: l.avatar, level: l.level, xp: l.xp })),
    insights: insightRows.map((i) => ({
      id: i.id,
      type: i.type,
      title: i.title,
      description: i.description,
      createdAt: i.createdAt ? i.createdAt.toISOString() : now.toISOString(),
    })),
    activity: activityResult.items.map((n: (typeof notifications)["$inferSelect"]) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      isRead: n.isRead ?? false,
      link: (n.metadata as Record<string, unknown> | null)?.link as string | null ?? null,
      createdAt: n.createdAt ? n.createdAt.toISOString() : now.toISOString(),
    })),
    realtimeEnabled: neonRealtimeEnabled(),
  }
}

function neqDone(column: typeof tasks.status) {
  return sql`${column} <> 'done'`
}
