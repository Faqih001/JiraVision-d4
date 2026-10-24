import { NextRequest, NextResponse } from "next/server"
import { and, desc, eq, gte, ilike, or, sql } from "drizzle-orm"
import { getCurrentUser } from "@/lib/session"
import { db } from "@/lib/db"
import {
  aiInsights,
  gamification,
  notifications,
  sprints,
  tasks,
  users,
  wellbeingMetrics,
} from "@/drizzle/schema"

export const dynamic = "force-dynamic"

/* ------------------------------------------------------------------ types */

type ActivityKind = "task" | "sprint" | "wellbeing" | "gamification" | "ai" | "notification" | "system"

export type ActivityItem = {
  id: string
  kind: ActivityKind
  type: string
  title: string
  body: string | null
  link?: string
  actorName?: string
  entityKind: "notification" | "task" | "sprint" | "wellbeing" | "gamification" | "ai_insight"
  occurredAt: string
  read?: boolean
}

const KINDS: ActivityKind[] = ["task", "sprint", "wellbeing", "gamification", "ai", "notification", "system"]

// Notification type → activity kind (mention/cms/info rows fold into the
// generic "notification" / "system" kinds so the filter bar stays small).
const NOTIF_KIND: Record<string, ActivityKind> = {
  task: "task",
  sprint: "sprint",
  wellbeing: "wellbeing",
  gamification: "gamification",
  ai: "ai",
  system: "system",
  cms: "system",
  mention: "notification",
  info: "notification",
}

const PAGE_LIMIT = 100

function likePattern(q: string) {
  return `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`
}

function dayKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`
}

/* --------------------------------------------------------------- the route */

// GET /api/activity — merged stream of notifications + derived entity events.
// Query params: ?kind=task|sprint|wellbeing|gamification|ai|notification|system
//               &days=7|14|30  &q=<title search>  &offset=<n>
export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const params = request.nextUrl.searchParams
  const kindRaw = params.get("kind") ?? undefined
  const kind = kindRaw && (KINDS as string[]).includes(kindRaw) ? (kindRaw as ActivityKind) : undefined
  const daysRaw = params.get("days")
  const days = daysRaw === "7" || daysRaw === "14" || daysRaw === "30" ? Number(daysRaw) : 14
  const q = (params.get("q") ?? "").trim() || undefined
  const offsetRaw = Number.parseInt(params.get("offset") ?? "0", 10)
  const offset = Number.isFinite(offsetRaw) && offsetRaw > 0 ? offsetRaw : 0

  const now = Date.now()
  const since = new Date(now - days * 86_400_000)
  const titleLike = q ? likePattern(q) : undefined

  try {
    const [notifRows, taskRows, sprintRows, wbRows, gamRows, aiRows, unreadRow] = await Promise.all([
      db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, user.id),
            gte(notifications.createdAt, since),
            titleLike ? ilike(notifications.title, titleLike) : undefined,
          ),
        )
        .orderBy(desc(notifications.createdAt))
        .limit(200),
      db
        .select({
          id: tasks.id,
          title: tasks.title,
          status: tasks.status,
          priority: tasks.priority,
          storyPoints: tasks.storyPoints,
          createdAt: tasks.createdAt,
          updatedAt: tasks.updatedAt,
          assigneeName: users.name,
        })
        .from(tasks)
        .leftJoin(users, eq(tasks.assigneeId, users.id))
        .where(
          and(
            or(gte(tasks.updatedAt, since), gte(tasks.createdAt, since)),
            titleLike ? ilike(tasks.title, titleLike) : undefined,
          ),
        )
        .orderBy(desc(tasks.updatedAt))
        .limit(200),
      db
        .select({
          id: sprints.id,
          name: sprints.name,
          status: sprints.status,
          updatedAt: sprints.updatedAt,
        })
        .from(sprints)
        .where(and(gte(sprints.updatedAt, since), titleLike ? ilike(sprints.name, titleLike) : undefined))
        .orderBy(desc(sprints.updatedAt))
        .limit(100),
      db
        .select({
          id: wellbeingMetrics.id,
          userId: wellbeingMetrics.userId,
          date: wellbeingMetrics.date,
          mood: wellbeingMetrics.mood,
          wellbeingScore: wellbeingMetrics.wellbeingScore,
          stressLevel: wellbeingMetrics.stressLevel,
          createdAt: wellbeingMetrics.createdAt,
          userName: users.name,
        })
        .from(wellbeingMetrics)
        .innerJoin(users, eq(wellbeingMetrics.userId, users.id))
        .where(gte(wellbeingMetrics.createdAt, since))
        .orderBy(desc(wellbeingMetrics.createdAt))
        .limit(150),
      db
        .select({
          id: gamification.id,
          level: gamification.level,
          xp: gamification.xp,
          tasksCompleted: gamification.tasksCompleted,
          updatedAt: gamification.updatedAt,
          userName: users.name,
        })
        .from(gamification)
        .innerJoin(users, eq(gamification.userId, users.id))
        .where(gte(gamification.updatedAt, since))
        .orderBy(desc(gamification.updatedAt))
        .limit(100),
      db
        .select({
          id: aiInsights.id,
          type: aiInsights.type,
          title: aiInsights.title,
          description: aiInsights.description,
          status: aiInsights.status,
          createdAt: aiInsights.createdAt,
        })
        .from(aiInsights)
        .where(and(gte(aiInsights.createdAt, since), titleLike ? ilike(aiInsights.title, titleLike) : undefined))
        .orderBy(desc(aiInsights.createdAt))
        .limit(50),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(notifications)
        .where(and(eq(notifications.userId, user.id), eq(notifications.isRead, false))),
    ])

    /* ---- derive events ---- */

    const events: ActivityItem[] = []

    for (const n of notifRows) {
      const metadata = (n.metadata ?? {}) as Record<string, unknown>
      events.push({
        id: `n-${n.id}`,
        kind: NOTIF_KIND[n.type] ?? "notification",
        type: n.type,
        title: n.title,
        body: n.body,
        link: typeof metadata.link === "string" ? metadata.link : undefined,
        entityKind: "notification",
        occurredAt: (n.createdAt ?? now).toISOString(),
        read: n.isRead ?? false,
      })
    }

    for (const t of taskRows) {
      const updated = t.updatedAt ?? t.createdAt
      const created = t.createdAt ?? updated
      if (updated && new Date(updated).getTime() >= since.getTime()) {
        events.push({
          id: `t-${t.id}-u`,
          kind: "task",
          type: t.status === "done" ? "task_completed" : "task_updated",
          title: t.status === "done" ? `Task completed: ${t.title}` : `Task updated: ${t.title}`,
          body: `Status ${t.status} · ${t.storyPoints} pts`,
          link: "/dashboard/tasks",
          actorName: t.assigneeName ?? undefined,
          entityKind: "task",
          occurredAt: new Date(updated).toISOString(),
        })
      }
      if (created && new Date(created).getTime() >= since.getTime() && new Date(created).getTime() !== new Date(updated).getTime()) {
        events.push({
          id: `t-${t.id}-c`,
          kind: "task",
          type: "task_created",
          title: `Task created: ${t.title}`,
          body: `Priority ${t.priority} · ${t.storyPoints} pts`,
          link: "/dashboard/tasks",
          actorName: t.assigneeName ?? undefined,
          entityKind: "task",
          occurredAt: new Date(created).toISOString(),
        })
      }
    }

    for (const s of sprintRows) {
      if (!s.updatedAt) continue
      events.push({
        id: `s-${s.id}`,
        kind: "sprint",
        type: "sprint_transition",
        title: `Sprint "${s.name}" is now ${s.status}`,
        body: null,
        link: "/dashboard/sprints",
        entityKind: "sprint",
        occurredAt: new Date(s.updatedAt).toISOString(),
      })
    }

    for (const w of wbRows) {
      if (!w.createdAt) continue
      events.push({
        id: `w-${w.id}`,
        kind: "wellbeing",
        type: "wellbeing_checkin",
        title: `${w.userName} logged a check-in`,
        body: `Mood ${w.mood} · score ${w.wellbeingScore}/100 · stress ${w.stressLevel}/10`,
        link: "/dashboard/team-wellbeing",
        actorName: w.userName,
        entityKind: "wellbeing",
        occurredAt: new Date(w.createdAt).toISOString(),
      })
    }

    for (const g of gamRows) {
      if (!g.updatedAt) continue
      events.push({
        id: `g-${g.id}`,
        kind: "gamification",
        type: "xp_change",
        title: `${g.userName} reached level ${g.level}`,
        body: `${g.xp} XP · ${g.tasksCompleted} tasks completed`,
        link: "/dashboard/gamification",
        actorName: g.userName,
        entityKind: "gamification",
        occurredAt: new Date(g.updatedAt).toISOString(),
      })
    }

    for (const a of aiRows) {
      if (!a.createdAt) continue
      events.push({
        id: `a-${a.id}`,
        kind: "ai",
        type: `ai_${a.status === "active" ? "insight" : a.status}`,
        title: a.title,
        body: a.description,
        link: "/dashboard/ai-scrum-master",
        entityKind: "ai_insight",
        occurredAt: new Date(a.createdAt).toISOString(),
      })
    }

    const filtered = kind ? events.filter((e) => e.kind === kind) : events
    filtered.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())

    const items = filtered.slice(offset, offset + PAGE_LIMIT)
    const hasMore = offset + PAGE_LIMIT < filtered.length

    /* ---- aggregates (window-scoped, ignore kind/q so panels stay stable) ---- */

    const startOfToday = new Date(now)
    startOfToday.setUTCHours(0, 0, 0, 0)
    const weekAgo = new Date(now - 7 * 86_400_000)

    const perDay = new Map<string, Record<ActivityKind, number>>()
    const chartDays = 14
    const dayOrder: string[] = []
    for (let i = chartDays - 1; i >= 0; i--) {
      const d = new Date(now - i * 86_400_000)
      const key = dayKey(d)
      dayOrder.push(key)
      perDay.set(key, { task: 0, sprint: 0, wellbeing: 0, gamification: 0, ai: 0, notification: 0, system: 0 })
    }
    const actorCounts = new Map<string, number>()
    for (const e of events) {
      const bucket = perDay.get(dayKey(new Date(e.occurredAt)))
      if (bucket) bucket[e.kind] += 1
      if (e.actorName) actorCounts.set(e.actorName, (actorCounts.get(e.actorName) ?? 0) + 1)
    }

    let busiest: { date: string; count: number } | null = null
    for (const key of dayOrder) {
      const row = perDay.get(key)!
      const total = KINDS.reduce((acc, k) => acc + row[k], 0)
      if (total > 0 && (!busiest || total > busiest.count)) busiest = { date: key, count: total }
    }
    const actorsSorted = [...actorCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    const kpis = {
      eventsToday: events.filter((e) => new Date(e.occurredAt).getTime() >= startOfToday.getTime()).length,
      events7d: events.filter((e) => new Date(e.occurredAt).getTime() >= weekAgo.getTime()).length,
      mostActiveMember: actorsSorted[0] ?? null,
      busiestDay: busiest,
    }

    const byDay = dayOrder.map((date) => ({ date, ...perDay.get(date)! }))
    const kindCounts = KINDS.reduce<Record<string, number>>((acc, k) => {
      acc[k] = events.filter((e) => e.kind === k).length
      return acc
    }, {})

    return NextResponse.json({
      items,
      total: filtered.length,
      offset,
      limit: PAGE_LIMIT,
      hasMore,
      windowDays: days,
      filters: { kind: kind ?? null, q: q ?? null },
      unreadCount: unreadRow[0]?.count ?? 0,
      kpis,
      kindCounts,
      byDay,
      actors: actorsSorted.slice(0, 8),
      spotlightTasks: taskRows.slice(0, 8).map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        storyPoints: t.storyPoints,
        assigneeName: t.assigneeName ?? null,
        updatedAt: t.updatedAt ? new Date(t.updatedAt).toISOString() : null,
      })),
      sprintPulse: sprintRows.slice(0, 8).map((s) => ({
        id: s.id,
        name: s.name,
        status: s.status,
        updatedAt: s.updatedAt ? new Date(s.updatedAt).toISOString() : null,
      })),
      checkins: wbRows.slice(0, 8).map((w) => ({
        id: w.id,
        userName: w.userName,
        date: w.date,
        mood: w.mood,
        wellbeingScore: w.wellbeingScore,
        stressLevel: w.stressLevel,
        createdAt: w.createdAt ? new Date(w.createdAt).toISOString() : null,
      })),
      recentNotifications: notifRows.slice(0, 30).map((n) => {
        const metadata = (n.metadata ?? {}) as Record<string, unknown>
        return {
          id: n.id,
          type: n.type,
          title: n.title,
          body: n.body,
          link: typeof metadata.link === "string" ? metadata.link : null,
          isRead: n.isRead ?? false,
          createdAt: n.createdAt ? new Date(n.createdAt).toISOString() : null,
        }
      }),
    })
  } catch (error) {
    console.error("Activity feed error:", error)
    return NextResponse.json(
      { error: "Failed to build activity feed", detail: (error as Error).message },
      { status: 500 },
    )
  }
}
