// The sanitiser for PATCH /api/settings, kept out of the route so the rule is unit-tested
// without a database. Onboarding is the one namespaced value the route validates further
// (against the stored state); everything else stays primitive-or-array so a settings save
// can never overwrite a namespace it does not own.

export type SettingsPatch = Record<string, unknown>

export function readSettingsPatch(body: unknown): { patch: SettingsPatch | null; error?: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { patch: null, error: "Body must be a JSON object of settings keys" }
  }
  const source = body as Record<string, unknown>
  const incoming = source.settings && typeof source.settings === "object" && !Array.isArray(source.settings)
    ? (source.settings as Record<string, unknown>)
    : source
  const candidate = Object.keys(incoming).length > 0 ? incoming : source
  const patch: SettingsPatch = {}
  for (const [key, value] of Object.entries(candidate)) {
    if (key === "settings") continue
    if (key.startsWith("__")) continue
    if (typeof key !== "string" || key.length === 0 || key.length > 64) continue
    if (key === "onboarding") {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        return { patch: null, error: "onboarding must be an object" }
      }
      patch.onboarding = value
      continue
    }
    if (typeof value === "function") continue
    if (value && typeof value === "object" && !Array.isArray(value)) continue
    patch[key] = value
  }
  return { patch }
}