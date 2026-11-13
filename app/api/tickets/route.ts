import { and, desc, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { db } from "@/lib/db"
import { ticketDepartments, ticketEvents, tickets, users } from "@/drizzle/schema"
import {
  getTicketOrganization,
  isOrganizationDepartment,
  isOrganizationMember,
  isTicketPriority,
} from "@/lib/tickets"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const organizationId = await getTicketOrganization(session.id)
  if (organizationId === null) return NextResponse.json({ tickets: [], departments: [] })

  const status = new URL(request.url).searchParams.get("status")
  const rows = await db
    .select({
      id: tickets.id,
      subject: tickets.subject,
      description: tickets.description,
      status: tickets.status,
      priority: tickets.priority,
      category: tickets.category,
      requesterId: tickets.requesterId,
      requesterName: users.name,
      assigneeId: tickets.assigneeId,
      departmentId: tickets.departmentId,
      departmentName: ticketDepartments.name,
      slaDueAt: tickets.slaDueAt,
      resolvedAt: tickets.resolvedAt,
      createdAt: tickets.createdAt,
      updatedAt: tickets.updatedAt,
    })
    .from(tickets)
    .leftJoin(users, eq(users.id, tickets.requesterId))
    .leftJoin(ticketDepartments, eq(ticketDepartments.id, tickets.departmentId))
    .where(and(eq(tickets.organizationId, organizationId), status ? eq(tickets.status, status) : undefined))
    .orderBy(desc(tickets.updatedAt))

  const departments = await db
    .select({ id: ticketDepartments.id, name: ticketDepartments.name, code: ticketDepartments.code })
    .from(ticketDepartments)
    .where(and(eq(ticketDepartments.organizationId, organizationId), eq(ticketDepartments.active, true)))

  return NextResponse.json({ tickets: rows, departments })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const organizationId = await getTicketOrganization(session.id)
  if (organizationId === null) return NextResponse.json({ error: "Join an organization before creating a ticket." }, { status: 400 })

  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  const subject = typeof body?.subject === "string" ? body.subject.trim() : ""
  const description = typeof body?.description === "string" ? body.description.trim() : ""
  const priority = body?.priority ?? "medium"
  const category = typeof body?.category === "string" ? body.category.trim() || null : null
  const departmentId = body?.departmentId == null || body.departmentId === "" ? null : Number(body.departmentId)
  const assigneeId = body?.assigneeId == null || body.assigneeId === "" ? null : Number(body.assigneeId)

  if (!subject || subject.length > 255) {
    return NextResponse.json({ error: "Subject is required and must be 255 characters or fewer." }, { status: 400 })
  }
  if (!description) return NextResponse.json({ error: "Description is required." }, { status: 400 })
  if (!isTicketPriority(priority)) return NextResponse.json({ error: "Invalid priority." }, { status: 400 })
  if (departmentId !== null && (!Number.isInteger(departmentId) || !(await isOrganizationDepartment(organizationId, departmentId)))) {
    return NextResponse.json({ error: "Department is not part of this organization." }, { status: 400 })
  }
  if (assigneeId !== null && (!Number.isInteger(assigneeId) || !(await isOrganizationMember(organizationId, assigneeId)))) {
    return NextResponse.json({ error: "Assignee is not part of this organization." }, { status: 400 })
  }

  const [ticket] = await db.insert(tickets).values({
    organizationId,
    subject,
    description,
    priority,
    category,
    requesterId: session.id,
    createdBy: session.id,
    assigneeId,
    departmentId,
    status: assigneeId ? "assigned" : "new",
  }).returning()

  await db.insert(ticketEvents).values({
    ticketId: ticket.id,
    actorId: session.id,
    type: "created",
    toValue: ticket.status,
  })

  return NextResponse.json({ ticket }, { status: 201 })
}
