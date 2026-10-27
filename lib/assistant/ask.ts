// The pre-scoped questions that deep-link into the workspace assistant. They live here rather than
// in the two callers so the wording and the URL encoding are written once and can be tested without
// rendering either page.

/** Opens `/dashboard/assistant` with the question already asked. */
export function assistantLink(question: string): string {
  return `/dashboard/assistant?q=${encodeURIComponent(question)}`
}

/** "Ask about this period", from the report builder. */
export function periodQuestion(label: string, start: string, end: string): string {
  const span = start === end ? start : `${start} to ${end}`
  return `Summarise my work for ${label} (${span}): the hours I logged, what I delivered, and what is still open.`
}

/** "Ask about this day", from the work log day view. */
export function dayQuestion(day: string): string {
  return `What did I do on ${day}? List the hours I logged, the deliverables and the tasks that moved.`
}
