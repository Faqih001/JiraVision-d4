// Visibility enforcement for work reports. A report is readable only by its author,
// its listed recipients, and admin/superadmin — enforced in the query, not the UI
// (spec §14). This module provides the pure predicate; the SQL WHERE clause that
// uses it lives in each route's shared reader.

import { isSuperAdmin } from "@/lib/roles"

export function isAdmin(user: { role: string; email: string }): boolean {
  return isSuperAdmin(user)
}

export function canReadReport(
  actor: { id: number; role: string; email: string },
  report: { userId: number },
  recipientIds: number[],
): boolean {
  if (actor.id === report.userId) return true
  if (isAdmin(actor)) return true
  return recipientIds.includes(actor.id)
}
