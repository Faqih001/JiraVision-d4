import { and, asc, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { db } from "@/lib/db"
import { ticketDepartments } from "@/drizzle/schema"
import { getTicketOrganization } from "@/lib/tickets"

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  const organizationId = await getTicketOrganization(session.id)
  if (organizationId === null) return NextResponse.json({ departments: [] })
  const departments = await db.select().from(ticketDepartments)
    .where(and(eq(ticketDepartments.organizationId, organizationId), eq(ticketDepartments.active, true)))
    .orderBy(asc(ticketDepartments.name))
  return NextResponse.json({ departments })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  if (session.role !== "admin" && session.role !== "owner") {
    return NextResponse.json({ error: "Only organization admins can manage departments." }, { status: 403 })
  }
  const organizationId = await getTicketOrganization(session.id)
  if (organizationId === null) return NextResponse.json({ error: "Join an organization first." }, { status: 400 })
  const body = await request.json().catch(() => null) as { name?: unknown; code?: unknown } | null
  const name = typeof body?.name === "string" ? body.name.trim() : ""
  const code = typeof body?.code === "string" ? body.code.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-") : ""
  if (!name || !code) return NextResponse.json({ error: "Name and code are required." }, { status: 400 })
  const [department] = await db.insert(ticketDepartments).values({ organizationId, name, code }).returning()
  return NextResponse.json({ department }, { status: 201 })
}
