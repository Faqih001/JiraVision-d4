import { asc, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { db } from "@/lib/db"
import { ticketComments, ticketEvents, users } from "@/drizzle/schema"
import { loadScopedTicket } from "@/lib/tickets"

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  const ticketId = Number((await params).id)
  if (!Number.isInteger(ticketId) || !(await loadScopedTicket(ticketId, session.id))) {
    return NextResponse.json({ error: "Ticket not found." }, { status: 404 })
  }
  const comments = await db.select({
    id: ticketComments.id,
    body: ticketComments.body,
    authorId: ticketComments.authorId,
    authorName: users.name,
    createdAt: ticketComments.createdAt,
  }).from(ticketComments).leftJoin(users, eq(users.id, ticketComments.authorId)).where(eq(ticketComments.ticketId, ticketId)).orderBy(asc(ticketComments.createdAt))
  return NextResponse.json({ comments })
}

export async function POST(request: Request, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  const ticketId = Number((await params).id)
  if (!Number.isInteger(ticketId) || !(await loadScopedTicket(ticketId, session.id))) {
    return NextResponse.json({ error: "Ticket not found." }, { status: 404 })
  }
  const body = await request.json().catch(() => null) as { body?: unknown } | null
  const text = typeof body?.body === "string" ? body.body.trim() : ""
  if (!text) return NextResponse.json({ error: "Comment is required." }, { status: 400 })
  const [comment] = await db.insert(ticketComments).values({ ticketId, authorId: session.id, body: text }).returning()
  await db.insert(ticketEvents).values({ ticketId, actorId: session.id, type: "commented", toValue: comment.id.toString() })
  return NextResponse.json({ comment }, { status: 201 })
}
