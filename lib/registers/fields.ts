// Register rows describe systems that hold credentials; the app is not a vault (design §12
// item 4). The reject list is a boundary check, not a UI hint: a credential-like key is
// refused at any depth, and the error names the field while never repeating its value.

export const CREDENTIAL_KEY =
  /(pass(word|wd)?|secret|token|otp|mfa|private_?key|api_?key|credential)/i

export const CREDENTIAL_PLACEHOLDER =
  "kept in: password-manager entry / vault path / safe, and who can authorise it"

export const CREDENTIAL_HINT =
  `Record where the credential is kept and who can authorise it, not the value itself — ${CREDENTIAL_PLACEHOLDER}.`

export type RegisterFields = Record<string, string>

export type FieldsRead =
  | { ok: true; fields: RegisterFields }
  | { ok: false; error: string }

const MAX_FIELDS = 40
const MAX_KEY = 60
const MAX_VALUE = 1000

const joinPath = (prefix: string, key: string): string => (prefix ? `${prefix}.${key}` : key)

/** The first credential-looking key at any depth, as a dotted path. */
function credentialPath(value: unknown, prefix = ""): string | null {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = credentialPath(value[index], prefix ? `${prefix}[${index}]` : `[${index}]`)
      if (found) return found
    }
    return null
  }
  if (!value || typeof value !== "object") return null
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    const here = joinPath(prefix, key)
    if (CREDENTIAL_KEY.test(key)) return here
    const found = credentialPath(nested, here)
    if (found) return found
  }
  return null
}

function textValue(value: unknown): string | null {
  if (typeof value === "string") return value.trim()
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  if (typeof value === "boolean") return String(value)
  return null
}

/**
 * A flat map of short text values. Nested objects are refused after the credential scan, so
 * `{ account: { password: "…" } }` gets the credential message rather than a shape message.
 */
export function readRegisterFields(value: unknown): FieldsRead {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "fields must be an object of text values." }
  }

  const offending = credentialPath(value)
  if (offending) {
    return {
      ok: false,
      error: `The field "${offending}" looks like a credential. ${CREDENTIAL_HINT}`,
    }
  }

  const entries = Object.entries(value as Record<string, unknown>)
  if (entries.length > MAX_FIELDS) {
    return { ok: false, error: `A register row holds at most ${MAX_FIELDS} fields.` }
  }

  const fields: RegisterFields = {}
  for (const [rawKey, rawValue] of entries) {
    const key = rawKey.trim()
    if (!key) return { ok: false, error: "Field names cannot be blank." }
    if (key.length > MAX_KEY) {
      return { ok: false, error: `The field name "${key.slice(0, MAX_KEY)}…" is too long.` }
    }
    const text = textValue(rawValue)
    if (text === null) {
      return { ok: false, error: `The field "${key}" must be text, a number or a yes/no value.` }
    }
    if (text.length > MAX_VALUE) {
      return { ok: false, error: `The field "${key}" is longer than ${MAX_VALUE} characters.` }
    }
    if (text.length > 0) fields[key] = text
  }

  return { ok: true, fields }
}

/** Used on prose fields (onboarding, playbooks) where a *value* is being asked for. */
export function asksForCredentialValue(text: string): boolean {
  return /\b(enter|paste|provide|send|share|type|supply)\b[^?]{0,60}\b(password|passwd|secret|token|api[ _-]?key|private[ _-]?key|credential)\b/i.test(
    text,
  )
}
