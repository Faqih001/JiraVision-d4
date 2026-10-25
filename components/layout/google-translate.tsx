"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import { Globe } from "lucide-react"
import { cn } from "@/lib/utils"

// Google's own translate element, so the list of languages is whatever Google
// supports today rather than a snapshot we would have to maintain. Nothing is
// requested from Google until the visitor opens the control, and the choice is
// remembered in localStorage so it survives navigation and reloads.

const STORE_KEY = "jv-translate-lang"
const STORE_EVENT = "jv-translate-lang-change"
const SCRIPT_SRC = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"

type TranslateElement = new (options: Record<string, unknown>, elementId: string) => void

declare global {
  interface Window {
    googleTranslateElementInit?: () => void
  }
}

// Scoped to this file: components/google-map.tsx already augments Window with the
// Maps namespace, and two declarations of the same property must agree on its type.
const translateNamespace = () =>
  (window as unknown as { google?: { translate?: { TranslateElement?: TranslateElement } } }).google?.translate

// One script tag per document, however many times the component mounts.
let scriptRequested = false

function loadWidget() {
  if (scriptRequested || typeof document === "undefined") return
  scriptRequested = true
  window.googleTranslateElementInit = () => {
    const translate = translateNamespace()
    if (!translate?.TranslateElement) return
    new translate.TranslateElement({ pageLanguage: "en", autoDisplay: false }, "google-translate-element")
  }
  const script = document.createElement("script")
  script.src = SCRIPT_SRC
  script.async = true
  document.head.appendChild(script)
}

/** Google builds its <select> asynchronously; poll until it exists. */
function waitForCombo(timeoutMs = 8000): Promise<HTMLSelectElement | null> {
  return new Promise((resolve) => {
    const started = Date.now()
    const tick = () => {
      const combo = document.querySelector<HTMLSelectElement>("#google-translate-element select.goog-te-combo")
      if (combo) return resolve(combo)
      if (Date.now() - started > timeoutMs) return resolve(null)
      window.setTimeout(tick, 120)
    }
    tick()
  })
}

function remember(code: string | null) {
  if (code) window.localStorage.setItem(STORE_KEY, code)
  else window.localStorage.removeItem(STORE_KEY)
  window.dispatchEvent(new Event(STORE_EVENT))
}

function subscribe(callback: () => void) {
  window.addEventListener(STORE_EVENT, callback)
  window.addEventListener("storage", callback)
  return () => {
    window.removeEventListener(STORE_EVENT, callback)
    window.removeEventListener("storage", callback)
  }
}

const getSnapshot = () => window.localStorage.getItem(STORE_KEY)
// Nothing is known server-side, so the first paint always shows the plain control.
const getServerSnapshot = () => null

// Google writes a `googtrans` cookie for itself, so a reset has to clear that too
// and reload — switching its select back to the empty entry does nothing.
function resetTranslation() {
  remember(null)
  document.cookie = "googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
  window.location.reload()
}

export function GoogleTranslate({ className }: { className?: string }) {
  const [revealed, setRevealed] = useState(false)
  const language = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  // A saved choice re-opens the control on the next visit, so the page comes back in
  // the same language instead of silently reverting to English.
  const open = revealed || language !== null

  useEffect(() => {
    if (!open) return
    loadWidget()
    let cancelled = false
    void waitForCombo().then((combo) => {
      if (cancelled || !combo || combo.dataset.jvWired === "1") return
      combo.dataset.jvWired = "1"
      combo.addEventListener("change", () => remember(combo.value || null))
      const saved = getSnapshot()
      if (saved && combo.value !== saved) {
        combo.value = saved
        combo.dispatchEvent(new Event("change"))
      }
    })
    return () => {
      cancelled = true
    }
  }, [open])

  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1", className)}>
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Globe className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{language ? "Translated" : "Translate"}</span>
      </span>

      {open ? (
        <span className="flex items-center gap-2">
          {/* Google inserts its own gadget span inside this container. */}
          <span id="google-translate-element" className="jv-translate-gadget inline-flex" />
          {language && (
            <button
              type="button"
              onClick={resetTranslation}
              className="text-xs underline-offset-2 transition-colors duration-150 hover:text-foreground hover:underline"
            >
              Show original
            </button>
          )}
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="text-xs underline-offset-2 transition-colors duration-150 hover:text-foreground hover:underline"
        >
          Choose a language
        </button>
      )}
    </div>
  )
}
