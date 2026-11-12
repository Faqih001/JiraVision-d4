// Extracted from components/dashboard-kit.tsx so a pure module can age a timestamp without importing
// a client component file. The 96 call sites keep importing it from dashboard-kit, which re-exports.

export function relativeTime(iso: string, now: number = Date.now()) {
  const diff = now - new Date(iso).getTime()
  const mins = Math.round(diff / 60_000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.round(hrs / 24)}d ago`
}