"use client"

import type { FieldPath, FieldValues, UseFormSetError } from "react-hook-form"

export interface SubmitOutcome {
  ok: boolean
  error?: string
  fields?: Record<string, string>
}

// POSTs form values to a formRoute handler (lib/forms/handler.ts) and maps
// per-field server errors onto react-hook-form so users see them inline.
export async function postForm(endpoint: string, values: FieldValues): Promise<SubmitOutcome> {
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    })
    const data = (await res.json().catch(() => null)) as SubmitOutcome | null
    if (!data) return { ok: false, error: "Something went wrong. Please try again." }
    return data
  } catch {
    return { ok: false, error: "Network error — please try again." }
  }
}

export function applyFieldErrors<T extends FieldValues>(
  setError: UseFormSetError<T>,
  fields?: Record<string, string>,
  fallback?: string,
) {
  const entries = Object.entries(fields ?? {})
  if (entries.length === 0 && fallback) {
    setError("root", { type: "server", message: fallback })
    return
  }
  for (const [name, message] of entries) {
    setError(name as FieldPath<T>, { type: "server", message })
  }
}
