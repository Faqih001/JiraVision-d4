// The fields the playbook routes read from a signed-in user, and the one place the admin
// answer is decided. Kept structural so importing this module pulls no cookie or database.

import { isSuperAdmin } from "@/lib/roles"
import type { PlaybookViewer } from "./rules"

export type { PlaybookViewer }

export type PlaybookSession = {
  id: number
  email: string
  role?: string | null
  timezone?: string | null
}

export function playbookViewer(session: PlaybookSession): PlaybookViewer {
  return { id: session.id, admin: isSuperAdmin(session) }
}
