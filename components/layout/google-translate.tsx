"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import { Check, ChevronDown, Globe, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import { flagForLanguage, splitGoogleLabel } from "@/lib/language-flags"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"

// Google's own translate element, so the list of languages is whatever Google supports
// today rather than a snapshot we would have to maintain. The choice is remembered in
// localStorage so it survives navigation and reloads, and it lives on the domain, not on
// one page: a language picked on a public page is still in force in the workspace.
//
// One control, mounted once per page by each surface's own header. A signed-in visitor has
// already accepted Google's cookie, so workspace, setup and admin pages ask Google for the
// script as the page opens. Public pages pass `lazy` and wait for a click first.

const STORE_KEY = "jv-translate-lang"
const STORE_EVENT = "jv-translate-lang-change"
const SCRIPT_SRC = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
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
// is why every surface mounts exactly one picker: the workspace's two slots (top bar and
// mobile drawer) are branches of one isMobile test, and the other headers have only the one.
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

/**
 * Google builds its <select> in two passes: the empty element appears first and the
 * options are appended after. Polling only for the element would snapshot it mid-build
 * and leave the picker with a heading of "0 languages" and just the Original row, so a
 * combo only counts as ready once it holds more than the blank "show original" entry.
 */
function waitForCombo(id: string, timeoutMs = 15000): Promise<HTMLSelectElement | null> {
  return new Promise((resolve) => {
    const started = Date.now()
    const tick = () => {
      const combo = document.querySelector<HTMLSelectElement>(`#${id} select.goog-te-combo`)
      if (combo && combo.options.length > 1) return resolve(combo)
      if (Date.now() - started > timeoutMs) return resolve(combo ?? null)
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
      if (options.length === 0) return
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

/**
 * The app's one language picker, in a surface's header: a compact control with a flag per
 * language and a search field, instead of Google's own dropdown, whose options spell out
 * "Spanish - Español" and never shrink to fit a crowded header. Choosing a row drives
 * Google's select, so the translation itself is still Google's and the list is still
 * whatever Google offers today rather than a list we would have to keep current.
 *
 * `lazy` is for public pages: Google's script is requested only once the visitor opens the
 * picker, or once a stored choice proves they opted in on an earlier visit.
 */
export function GoogleTranslateSelect({ className, lazy = false }: { className?: string; lazy?: boolean }) {
  const language = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const [open, setOpen] = useState(false)
  const [requested, setRequested] = useState(false)
  const active = !lazy || requested || language !== null
  const { ready, options } = useTranslateWidget(HEADER_ELEMENT_ID, active, true)

  const current = options.find((option) => option.code === language) ?? null
  const flag = flagForLanguage(language)
  const triggerLabel = language ? (current?.native ?? current?.english ?? language) : "Translate"

  const choose = (code: string) => {
    setOpen(false)
    selectLanguage(HEADER_ELEMENT_ID, code)
  }

  const changeOpen = (next: boolean) => {
    setOpen(next)
    if (next) setRequested(true)
  }

  return (
    <div className={cn("notranslate flex min-w-0 items-center", className)} translate="no">
      <Popover open={open} onOpenChange={changeOpen}>
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

        {/*
          The panel is portalled to the body, so it escapes the wrapper above; without
          its own notranslate, Google rewrites "Deutsch" and "Search languages" into the
          page language and the list stops naming languages the way their speakers do.
        */}
        <PopoverContent align="end" translate="no" className="notranslate w-[19rem] gap-0 overflow-hidden p-0">
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
