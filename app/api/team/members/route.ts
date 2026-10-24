import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { gamification, tasks, users, wellbeingMetrics } from "@/drizzle/schema";
import { asc, desc, eq, ne, sql, type InferSelectModel } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { getSession } from "@/lib/auth-actions";
import { createNotification } from "@/lib/notifications";
import { readTeamSettings, teamNotifyEnabled } from "@/lib/team-settings";

export const dynamic = "force-dynamic";

/* ------------------------------------------------------------------ types */

export interface TeamMemberRow {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string;
  status: string;
  avatar: string | null;
  currentSprint: { name: string; tasks: number } | null;
  skills: string[];
  utilization: number;
  jobTitle: string | null;
  location: string | null;
  joinedAt: string | null;
  openTasks: number;
  doneTasks: number;
  blockedTasks: number;
  openPoints: number;
  mood: string | null;
  wellbeingScore: number | null;
  xp: number;
  level: number;
}

interface TaskAgg {
  openTasks: number;
  doneTasks: number;
  blockedTasks: number;
  openPoints: number;
}

interface WellbeingLatest {
  mood: string;
  wellbeingScore: number;
  date: string;
}

/* ------------------------------------------------------------- aggregates */

export async function loadTaskAggregates(): Promise<Map<number, TaskAgg>> {
  const rows = await db
    .select({
      assigneeId: tasks.assigneeId,
      openTasks: sql<number>`count(*) filter (where ${tasks.status} <> 'done')::int`,
      doneTasks: sql<number>`count(*) filter (where ${tasks.status} = 'done')::int`,
      blockedTasks: sql<number>`count(*) filter (where ${tasks.status} = 'blocked')::int`,
      openPoints:
        sql<number>`coalesce(sum(${tasks.storyPoints}) filter (where ${tasks.status} <> 'done'), 0)::int`,
    })
    .from(tasks)
    .where(sql`${tasks.assigneeId} is not null`)
    .groupBy(tasks.assigneeId);

  const map = new Map<number, TaskAgg>();
  for (const r of rows) {
    if (r.assigneeId == null) continue;
    map.set(r.assigneeId, {
      openTasks: Number(r.openTasks ?? 0),
      doneTasks: Number(r.doneTasks ?? 0),
      blockedTasks: Number(r.blockedTasks ?? 0),
      openPoints: Number(r.openPoints ?? 0),
    });
  }
  return map;
}

export async function loadLatestWellbeing(): Promise<Map<number, WellbeingLatest>> {
  const rows = await db
    .select({
      userId: wellbeingMetrics.userId,
      mood: wellbeingMetrics.mood,
      wellbeingScore: wellbeingMetrics.wellbeingScore,
      date: wellbeingMetrics.date,
    })
    .from(wellbeingMetrics)
    .orderBy(asc(wellbeingMetrics.userId), desc(wellbeingMetrics.date));

  const map = new Map<number, WellbeingLatest>();
  for (const r of rows) {
    if (!map.has(r.userId)) {
      map.set(r.userId, { mood: r.mood, wellbeingScore: r.wellbeingScore, date: r.date });
    }
  }
  return map;
}

export async function loadGamification(): Promise<Map<number, { xp: number; level: number }>> {
  const rows = await db
    .select({ userId: gamification.userId, xp: gamification.xp, level: gamification.level })
    .from(gamification);
  return new Map(rows.map((r) => [r.userId, { xp: r.xp, level: r.level }]));
}

/* ------------------------------------------------------------- formatting */

export function formatMember(
  member: InferSelectModel<typeof users>,
  taskAgg: TaskAgg,
  wellbeing: WellbeingLatest | undefined,
  game: { xp: number; level: number } | undefined,
  maxOpenPoints: number,
): TeamMemberRow {
  let skills: string[] = [];
  const rawSkills = member.skills as unknown;
  try {
    if (typeof rawSkills === "string") skills = JSON.parse(rawSkills);
    else if (Array.isArray(rawSkills)) skills = rawSkills.map((s) => String(s ?? ""));
  } catch {
    skills = [];
  }
  if (!Array.isArray(skills)) skills = [];

  const utilization =
    maxOpenPoints > 0 ? Math.min(100, Math.round((taskAgg.openPoints / maxOpenPoints) * 100)) : 0;

  return {
    id: member.id,
    name: member.name || "Unknown User",
    email: member.email || "",
    role: member.jobTitle || "Team Member",
    department: member.department || "General",
    status: member.status || "offline",
    avatar: member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name || "U")}&background=random`,
    currentSprint: null,
    skills,
    utilization,
    jobTitle: member.jobTitle,
    location: member.location,
    joinedAt: member.createdAt ? new Date(member.createdAt).toISOString() : null,
    openTasks: taskAgg.openTasks,
    doneTasks: taskAgg.doneTasks,
    blockedTasks: taskAgg.blockedTasks,
    openPoints: taskAgg.openPoints,
    mood: wellbeing?.mood ?? null,
    wellbeingScore: wellbeing?.wellbeingScore ?? null,
    xp: game?.xp ?? 0,
    level: game?.level ?? 1,
  };
}

/* --------------------------------------------------------------------- GET */

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ success: false, error: "Unauthorized", teamMembers: [] }, { status: 401 });
    }

    const [memberRows, taskAggs, wellbeingMap, gameMap] = await Promise.all([
      db.select().from(users).where(ne(users.role, "admin")).orderBy(asc(users.name)),
      loadTaskAggregates(),
      loadLatestWellbeing(),
      loadGamification(),
    ]);

    const emptyAgg: TaskAgg = { openTasks: 0, doneTasks: 0, blockedTasks: 0, openPoints: 0 };
    const maxOpenPoints = memberRows.reduce(
      (m, u) => Math.max(m, (taskAggs.get(u.id) ?? emptyAgg).openPoints),
      0,
    );

    const teamMembers = memberRows.map((member) =>
      formatMember(
        member,
        taskAggs.get(member.id) ?? emptyAgg,
        wellbeingMap.get(member.id),
        gameMap.get(member.id),
        maxOpenPoints,
      ),
    );

    return NextResponse.json({ success: true, teamMembers });
  } catch (error) {
    console.error("Error fetching team members:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error fetching team members",
        teamMembers: [],
      },
      { status: 500 },
    );
  }
}

/* -------------------------------------------------------------------- POST */

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as {
      name?: unknown;
      email?: unknown;
      role?: unknown;
      jobTitle?: unknown;
      department?: unknown;
      avatar?: unknown;
      location?: unknown;
    } | null;

    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const jobTitle =
      typeof body?.jobTitle === "string" && body.jobTitle.trim()
        ? body.jobTitle.trim()
        : typeof body?.role === "string" && body.role.trim()
          ? body.role.trim()
          : null;
    const department = typeof body?.department === "string" && body.department.trim() ? body.department.trim() : null;
    const avatar = typeof body?.avatar === "string" && body.avatar.trim() ? body.avatar.trim() : null;
    const location = typeof body?.location === "string" && body.location.trim() ? body.location.trim() : null;

    if (!name) {
      return NextResponse.json({ success: false, error: "A member name is required" }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, error: "A valid email is required" }, { status: 400 });
    }

    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ success: false, error: "A member with that email already exists" }, { status: 409 });
    }

    // users.password_hash is NOT NULL; a member invited through this endpoint
    // signs in later via the reset-link flow, so store an unusable random hash.
    const placeholderHash = await bcrypt.hash(uuidv4(), 10);

    const settings = await readTeamSettings();

    const [created] = await db
      .insert(users)
      .values({
        name,
        email,
        passwordHash: placeholderHash,
        role: settings.defaultMemberRole,
        jobTitle,
        department,
        location,
        avatar,
        status: "offline",
      })
      .returning();

    if (teamNotifyEnabled(settings, "memberJoined")) {
      await createNotification({
        userId: session.id,
        type: "system",
        title: `${name} joined ${settings.teamName}`,
        body: jobTitle
          ? `${name} was added as ${jobTitle} with ${settings.defaultMemberRole} access.`
          : `${name} was added to the team roster with ${settings.defaultMemberRole} access.`,
        link: "/dashboard/team",
        metadata: { teamMemberId: created.id, accessRole: settings.defaultMemberRole },
      }).catch(() => undefined);
    }

    const { passwordHash: _hash, ...safeMember } = created;
    void _hash;

    return NextResponse.json({ success: true, teamMember: safeMember }, { status: 201 });
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === "23505") {
      return NextResponse.json({ success: false, error: "A member with that email already exists" }, { status: 409 });
    }
    console.error("Error creating team member:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to create team member" },
      { status: 500 },
    );
  }
}
