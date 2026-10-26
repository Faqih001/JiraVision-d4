// Flags for the language picker. A flag emoji is not a character you can look up
// per language: it is the pair of regional-indicator symbols for a two-letter country
// code, so this module maps a language to the country it is chiefly written in and
// builds the emoji from those letters.
//
// Languages with no single country (Kurdish, Welsh, Esperanto, Yiddish, Latin, Quechua)
// are deliberately absent: flagForLanguage returns null and the caller falls back to a
// neutral globe rather than borrowing a flag that would misrepresent the language.

/** Language code (as Google spells it) to the country it is chiefly written in. */
const LANGUAGE_REGION: Record<string, string> = {
  af: "ZA",
  ak: "GH",
  am: "ET",
  ar: "SA",
  hy: "AM",
  az: "AZ",
  be: "BY",
  bn: "BD",
  bs: "BA",
  bg: "BG",
  ca: "AD",
  ceb: "PH",
  ny: "MW",
  co: "FR",
  hr: "HR",
  cs: "CZ",
  da: "DK",
  nl: "NL",
  en: "GB",
  et: "EE",
  tl: "PH",
  fi: "FI",
  fr: "FR",
  fy: "NL",
  gl: "ES",
  ka: "GE",
  de: "DE",
  el: "GR",
  gn: "PY",
  gu: "IN",
  ht: "HT",
  ha: "NG",
  haw: "US",
  he: "IL",
  hi: "IN",
  hmn: "LA",
  hu: "HU",
  is: "IS",
  ig: "NG",
  id: "ID",
  ga: "IE",
  it: "IT",
  ja: "JP",
  jw: "ID",
  kn: "IN",
  kk: "KZ",
  km: "KH",
  rw: "RW",
  ko: "KR",
  ky: "KG",
  lo: "LA",
  lv: "LV",
  lt: "LT",
  lb: "LU",
  mk: "MK",
  mg: "MG",
  ms: "MY",
  ml: "IN",
  mt: "MT",
  mi: "NZ",
  mr: "IN",
  mn: "MN",
  my: "MM",
  ne: "NP",
  no: "NO",
  or: "IN",
  ps: "AF",
  fa: "IR",
  pl: "PL",
  pt: "PT",
  pa: "IN",
  ro: "RO",
  ru: "RU",
  sm: "WS",
  gd: "GB",
  sr: "RS",
  st: "LS",
  sn: "ZW",
  sd: "PK",
  si: "LK",
  sk: "SK",
  sl: "SI",
  so: "SO",
  es: "ES",
  su: "ID",
  sw: "TZ",
  sv: "SE",
  tg: "TJ",
  ta: "IN",
  tt: "RU",
  te: "IN",
  th: "TH",
  tr: "TR",
  tk: "TM",
  uk: "UA",
  ur: "PK",
  ug: "CN",
  uz: "UZ",
  vi: "VN",
  xh: "ZA",
  yo: "NG",
  zu: "ZA",
  "zh-CN": "CN",
  "zh-TW": "TW",
}

const REGIONAL_OFFSET = 127397

function flagFromCountry(country: string): string {
  return String.fromCodePoint(
    ...[...country.toUpperCase()].map((letter) => REGIONAL_OFFSET + letter.charCodeAt(0)),
  )
}

/**
 * Flag for a language code, or null when no country owns it.
 * Accepts Google's shapes ("es", "zh-CN", "sr-Latn") and trusts an explicit
 * region subtag over the table when both are present.
 */
export function flagForLanguage(code: string | null | undefined): string | null {
  if (!code) return null
  const direct = LANGUAGE_REGION[code]
  if (direct) return flagFromCountry(direct)
  const region = /-([A-Za-z]{2})$/.exec(code)?.[1]
  return region ? flagFromCountry(region) : null
}

export interface LanguageLabel {
  /** Google's English name, e.g. "Spanish". */
  english: string
  /** The language's own name when Google offers one, e.g. "Español". */
  native: string | null
}

/**
 * Google writes each option as "Spanish - Español", and "Spanish - Español" only,
 * or a bare name for languages it has no endonym for. Split once so the picker can
 * show the endonym alone and keep the English name as quiet support text.
 */
export function splitGoogleLabel(label: string): LanguageLabel {
  const trimmed = label.trim()
  const dash = trimmed.indexOf(" - ")
  if (dash === -1) return { english: trimmed, native: null }
  return { english: trimmed.slice(0, dash).trim(), native: trimmed.slice(dash + 3).trim() || null }
}
