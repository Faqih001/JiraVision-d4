// The chat and email tables store TIMESTAMP without time zone, and the neon http driver hands
// them back as naive wall-time strings. The house convention (app/api/chat/route.ts toUtcDate)
// reads that wall-time as UTC; a report resolves it the same way so a message dated 09:00 does
// not drift onto the previous day in a member east of Greenwich. An explicit offset is honoured.

export function naiveUtcIso(value: string | Date): string {
  if (value instanceof Date) return value.toISOString()
  const s = value.includes("T") ? value : value.replace(" ", "T")
  const utc = s.endsWith("Z") || /[+-]\d{2}:?\d{2}$/u.test(s) ? s : `${s}Z`
  return new Date(utc).toISOString()
}