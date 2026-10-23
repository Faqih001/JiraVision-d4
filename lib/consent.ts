"use client"

// Cookie consent state lives in localStorage and is broadcast through a custom
// event so any component can subscribe via useSyncExternalStore. Analytics and
// marketing scripts must check consent before doing anything (lib/analytics.ts).

export interface ConsentState {
  necessary: true
  analytics: boolean
  marketing: boolean
  decidedAt: string
}

export const CONSENT_KEY = "jv-consent-v1"
export const CONSENT_EVENT = "jv-consent-change"
export const OPEN_CONSENT_EVENT = "jv-open-cookie-prefs"

export function subscribeConsent(callback: () => void): () => void {
  window.addEventListener(CONSENT_EVENT, callback)
  window.addEventListener("storage", callback)
  return () => {
    window.removeEventListener(CONSENT_EVENT, callback)
    window.removeEventListener("storage", callback)
  }
}

let cache: { raw: string | null; value: ConsentState | null } = { raw: null, value: null }

export function getConsentSnapshot(): ConsentState | null {
  const raw = typeof window === "undefined" ? null : window.localStorage.getItem(CONSENT_KEY)
  if (raw !== cache.raw) {
    let value: ConsentState | null = null
    try {
      value = raw ? (JSON.parse(raw) as ConsentState) : null
    } catch {
      value = null
    }
    cache = { raw, value }
  }
  return cache.value
}

export function getConsentServerSnapshot(): ConsentState | null {
  return null
}

export function setConsent(partial: { analytics: boolean; marketing: boolean }): void {
  const state: ConsentState = { necessary: true, ...partial, decidedAt: new Date().toISOString() }
  window.localStorage.setItem(CONSENT_KEY, JSON.stringify(state))
  window.dispatchEvent(new Event(CONSENT_EVENT))
}

export function hasDecided(): boolean {
  return getConsentSnapshot() !== null
}
