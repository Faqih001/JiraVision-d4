"use client"

// i18n scaffold (v2 brief §2): English is the shipping language; the locale
// store, dictionary lookup and selector wire the chrome so Swahili and French
// can be completed without restructuring. Locale choice persists locally;
// routes stay unprefixed until a full translation pass decides otherwise.

export const locales = [
  { code: "en", label: "English" },
  { code: "sw", label: "Kiswahili" },
  { code: "fr", label: "Français" },
] as const

export type LocaleCode = (typeof locales)[number]["code"]

export const defaultLocale: LocaleCode = "en"

export const LOCALE_KEY = "jv-locale"
export const LOCALE_EVENT = "jv-locale-change"

export function subscribeLocale(callback: () => void): () => void {
  window.addEventListener(LOCALE_EVENT, callback)
  window.addEventListener("storage", callback)
  return () => {
    window.removeEventListener(LOCALE_EVENT, callback)
    window.removeEventListener("storage", callback)
  }
}

export function getLocaleSnapshot(): LocaleCode {
  if (typeof window === "undefined") return defaultLocale
  const raw = window.localStorage.getItem(LOCALE_KEY)
  return locales.some((l) => l.code === raw) ? (raw as LocaleCode) : defaultLocale
}

export function getLocaleServerSnapshot(): LocaleCode {
  return defaultLocale
}

export function setLocale(code: LocaleCode): void {
  window.localStorage.setItem(LOCALE_KEY, code)
  window.dispatchEvent(new Event(LOCALE_EVENT))
}
