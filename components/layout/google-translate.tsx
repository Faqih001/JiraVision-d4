"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import { Globe, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"

// Google's own translate element, so the list of languages is whatever Google supports
// today rather than a snapshot we would have to maintain. The choice is remembered in
// localStorage so it survives navigation and reloads.
//
// Two controls share one script tag. The footer variant waits for a click before asking
// Google for anything; the workspace variant (components/dashboard-layout.tsx) shows the
// language dropdown straight away, because a signed-in visitor has already accepted the
// translation cookie.

const STORE_KEY = "jv-translate-lang"
const STORE_EVENT = "jv-translate-lang-change"
const SCRIPT_SRC = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
const FOOTER_ELEMENT_ID = "google-translate-element"
const HEADER_ELEMENT_ID = "google-translate-header"

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

// Google's init callback fires once per document, so containers register and the single
// callback instantiates all of them. A container id must be unique in the document, which
// is why the workspace renders exactly one variant at a time.
const requestedIds = new Set<string>()
let scriptRequested = false

function instantiate(id: string) {
  const container = document.getElementById(id)
  const translate = translateNamespace()
  if (!container || !translate?.TranslateElement || container.dataset.jvBooted === "1") return
  container.dataset.jvBooted = "1"
  new translate.TranslateElement({ pageLanguage: "en", autoDisplay: false }, id)
}

function loadWidget(id: string) {
  if (typeof document === "undefined") return
  requestedIds.add(id)
  if (scriptRequested) {
    instantiate(id)
    return
  }
  scriptRequested = true
  window.googleTranslateElementInit = () => {
    for (const pendingId of Array.from(requestedIds)) instantiate(pendingId)
  }
  const script = document.createElement("script")
  script.src = SCRIPT_SRC
  script.async = true
  document.head.appendChild(script)
}

/** Google builds its <select> asynchronously; poll until it exists. */
function waitForCombo(id: string, timeoutMs = 8000): Promise<HTMLSelectElement | null> {
  return new Promise((resolve) => {
    const started = Date.now()
    const tick = () => {
      const combo = document.querySelector<HTMLSelectElement>(`#${id} select.goog-te-combo`)
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

/**
 * Mount Google's gadget into `id`, then keep its <select> in step with the stored choice.
 * Returns whether the dropdown is on screen yet, so the caller can hold a placeholder
 * instead of an empty box while the script is in flight.
 */
function useTranslateWidget(id: string, active: boolean) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!active) return
    loadWidget(id)
    let cancelled = false
    void waitForCombo(id).then((combo) => {
      if (cancelled || !combo) return
      // Google gives its select no name at all.
      if (!combo.getAttribute("aria-label")) {
        combo.setAttribute("aria-label", "Translate this page")
      }
      if (combo.dataset.jvWired !== "1") {
        combo.dataset.jvWired = "1"
        combo.addEventListener("change", () => remember(combo.value || null))
        const saved = getSnapshot()
        if (saved && combo.value !== saved) {
          combo.value = saved
          combo.dispatchEvent(new Event("change"))
        }
      }
      setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [id, active])

  return ready
}

/** Footer compliance row: nothing is requested from Google until it is opened. */
export function GoogleTranslate({ className }: { className?: string }) {
  const [revealed, setRevealed] = useState(false)
  const language = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  // A saved choice re-opens the control on the next visit, so the page comes back in
  // the same language instead of silently reverting to English.
  const open = revealed || language !== null
  const ready = useTranslateWidget(FOOTER_ELEMENT_ID, open)

  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1", className)}>
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Globe className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{language ? "Translated" : "Translate"}</span>
      </span>

      {open ? (
        <span className="flex items-center gap-2">
          {/* Google inserts its own gadget span inside this container. */}
          <span id={FOOTER_ELEMENT_ID} className="jv-translate-gadget inline-flex" />
          {!ready && <span className="text-xs text-muted-foreground">Loading languages…</span>}
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

/** Workspace top bar: the language dropdown itself, in a bordered control. */
export function GoogleTranslateSelect({ className }: { className?: string }) {
  const language = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const ready = useTranslateWidget(HEADER_ELEMENT_ID, true)

  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <span
        className={cn(
          "jv-translate-gadget jv-translate-pill flex h-9 min-w-0 items-center gap-1.5 rounded-full",
          "border border-border bg-card pl-2.5 pr-3",
        )}
      >
        <Globe className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        {/* Google replaces the contents of this container with its language <select>. */}
        <span id={HEADER_ELEMENT_ID} className="min-w-0" />
        {!ready && <span className="text-xs text-muted-foreground">Languages…</span>}
        {/* The pill hides Google's logo sprite, so the credit is announced instead. */}
        <span className="sr-only">Translation by Google Translate</span>
      </span>

      {language && (
        <button
          type="button"
          onClick={resetTranslation}
          className={cn(
            "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3",
            "text-xs font-medium text-muted-foreground transition-colors duration-150",
            "hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          )}
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden lg:inline">Show original</span>
          <span className="lg:hidden">Original</span>
        </button>
      )}
    </div>
  )
}
