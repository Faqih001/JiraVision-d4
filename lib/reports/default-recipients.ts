// The default reporting line — the user ids a member's reports go to unless they
// pick differently at submit time. Stored at preferences.settings.defaultReportRecipients
// so the existing /api/settings merge path can write it without a dedicated endpoint.

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function asSettings(value: unknown): Record<string, unknown> {
  return asRecord(asRecord(value).settings)
}

export function readDefaultRecipients(preferences: unknown): number[] {
  const raw = asSettings(preferences).defaultReportRecipients
  if (!Array.isArray(raw)) return []
  for (const entry of raw) {
    if (typeof entry !== "number" || !Number.isInteger(entry) || entry < 1) return []
  }
  return raw as number[]
}

export function writeDefaultRecipients(
  preferences: unknown,
  ids: number[],
): Record<string, unknown> {
  const existing = asRecord(preferences)
  const settings = { ...asSettings(preferences), defaultReportRecipients: ids }
  return { ...existing, settings }
}
