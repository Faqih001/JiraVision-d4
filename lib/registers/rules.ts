// Who may see a register row, who may change it, and which lifecycle moves need a reason.
// Pure so the custody rule is testable without a session (design §12 item 2).

export const REGISTER_STATUSES = [
  "in_service",
  "awaiting_repair",
  "awaiting_disposal",
  "disposed",
  "retired",
] as const
export type RegisterStatus = (typeof REGISTER_STATUSES)[number]

export const REGISTER_STATUS_LABEL: Record<RegisterStatus, string> = {
  in_service: "In service",
  awaiting_repair: "Awaiting repair",
  awaiting_disposal: "Awaiting disposal",
  disposed: "Disposed",
  retired: "Retired",
}

export const REGISTER_CUSTODY = ["member", "team", "org"] as const
export type RegisterCustody = (typeof REGISTER_CUSTODY)[number]

export const CUSTODY_LABEL: Record<RegisterCustody, string> = {
  member: "Mine only",
  team: "Whole team",
  org: "Whole organisation",
}

export function isRegisterStatus(value: unknown): value is RegisterStatus {
  return typeof value === "string" && (REGISTER_STATUSES as readonly string[]).includes(value)
}

export function isRegisterCustody(value: unknown): value is RegisterCustody {
  return typeof value === "string" && (REGISTER_CUSTODY as readonly string[]).includes(value)
}

export type RegisterTransition = {
  to: RegisterStatus
  label: string
  requiresReason: boolean
}

// Anything that takes an asset out of service — or puts one back with no explanation — needs
// a sentence. Returning a repaired item to service is the one free move.
export const REGISTER_LIFECYCLE: Record<RegisterStatus, RegisterTransition[]> = {
  in_service: [
    { to: "awaiting_repair", label: "Send for repair", requiresReason: true },
    { to: "awaiting_disposal", label: "Mark for disposal", requiresReason: true },
    { to: "retired", label: "Retire", requiresReason: true },
  ],
  awaiting_repair: [
    { to: "in_service", label: "Return to service", requiresReason: false },
    { to: "awaiting_disposal", label: "Mark for disposal", requiresReason: true },
  ],
  awaiting_disposal: [
    { to: "disposed", label: "Record disposal", requiresReason: true },
    { to: "in_service", label: "Return to service", requiresReason: true },
  ],
  disposed: [],
  retired: [{ to: "in_service", label: "Return to service", requiresReason: true }],
}

export function transitionsFrom(status: RegisterStatus): RegisterTransition[] {
  return REGISTER_LIFECYCLE[status]
}

export function transitionFor(from: RegisterStatus, to: unknown): RegisterTransition | null {
  if (!isRegisterStatus(to)) return null
  return REGISTER_LIFECYCLE[from].find((transition) => transition.to === to) ?? null
}

export type TransitionRead =
  | { ok: true; status: RegisterStatus; reason: string | null }
  | { ok: false; error: string }

const MAX_REASON = 500

export function readRegisterTransition(from: RegisterStatus, to: unknown, reason: unknown): TransitionRead {
  const transition = transitionFor(from, to)
  if (!transition) {
    const allowed = REGISTER_LIFECYCLE[from].map((entry) => REGISTER_STATUS_LABEL[entry.to])
    return {
      ok: false,
      error:
        allowed.length === 0
          ? `${REGISTER_STATUS_LABEL[from]} is final; it cannot move again.`
          : `Cannot move from ${REGISTER_STATUS_LABEL[from]} to that state. Allowed: ${allowed.join(", ")}.`,
    }
  }

  const text = typeof reason === "string" ? reason.trim() : ""
  if (transition.requiresReason && !text) {
    return {
      ok: false,
      error: `A reason is required to ${transition.label.toLowerCase()}.`,
    }
  }
  if (text.length > MAX_REASON) {
    return { ok: false, error: `The reason must be at most ${MAX_REASON} characters.` }
  }

  return { ok: true, status: transition.to, reason: text || null }
}

export type RegisterAccessRow = {
  ownerId: number | null
  custody: RegisterCustody
}

export type RegisterViewer = { id: number; admin: boolean }

/** Org/team rows are readable by every authenticated member; a member row only by its owner. */
export function canReadRegister(row: RegisterAccessRow, viewer: RegisterViewer): boolean {
  if (viewer.admin) return true
  if (row.custody === "member") return row.ownerId === viewer.id
  return true
}

/** The owner plus an admin. An unowned org/team row is admin-only to change. */
export function canWriteRegister(row: RegisterAccessRow, viewer: RegisterViewer): boolean {
  if (viewer.admin) return true
  return row.ownerId !== null && row.ownerId === viewer.id
}

export function canReassignRegister(viewer: RegisterViewer): boolean {
  return viewer.admin
}
