"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import { Check, ChevronDown, Globe, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import { flagForLanguage, splitGoogleLabel } from "@/lib/language-flags"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"

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
 * Reports whether the dropdown is on screen yet, and the language list Google itself
 * offers, so the caller can hold a placeholder instead of an empty box while the script
 * is in flight and never has to maintain its own snapshot of supported languages.
 */
interface TranslateEngine {
  ready: boolean
  options: { code: string; english: string; native: string | null }[]
}

/**
 * `driveFromList` marks callers that render their own language control: Google's select
 * then acts as the engine only, so it leaves the tab order and would be hidden from
 * screen readers to avoid being announced twice. Callers that show Google's select keep
 * it reachable and give it the name Google never sets.
 */
function useTranslateWidget(id: string, active: boolean, driveFromList = false): TranslateEngine {
  const [engine, setEngine] = useState<TranslateEngine>({ ready: false, options: [] })

  useEffect(() => {
    if (!active) return
    loadWidget(id)
    let cancelled = false
    void waitForCombo(id).then((combo) => {
      if (cancelled || !combo) return
      if (driveFromList) {
        combo.tabIndex = -1
      } else if (!combo.getAttribute("aria-label")) {
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
      // The blank entry means "show original" and is offered as its own row instead.
      const options = Array.from(combo.options)
        .filter((option) => option.value !== "")
        .map((option) => ({ code: option.value, ...splitGoogleLabel(option.textContent ?? "") }))
      setEngine({ ready: true, options })
    })
    return () => {
      cancelled = true
    }
  }, [id, active, driveFromList])

  return engine
}

/** Drive Google's own select, which is what performs the translation. */
function selectLanguage(id: string, code: string) {
  const combo = document.querySelector<HTMLSelectElement>(`#${id} select.goog-te-combo`)
  if (!combo) return
  combo.value = code
  combo.dispatchEvent(new Event("change"))
}

/** Footer compliance row: nothing is requested from Google until it is opened. */
export function GoogleTranslate({ className }: { className?: string }) {
  const [revealed, setRevealed] = useState(false)
  const language = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  // A saved choice re-opens the control on the next visit, so the page comes back in
  // the same language instead of silently reverting to English.
  const open = revealed || language !== null
  const { ready } = useTranslateWidget(FOOTER_ELEMENT_ID, open)

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

/**
 * Workspace top bar: a compact language picker with a flag per language and a search
 * field, instead of Google's own dropdown, whose options spell out "Spanish - Español"
 * and never shrink to fit a crowded header. Choosing a row drives Google's select, so
 * the translation itself is still Google's and the list is still whatever Google offers
 * today rather than a list we would have to keep current.
 */
export function GoogleTranslateSelect({ className }: { className?: string }) {
  const language = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const { ready, options } = useTranslateWidget(HEADER_ELEMENT_ID, true, true)
  const [open, setOpen] = useState(false)

  const current = options.find((option) => option.code === language) ?? null
  const flag = flagForLanguage(language)
  const triggerLabel = language ? (current?.native ?? current?.english ?? language) : "Translate"

  const choose = (code: string) => {
    setOpen(false)
    selectLanguage(HEADER_ELEMENT_ID, code)
  }

  return (
    <div className={cn("flex min-w-0 items-center", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={language ? `Translate this page (currently ${triggerLabel})` : "Translate this page"}
            className={cn(
              "flex h-9 min-w-0 items-center gap-1.5 rounded-full border border-border bg-card pl-2.5 pr-2.5",
              "text-xs font-medium transition-colors duration-150 hover:bg-muted",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            )}
          >
            {flag ? (
              <span className="text-sm leading-none" aria-hidden="true">
                {flag}
              </span>
            ) : (
              <Globe className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            )}
            <span className="max-w-[7rem] truncate">{triggerLabel}</span>
            <ChevronDown
              className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-150", open && "rotate-180")}
              aria-hidden="true"
            />
          </button>
        </PopoverTrigger>

        <PopoverContent align="end" className="w-[19rem] gap-0 overflow-hidden p-0">
          <Command>
            <CommandInput placeholder="Search languages" className="text-sm" />
            <CommandList className="max-h-[16.5rem]">
              <CommandEmpty>No language matches that search.</CommandEmpty>
              <CommandGroup heading={ready ? `${options.length} languages` : "Loading languages…"}>
                <CommandItem
                  value="original"
                  keywords={["original", "english", "show original"]}
                  onSelect={resetTranslation}
                  className="gap-2"
                >
                  <RotateCcw className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span>Original (English)</span>
                  {!language && <Check className="ml-auto h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                </CommandItem>

                {options.map(({ code, english, native }) => (
                  <CommandItem
                    key={code}
                    value={code}
                    keywords={[english, native, code].filter((part): part is string => Boolean(part))}
                    onSelect={() => choose(code)}
                    className="gap-2"
                  >
                    <span className="w-5 shrink-0 text-center text-sm leading-none" aria-hidden="true">
                      {flagForLanguage(code) ?? ""}
                    </span>
                    <span className="truncate">{native ?? english}</span>
                    {native && native.toLowerCase() !== english.toLowerCase() && (
                      <span className="truncate text-xs text-muted-foreground">{english}</span>
                    )}
                    {language === code && <Check className="ml-auto h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
          {/* The pill shows no Google logo, so the credit is stated where it is read. */}
          <span className="sr-only">Translation by Google Translate</span>
        </PopoverContent>
      </Popover>

      {/*
        Google replaces this container's contents with its <select>, which is what
        actually translates. It is clipped, not display:none, because the widget reads
        and writes it, and it is hidden from assistive tech because the list above is
        the real control.
      */}
      <span id={HEADER_ELEMENT_ID} className="jv-translate-engine" aria-hidden="true" />
    </div>
  )
}
