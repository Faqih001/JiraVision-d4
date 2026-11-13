import { and, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { db } from "@/lib/db"
import { ticketEvents, tickets } from "@/drizzle/schema"
import {
  isOrganizationDepartment,
  isOrganizationMember,
  isTicketPriority,
  isTicketStatus,
  loadScopedTicket,
} from "@/lib/tickets"

type Params = { params: { id: string } }

export async function GET(_request: Request, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  const ticketId = Number(params.id)
  if (!Number.isInteger(ticketId)) return NextResponse.json({ error: "Invalid ticket id." }, { status: 400 })

  const ticket = await loadScopedTicket(ticketId, session.id)
  if (!ticket) return NextResponse.json({ error: "Ticket not found." }, { status: 404 })

  const events = await db.select().from(ticketEvents).where(eq(ticketEvents.ticketId, ticketId)).orderBy(ticketEvents.createdAt)
  return NextResponse.json({ ticket, events })
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  const ticketId = Number(params.id)
  if (!Number.isInteger(ticketId)) return NextResponse.json({ error: "Invalid ticket id." }, { status: 400 })

  const current = await loadScopedTicket(ticketId, session.id)
  if (!current) return NextResponse.json({ error: "Ticket not found." }, { status: 404 })

  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  const changes: Partial<typeof tickets.$inferInsert> = {}
  const events: Array<{ type: string; fromValue: string | null; toValue: string | null }> = []

  if (body?.status !== undefined) {
    if (!isTicketStatus(body.status)) return NextResponse.json({ error: "Invalid status." }, { status: 400 })
    changes.status = body.status
    if (body.status === "resolved") changes.resolvedAt = new Date()
    if (body.status === "closed") changes.closedAt = new Date()
    events.push({ type: "status_changed", fromValue: current.status, toValue: body.status })
  }
  if (body?.priority !== undefined) {
    if (!isTicketPriority(body.priority)) return NextResponse.json({ error: "Invalid priority." }, { status: 400 })
    changes.priority = body.priority
    events.push({ type: "priority_changed", fromValue: current.priority, toValue: body.priority })
  }
  if (body?.departmentId !== undefined) {
    const departmentId = body.departmentId === null || body.departmentId === "" ? null : Number(body.departmentId)
    if (departmentId !== null && (!Number.isInteger(departmentId) || !(await isOrganizationDepartment(current.organizationId, departmentId)))) {
      return NextResponse.json({ error: "Department is not part of this organization." }, { status: 400 })
    }
    changes.departmentId = departmentId
    events.push({ type: "department_changed", fromValue: current.departmentId?.toString() ?? null, toValue: departmentId?.toString() ?? null })
  }
  if (body?.assigneeId !== undefined) {
    const assigneeId = body.assigneeId === null || body.assigneeId === "" ? null : Number(body.assigneeId)
    if (assigneeId !== null && (!Number.isInteger(assigneeId) || !(await isOrganizationMember(current.organizationId, assigneeId)))) {
      return NextResponse.json({ error: "Assignee is not part of this organization." }, { status: 400 })
    }
    changes.assigneeId = assigneeId
    events.push({ type: "assignee_changed", fromValue: current.assigneeId?.toString() ?? null, toValue: assigneeId?.toString() ?? null })
  }
  if (Object.keys(changes).length === 0) return NextResponse.json({ ticket: current })

  changes.updatedAt = new Date()
  const [ticket] = await db.update(tickets).set(changes).where(and(eq(tickets.id, ticketId), eq(tickets.organizationId, current.organizationId))).returning()
  if (events.length) {
    await db.insert(ticketEvents).values(events.map((event) => ({ ...event, ticketId, actorId: session.id })))
  }
  return NextResponse.json({ ticket })
}
