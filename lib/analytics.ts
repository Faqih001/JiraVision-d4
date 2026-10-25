"use client"

// Privacy-friendly event hooks. Nothing is sent — and no provider script is
// loaded — until the visitor has granted analytics consent (lib/consent.ts).
// Adapters: Plausible (script tag + window.plausible). A PostHog adapter can
// implement the same `track` surface later.

import { getConsentSnapshot } from "@/lib/consent"

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Record<string, unknown> }) => void
  }
}

// The name must match .env.example (NEXT_PUBLIC_PLAUSIBLE_DOMAIN). The previous
// "PLAUSUAL" spelling meant a configured domain never reached this check, so the
// script silently never loaded.
const PLAUSIBLE_DOMAIN = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN

let scriptInjected = false

export function syncAnalyticsScript(): void {
  if (scriptInjected || typeof document === "undefined") return
  if (!PLAUSIBLE_DOMAIN) return
  if (!getConsentSnapshot()?.analytics) return
  const script = document.createElement("script")
  script.defer = true
  script.dataset.domain = PLAUSIBLE_DOMAIN
  script.src = "https://plausible.io/js/script.js"
  document.head.appendChild(script)
  scriptInjected = true
}

export function track(event: string, props?: Record<string, unknown>): void {
  if (typeof window === "undefined") return
  if (!getConsentSnapshot()?.analytics) return
  if (typeof window.plausible === "function") {
    window.plausible(event, { props })
  } else {
    console.debug("[analytics:dev] event recorded (no provider configured)", event, props)
  }
}
