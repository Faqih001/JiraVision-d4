// Published pay bands for a career rung (design §11). A band is config about a rung,
// never about a person: the values live on career_levels and nowhere else. Seeded null,
// and an admin publishes a real range deliberately — no default currency, no inferred
// number, and half a range is not a range.

export type CareerBand = { min: number | null; max: number | null; currency: string | null }

export type BandRead = { ok: true; band: CareerBand } | { ok: false; error: string }

const absent = (value: unknown) => value === undefined || value === null || value === ""

export function readBand(input: {
  min?: unknown
  max?: unknown
  currency?: unknown
}): BandRead {
  const hasMin = !absent(input.min)
  const hasMax = !absent(input.max)
  const hasCurrency = !absent(input.currency)

  if (!hasMin && !hasMax) {
    if (hasCurrency) {
      return { ok: false, error: "Publish a range before naming a currency." }
    }
    return { ok: true, band: { min: null, max: null, currency: null } }
  }

  if (!hasMin || !hasMax) {
    return {
      ok: false,
      error: "Publish both a minimum and a maximum, or neither.",
    }
  }

  if (
    typeof input.min !== "number" ||
    typeof input.max !== "number" ||
    !Number.isFinite(input.min) ||
    !Number.isFinite(input.max) ||
    !Number.isInteger(input.min) ||
    !Number.isInteger(input.max) ||
    input.min < 0 ||
    input.max < 0
  ) {
    return { ok: false, error: "Band values must be whole, non-negative numbers." }
  }

  if (input.min > input.max) {
    return { ok: false, error: "The band minimum cannot be above its maximum." }
  }

  if (typeof input.currency !== "string" || !/^[A-Za-z]{3}$/.test(input.currency.trim())) {
    return {
      ok: false,
      error: "A published band needs a three-letter currency code, for example USD.",
    }
  }

  return {
    ok: true,
    band: {
      min: input.min,
      max: input.max,
      currency: input.currency.trim().toUpperCase(),
    },
  }
}

/** Null until both ends and the currency are real; the UI says "Band not published". */
export function formatBand(band: CareerBand): string | null {
  if (band.min === null || band.max === null || !band.currency) return null
  return `${band.min.toLocaleString("en-US")}–${band.max.toLocaleString("en-US")} ${band.currency}`
}
