// Helpers shared by the register routes: the session gate, the reader's view of the row,
// and the field readers used by create, edit and bulk. Kept out of the routes so all three
// refuse the same inputs with the same message.

import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { isSuperAdmin } from "@/lib/roles"
import type { SessionUser } from "@/lib/registers/session"
import { viewerOf, type ViewerView } from "@/lib/registers/read"
import { localDay } from "@/lib/worklog/local-day"

export const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })

export type RegisterGate = {
  session: SessionUser
  viewer: ViewerView
  today: string
}

export async function registerSession(): Promise<RegisterGate | null> {
  const session = await getSession()
  if (!session?.id) return null

  const user: SessionUser = {
    id: session.id,
    email: session.email,
    role: session.role,
    timezone: session.timezone,
    preferences: session.preferences,
  }

  return {
    session: user,
    viewer: viewerOf(user),
    today: localDay(new Date(), user.timezone),
  }
}

export function parseId(raw: string): number | null {
  const id = Number.parseInt(raw, 10)
  return Number.isFinite(id) && id > 0 ? id : null
}

export function readTitle(value: unknown): string | null {
  if (typeof value !== "string") return null
  const title = value.trim()
  return title && title.length <= 200 ? title : null
}

export type IntervalRead =
  | { ok: true; value: number | null }
  | { ok: false; error: string }

export function readInterval(value: unknown): IntervalRead {
  if (value === null || value === undefined) return { ok: true, value: null }
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 3650) {
    return { ok: false, error: "verifyIntervalDays must be a whole number of days between 0 and 3650." }
  }
  return { ok: true, value }
}

export type OwnerRead =
  | { ok: true; value: number | null }
  | { ok: false; error: string }

export function readOwnerId(value: unknown): OwnerRead {
  if (value === null) return { ok: true, value: null }
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    return { ok: false, error: "ownerId must be a positive user id or null." }
  }
  return { ok: true, value }
}

export const isAdmin = (session: SessionUser): boolean => isSuperAdmin(session)
