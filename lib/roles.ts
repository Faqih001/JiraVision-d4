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

// ---- Work disciplines -------------------------------------------------------------
// The one vocabulary for "what kind of work is this". A person may hold several; the
// viewer filter is a preference, not a fork of the app (design §2, §6). Values are the
// strings stored in tasks.discipline, work_log_entries.discipline and
// deliverables.discipline, so renaming one is a migration, not an edit.
export const WORK_DISCIPLINES = [
  "developer",
  "technician",
  "designer",
  "auditor",
  "coordinator",
] as const
export type WorkDiscipline = (typeof WORK_DISCIPLINES)[number]

export const DISCIPLINE_LABEL: Record<WorkDiscipline, string> = {
  developer: "Development",
  technician: "IT & infrastructure",
  designer: "Design",
  auditor: "Audit & assurance",
  coordinator: "Coordination",
}

// Lucide component names, resolved by the component that renders them. Kept as strings so
// this module stays importable in a node test environment.
export const DISCIPLINE_ICON: Record<WorkDiscipline, string> = {
  developer: "Code2",
  technician: "Wrench",
  designer: "Palette",
  auditor: "SearchCheck",
  coordinator: "Users",
}

// Every palette token in app/globals.css is an HSL channel triplet, so it is consumed
// wrapped — a bare var() here is an invalid colour and renders nothing.
export const DISCIPLINE_COLOUR: Record<WorkDiscipline, string> = {
  developer: "hsl(var(--chart-pine))",
  technician: "hsl(var(--chart-stone))",
  designer: "hsl(var(--chart-clay))",
  auditor: "hsl(var(--chart-moss))",
  coordinator: "hsl(var(--accent))",
}

// Report template per discipline — read by lib/reports/templates.ts in phase 3.
export const DISCIPLINE_TEMPLATE: Record<WorkDiscipline, string> = {
  developer: "engineering",
  technician: "technical",
  designer: "creative",
  auditor: "assurance",
  coordinator: "general",
}

export const DEFAULT_DISCIPLINE: WorkDiscipline = "coordinator"

export function isWorkDiscipline(value: unknown): value is WorkDiscipline {
  return typeof value === "string" && (WORK_DISCIPLINES as readonly string[]).includes(value)
}

/** Exact match after trimming; unknown values are null, never a silent default. */
export function normaliseDiscipline(value: unknown): WorkDiscipline | null {
  if (typeof value !== "string") return null
  const candidate = value.trim().toLowerCase()
  return isWorkDiscipline(candidate) ? candidate : null
}
