import { NextResponse } from "next/server";
import { db, transaction } from "@/lib/db";
import {
  calendarEvents,
  chatParticipants,
  gamification,
  kanbanTaskAttachments,
  kanbanTaskComments,
  kanbanTasks,
  messages,
  notifications,
  passwordResetTokens,
  reactions,
  tasks,
  users,
  wellbeingMetrics,
} from "@/drizzle/schema";
import { and, asc, desc, eq, ne, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth-actions";
import { createNotification } from "@/lib/notifications";
import { readTeamSettings, teamNotifyEnabled } from "@/lib/team-settings";

export const dynamic = "force-dynamic";

/* ------------------------------------------------------------- aggregates */

async function loadMemberRow(memberId: number) {
  const [member] = await db.select().from(users).where(eq(users.id, memberId)).limit(1);
  if (!member) return null;

  const [taskAggRow] = await db
    .select({
      openTasks: sql<number>`count(*) filter (where ${tasks.status} <> 'done')::int`,
      doneTasks: sql<number>`count(*) filter (where ${tasks.status} = 'done')::int`,
      blockedTasks: sql<number>`count(*) filter (where ${tasks.status} = 'blocked')::int`,
      openPoints:
        sql<number>`coalesce(sum(${tasks.storyPoints}) filter (where ${tasks.status} <> 'done'), 0)::int`,
      totalTasks: sql<number>`count(*)::int`,
    })
    .from(tasks)
    .where(eq(tasks.assigneeId, memberId));

  const [latestWb] = await db
    .select({
      mood: wellbeingMetrics.mood,
      wellbeingScore: wellbeingMetrics.wellbeingScore,
      stressLevel: wellbeingMetrics.stressLevel,
      date: wellbeingMetrics.date,
    })
    .from(wellbeingMetrics)
    .where(eq(wellbeingMetrics.userId, memberId))
    .orderBy(desc(wellbeingMetrics.date))
    .limit(1);

  const [wbTrend] = await db
    .select({
      avgScore: sql<number>`coalesce(round(avg(${wellbeingMetrics.wellbeingScore}))::int, 0)`,
    })
    .from(wellbeingMetrics)
    .where(eq(wellbeingMetrics.userId, memberId));

  const [game] = await db
    .select({
      xp: gamification.xp,
      level: gamification.level,
      tasksCompleted: gamification.tasksCompleted,
    })
    .from(gamification)
    .where(eq(gamification.userId, memberId))
    .limit(1);

  const utilization = Math.min(100, Number(taskAggRow?.openPoints ?? 0) * 5);

  let skills: string[] = [];
  try {
    if (typeof member.skills === "string") skills = JSON.parse(member.skills);
    else if (Array.isArray(member.skills)) skills = member.skills.map((s) => String(s ?? ""));
  } catch {
    skills = [];
  }
  if (!Array.isArray(skills)) skills = [];

  return {
    profile: {
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.jobTitle || "Team Member",
      systemRole: member.role,
      jobTitle: member.jobTitle,
      department: member.department,
      location: member.location,
      bio: member.bio,
      status: member.status,
      avatar: member.avatar,
      skills,
      timezone: member.timezone,
      joinedAt: member.createdAt ? new Date(member.createdAt).toISOString() : null,
    },
    aggregates: {
      openTasks: Number(taskAggRow?.openTasks ?? 0),
      doneTasks: Number(taskAggRow?.doneTasks ?? 0),
      blockedTasks: Number(taskAggRow?.blockedTasks ?? 0),
      openPoints: Number(taskAggRow?.openPoints ?? 0),
      totalTasks: Number(taskAggRow?.totalTasks ?? 0),
      utilization,
      mood: latestWb?.mood ?? null,
      wellbeingScore: latestWb?.wellbeingScore ?? null,
      stressLevel: latestWb?.stressLevel ?? null,
      latestWellbeingDate: latestWb?.date ?? null,
      avgWellbeingScore: Number(wbTrend?.avgScore ?? 0),
      xp: game?.xp ?? 0,
      level: game?.level ?? 1,
      gamificationTasksCompleted: game?.tasksCompleted ?? 0,
    },
  };
}

function badRequest(detail: string) {
  return NextResponse.json({ success: false, error: detail }, { status: 400 });
}

async function parseMemberId(params: Promise<{ id: string }>) {
  const { id } = await params;
  const memberId = Number.parseInt(id, 10);
  if (!Number.isFinite(memberId) || memberId <= 0) return { error: badRequest("Member id must be a positive integer") } as const;
  return { memberId } as const;
}

/* --------------------------------------------------------------------- GET */

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const parsed = await parseMemberId(params);
    if ("error" in parsed) return parsed.error;

    const result = await loadMemberRow(parsed.memberId);
    if (!result) {
      return NextResponse.json({ success: false, error: "Team member not found" }, { status: 404 });
    }

    const openTasks = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        status: tasks.status,
        priority: tasks.priority,
        storyPoints: tasks.storyPoints,
        dueDate: tasks.dueDate,
        updatedAt: tasks.updatedAt,
      })
      .from(tasks)
      .where(and(eq(tasks.assigneeId, parsed.memberId), ne(tasks.status, "done")))
      .orderBy(asc(tasks.dueDate))
      .limit(10);

    return NextResponse.json({ success: true, ...result, openTasks });
  } catch (error) {
    console.error("Error fetching team member:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch team member" },
      { status: 500 },
    );
  }
}

/* ------------------------------------------------------------------- PATCH */

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const parsed = await parseMemberId(params);
    if ("error" in parsed) return parsed.error;
    const { memberId } = parsed;

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return badRequest("A JSON body is required");

    const updates: Partial<typeof users.$inferInsert> = {};
    if (typeof body.name === "string" && body.name.trim()) updates.name = body.name.trim();
    if (typeof body.role === "string" && body.role.trim()) updates.jobTitle = body.role.trim();
    if (typeof body.jobTitle === "string") updates.jobTitle = body.jobTitle.trim() || null;
    if (typeof body.department === "string") updates.department = body.department.trim() || null;
    if (typeof body.location === "string") updates.location = body.location.trim() || null;
    if (typeof body.bio === "string") updates.bio = body.bio.trim() || null;
    if (typeof body.timezone === "string" && body.timezone.trim()) updates.timezone = body.timezone.trim();
    if (typeof body.status === "string" && body.status.trim()) updates.status = body.status.trim();
    if (typeof body.avatar === "string") updates.avatar = body.avatar.trim() || null;
    if (body.skills !== undefined) {
      updates.skills = Array.isArray(body.skills) ? body.skills.map((s) => String(s)) : [];
    }

    if (Object.keys(updates).length === 0) {
      return badRequest("No valid fields to update");
    }

    const [before] = await db.select().from(users).where(eq(users.id, memberId)).limit(1);
    if (!before) {
      return NextResponse.json({ success: false, error: "Team member not found" }, { status: 404 });
    }

    updates.updatedAt = new Date();
    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, memberId))
      .returning();

    // Notify the member when someone else renames them or changes their role.
    const changedBySomeoneElse = session.id !== memberId;
    const nameChanged = updates.name !== undefined && updates.name !== before.name;
    const roleChanged = updates.jobTitle !== undefined && updates.jobTitle !== before.jobTitle;
    const settings = await readTeamSettings();
    if (changedBySomeoneElse && (nameChanged || roleChanged) && teamNotifyEnabled(settings, "profileUpdated")) {
      const parts: string[] = [];
      if (nameChanged) parts.push(`name → ${updates.name}`);
      if (roleChanged) parts.push(`role → ${updates.jobTitle || "Team Member"}`);
      await createNotification({
        userId: memberId,
        type: "system",
        title: "Your team profile was updated",
        body: `${session.name || "A teammate"} changed ${parts.join(" and ")} for your profile.`,
        link: "/dashboard/team",
        metadata: { teamMemberId: memberId, changedBy: session.id, changes: parts },
      }).catch(() => undefined);
    }

    const result = await loadMemberRow(memberId);
    const { passwordHash: _hash, ...safeUpdated } = updated;
    void _hash;
    return NextResponse.json({ success: true, member: safeUpdated, ...result });
  } catch (error) {
    console.error("Error updating team member:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to update team member" },
      { status: 500 },
    );
  }
}

/* ------------------------------------------------------------------ DELETE */

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const parsed = await parseMemberId(params);
    if ("error" in parsed) return parsed.error;
    const { memberId } = parsed;

    if (memberId === session.id) {
      return NextResponse.json(
        { success: false, error: "You cannot remove your own account from the team" },
        { status: 400 },
      );
    }

    const [member] = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, memberId)).limit(1);
    if (!member) {
      return NextResponse.json({ success: false, error: "Team member not found" }, { status: 404 });
    }

    const [taskCounts] = await db
      .select({
        openTasks: sql<number>`count(*) filter (where ${tasks.status} <> 'done')::int`,
        doneTasks: sql<number>`count(*) filter (where ${tasks.status} = 'done')::int`,
        totalTasks: sql<number>`count(*)::int`,
      })
      .from(tasks)
      .where(eq(tasks.assigneeId, memberId));

    const counts = {
      openTasks: Number(taskCounts?.openTasks ?? 0),
      doneTasks: Number(taskCounts?.doneTasks ?? 0),
      totalTasks: Number(taskCounts?.totalTasks ?? 0),
    };
    if (counts.totalTasks > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `${member.name} still owns ${counts.totalTasks} task(s) (${counts.openTasks} open, ${counts.doneTasks} done). Reassign or delete their tasks first.`,
          counts,
        },
        { status: 409 },
      );
    }

    // The removal transaction deletes the member's rows (notifications included),
    // so the audit receipt goes to whoever performed the removal.
    const settings = await readTeamSettings();

    await transaction(async (tx) => {
      // Drop rows that reference this user, then the user itself.
      await tx.delete(reactions).where(eq(reactions.userId, memberId));
      await tx.delete(messages).where(eq(messages.senderId, memberId));
      await tx.delete(chatParticipants).where(eq(chatParticipants.userId, memberId));
      await tx.delete(kanbanTaskComments).where(eq(kanbanTaskComments.userId, memberId));
      await tx.delete(kanbanTaskAttachments).where(eq(kanbanTaskAttachments.userId, memberId));
      await tx.delete(kanbanTasks).where(eq(kanbanTasks.assigneeId, memberId));
      await tx.delete(calendarEvents).where(eq(calendarEvents.organizerId, memberId));
      await tx.delete(wellbeingMetrics).where(eq(wellbeingMetrics.userId, memberId));
      await tx.delete(gamification).where(eq(gamification.userId, memberId));
      await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, memberId));
      await tx.delete(notifications).where(eq(notifications.userId, memberId));
      await tx.delete(users).where(eq(users.id, memberId));
    });

    if (teamNotifyEnabled(settings, "memberRemoved")) {
      await createNotification({
        userId: session.id,
        type: "system",
        title: `${member.name} was removed`,
        body: `${member.name} no longer has access to the ${settings.teamName} workspace.`,
        link: "/dashboard/team",
        metadata: { teamMemberId: memberId, removedBy: session.id, counts },
      }).catch(() => undefined);
    }

    return NextResponse.json({ success: true, removed: { id: member.id, name: member.name } });
  } catch (error) {
    console.error("Error deleting team member:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to delete team member" },
      { status: 500 },
    );
  }
}
