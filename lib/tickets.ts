import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { ticketDepartments, tickets, users } from "@/drizzle/schema"
import { loadUserOrgId } from "@/lib/organizations"

export const TICKET_STATUSES = ["new", "triaged", "assigned", "in_progress", "waiting", "resolved", "closed"] as const
export const TICKET_PRIORITIES = ["low", "medium", "high", "urgent"] as const

export type TicketStatus = (typeof TICKET_STATUSES)[number]
export type TicketPriority = (typeof TICKET_PRIORITIES)[number]

export function isTicketStatus(value: unknown): value is TicketStatus {
  return typeof value === "string" && TICKET_STATUSES.includes(value as TicketStatus)
}

export function isTicketPriority(value: unknown): value is TicketPriority {
  return typeof value === "string" && TICKET_PRIORITIES.includes(value as TicketPriority)
}

export async function getTicketOrganization(userId: number) {
  return loadUserOrgId(userId)
}

export async function isOrganizationMember(organizationId: number, userId: number): Promise<boolean> {
  const [member] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.organizationId, organizationId)))
    .limit(1)
  return Boolean(member)
}

export async function isOrganizationDepartment(organizationId: number, departmentId: number): Promise<boolean> {
  const [department] = await db
    .select({ id: ticketDepartments.id })
    .from(ticketDepartments)
    .where(and(eq(ticketDepartments.id, departmentId), eq(ticketDepartments.organizationId, organizationId), eq(ticketDepartments.active, true)))
    .limit(1)
  return Boolean(department)
}

export async function loadScopedTicket(ticketId: number, userId: number) {
  const organizationId = await getTicketOrganization(userId)
  if (organizationId === null) return null

  const [ticket] = await db
    .select()
    .from(tickets)
    .where(and(eq(tickets.id, ticketId), eq(tickets.organizationId, organizationId)))
    .limit(1)
  return ticket ?? null
}
