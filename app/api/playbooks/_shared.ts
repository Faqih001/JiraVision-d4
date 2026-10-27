// Helpers shared by the playbook routes: the session gate and small parsers. Kept out of
// the routes so all four refuse an anonymous request the same way.

import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { localDay } from "@/lib/worklog/local-day"
import {
  playbookViewer,
  type PlaybookSession,
  type PlaybookViewer,
} from "@/lib/playbooks/session"

export const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })

export type PlaybookGate = {
  session: PlaybookSession
  viewer: PlaybookViewer
  today: string
}

export async function playbookSession(): Promise<PlaybookGate | null> {
  const session = await getSession()
  if (!session?.id) return null

  const user: PlaybookSession = {
    id: session.id,
    email: session.email,
    role: session.role,
    timezone: session.timezone,
  }

  return {
    session: user,
    viewer: playbookViewer(user),
    today: localDay(new Date(), user.timezone),
  }
}

export function parseId(raw: string): number | null {
  const id = Number.parseInt(raw, 10)
  return Number.isFinite(id) && id > 0 ? id : null
}
