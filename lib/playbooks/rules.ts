// Lifecycle and visibility rules for playbooks (design §12 item 5, §14). Pure, so the
// publish gate is testable without a database and the routes and the editor read one answer.

export const PLAYBOOK_STATUSES = ["draft", "published", "archived"] as const
export type PlaybookStatus = (typeof PLAYBOOK_STATUSES)[number]

export const PLAYBOOK_STATUS_LABEL: Record<PlaybookStatus, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
}

export function isPlaybookStatus(value: unknown): value is PlaybookStatus {
  return typeof value === "string" && (PLAYBOOK_STATUSES as readonly string[]).includes(value)
}

export type PlaybookViewer = { id: number; admin: boolean }

/** A published SOP is company knowledge; a draft or archived one stays with its author. */
export function canReadPlaybook(
  playbook: { status: string; authorId: number | null },
  viewer: PlaybookViewer,
): boolean {
  if (viewer.admin) return true
  if (playbook.status === "published") return true
  return playbook.authorId === viewer.id
}

export function canEditPlaybook(
  playbook: { authorId: number | null },
  viewer: PlaybookViewer,
): boolean {
  return viewer.admin || playbook.authorId === viewer.id
}

export type PublishablePlaybook = {
  status: string
  source: string
  aiMarked: boolean
  steps: readonly { action: string }[]
}

/**
 * A safety procedure is the last place a plausible-sounding invention belongs: a model
 * draft cannot be published until a human edit has cleared `ai_marked`.
 */
export function publishProblem(playbook: PublishablePlaybook): string | null {
  if (playbook.status === "published") return "That playbook is already published."
  if (playbook.status === "archived") return "Restore the playbook to draft before publishing it."
  if (playbook.source === "gemini" && playbook.aiMarked) {
    return "A model-drafted playbook needs a human edit before it can be published."
  }
  if (playbook.steps.length === 0) return "Add at least one step before publishing."
  if (playbook.steps.some((step) => !step.action.trim())) {
    return "Every step needs an action before publishing."
  }
  return null
}

export const canPublish = (playbook: PublishablePlaybook): boolean => publishProblem(playbook) === null
