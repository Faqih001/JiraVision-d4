// Role policy, kept free of cookies and database imports so it can be unit
// tested in isolation (lib/session.ts pulls in lib/db, which needs DATABASE_URL
// at import time).

const ADMIN_ROLES = ["admin", "superadmin"]

/** Env bootstrap list: comma-separated emails treated as super-admins. */
export function parseAdminEmails(raw: string | undefined): string[] {
  if (!raw) return []
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

/**
 * Role stamped on a brand-new account. An ADMIN_EMAILS address gets a real
 * superadmin row instead of being left as role='user' while isSuperAdmin()
 * silently grants it from the environment — the grant has to be visible in the
 * data, since the unique email column means only one account can ever hold it.
 */
export function roleForSignup(
  email: string,
  adminEmailsRaw?: string,
): "superadmin" | "user" {
  return parseAdminEmails(adminEmailsRaw ?? process.env.ADMIN_EMAILS).includes(
    email.trim().toLowerCase(),
  )
    ? "superadmin"
    : "user"
}

export function isSuperAdmin(
  user: { email: string; role?: string | null } | null | undefined,
  adminEmailsRaw?: string,
): user is { email: string; role?: string | null } {
  if (!user) return false
  if (ADMIN_ROLES.includes((user.role ?? "").toLowerCase())) return true
  return parseAdminEmails(adminEmailsRaw ?? process.env.ADMIN_EMAILS).includes(
    user.email.toLowerCase(),
  )
}
