// Seniority bands used by the load-equity metric (design §11). A real career
// placement is the first choice; the job-title heuristic stays as the fallback for
// members an admin has not placed yet. Pure, so the mapping is testable without rows.

export type SeniorityTier = 1 | 2 | 3

/** L1→1, L2→2, L3/L4→3; anything else is not a placement. */
export function tierFromCareerLevel(level: number | null | undefined): SeniorityTier | null {
  if (level === 1) return 1
  if (level === 2) return 2
  if (level === 3 || level === 4) return 3
  return null
}

export function seniorityTierOf(
  jobTitle: string | null,
  role: string | null,
  careerLevel?: number | null,
): SeniorityTier {
  const placed = tierFromCareerLevel(careerLevel)
  if (placed !== null) return placed

  const text = `${jobTitle ?? ""} ${role ?? ""}`.toLowerCase()
  if (/(principal|staff|architect|director|head of|vp|lead|manager|scrum master|chief)/.test(text)) {
    return 3
  }
  if (/(intern|junior|graduate|assistant|apprentice|trainee)/.test(text)) return 1
  return 2
}

export function senioritySource(careerLevel: number | null | undefined): "placement" | "job_title" {
  return tierFromCareerLevel(careerLevel) !== null ? "placement" : "job_title"
}
