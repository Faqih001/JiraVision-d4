// Accessibility preference store. The state is deliberately flat: every key maps
// one-to-one onto a `data-jv-*` attribute on <html>, and app/accessibility.css owns
// the visual result. That keeps the panel, the pre-paint bootstrap script and the
// stylesheet describing the same thing, so a toggle cannot render "on" without the
// page actually changing.
//
// No "use client" here: app/layout.tsx is a server component and reads ATTRIBUTES +
// bootstrapScript() to inline the restore script, while every function that touches
// the DOM or localStorage is only ever called from the browser.

export const A11Y_KEY = "jv-accessibility-v1"
export const A11Y_EVENT = "jv-accessibility-change"
export const OPEN_A11Y_EVENT = "jv-open-accessibility"

export type Step = 0 | 1 | 2 | 3

export interface AccessibilityState {
  profile: string | null
  textSize: Step
  lineHeight: Step
  textSpacing: Step
  readableFont: boolean
  highlightHeadings: boolean
  highlightLinks: boolean
  highlightButtons: boolean
  hideImages: boolean
  tooltips: boolean
  stopAnimations: boolean
  readAloud: boolean
  darkContrast: boolean
  lightContrast: boolean
  highContrast: boolean
  invertColours: boolean
  rotateHues: boolean
  highSaturation: boolean
  lowSaturation: boolean
  monochrome: boolean
  readingGuide: boolean
  readingMask: boolean
  bigBlackCursor: boolean
  bigWhiteCursor: boolean
}

export const defaultState: AccessibilityState = {
  profile: null,
  textSize: 0,
  lineHeight: 0,
  textSpacing: 0,
  readableFont: false,
  highlightHeadings: false,
  highlightLinks: false,
  highlightButtons: false,
  hideImages: false,
  tooltips: false,
  stopAnimations: false,
  readAloud: false,
  darkContrast: false,
  lightContrast: false,
  highContrast: false,
  invertColours: false,
  rotateHues: false,
  highSaturation: false,
  lowSaturation: false,
  monochrome: false,
  readingGuide: false,
  readingMask: false,
  bigBlackCursor: false,
  bigWhiteCursor: false,
}

// Single source of truth for the html attribute names, shared by apply() below and
// by the pre-paint bootstrap script in components/accessibility/bootstrap.ts.
export const ATTRIBUTES: Record<keyof AccessibilityState, string> = {
  profile: "data-jv-profile",
  textSize: "data-jv-text-size",
  lineHeight: "data-jv-line-height",
  textSpacing: "data-jv-text-spacing",
  readableFont: "data-jv-readable-font",
  highlightHeadings: "data-jv-highlight-headings",
  highlightLinks: "data-jv-highlight-links",
  highlightButtons: "data-jv-highlight-buttons",
  hideImages: "data-jv-hide-images",
  tooltips: "data-jv-tooltips",
  stopAnimations: "data-jv-stop-animations",
  readAloud: "data-jv-read-aloud",
  darkContrast: "data-jv-dark-contrast",
  lightContrast: "data-jv-light-contrast",
  highContrast: "data-jv-high-contrast",
  invertColours: "data-jv-invert",
  rotateHues: "data-jv-rotate-hues",
  highSaturation: "data-jv-high-saturation",
  lowSaturation: "data-jv-low-saturation",
  monochrome: "data-jv-monochrome",
  readingGuide: "data-jv-reading-guide",
  readingMask: "data-jv-reading-mask",
  bigBlackCursor: "data-jv-big-black-cursor",
  bigWhiteCursor: "data-jv-big-white-cursor",
}

// Groups where one choice excludes the others. Contrast and colour adjustments each
// rewrite the same design tokens, so stacking them would make the stylesheet's source
// order decide — instead each family is a radio set that can be switched off again.
export const EXCLUSIVE_GROUPS: (keyof AccessibilityState)[][] = [
  ["darkContrast", "lightContrast", "highContrast", "invertColours", "rotateHues", "highSaturation", "lowSaturation", "monochrome"],
  ["bigBlackCursor", "bigWhiteCursor"],
  ["readingGuide", "readingMask"],
]

export interface Profile {
  id: string
  label: string
  hint: string
  settings: Partial<AccessibilityState>
}

export const profiles: Profile[] = [
  {
    id: "visual-impairment",
    label: "Visual impairment",
    hint: "Bigger text, stronger contrast",
    settings: { textSize: 2, lineHeight: 1, highContrast: true, highlightLinks: true, readableFont: true },
  },
  {
    id: "seizure",
    label: "Seizure & epileptic",
    hint: "Stops motion, mutes colour",
    settings: { stopAnimations: true, hideImages: true, lowSaturation: true },
  },
  {
    id: "cvd",
    label: "Colour vision deficiency",
    hint: "Shifts hues, underlines links",
    settings: { rotateHues: true, highlightLinks: true },
  },
  {
    id: "adhd",
    label: "ADHD",
    hint: "Reading mask, no motion",
    settings: { readingMask: true, stopAnimations: true, highlightHeadings: true },
  },
  {
    id: "learning",
    label: "Learning",
    hint: "Readable font, clear structure",
    settings: { readableFont: true, textSpacing: 1, lineHeight: 1, highlightHeadings: true, tooltips: true },
  },
]

export function normalise(raw: unknown): AccessibilityState {
  const next: AccessibilityState = { ...defaultState }
  if (!raw || typeof raw !== "object") return next
  const source = raw as Record<string, unknown>
  for (const key of Object.keys(defaultState) as (keyof AccessibilityState)[]) {
    const value = source[key]
    if (typeof defaultState[key] === "boolean") {
      if (value === true || value === false) next[key] = value as never
    } else if (typeof defaultState[key] === "number") {
      const step = Number(value)
      if (Number.isInteger(step) && step >= 0 && step <= 3) next[key] = step as never
    } else if (typeof value === "string") {
      next[key] = value as never
    }
  }
  return resolveGroups(next)
}

export function stateFromProfile(id: string | null): AccessibilityState {
  const base = { ...defaultState, profile: id }
  const profile = profiles.find((p) => p.id === id)
  return profile ? normalise({ ...base, ...profile.settings }) : base
}

export function resetState(): AccessibilityState {
  return stateFromProfile(null)
}

// Keeps an exclusive family honest: the first member that is on wins and the rest are
// cleared, so the stored state can never describe two palettes at once.
export function resolveGroups(state: AccessibilityState): AccessibilityState {
  const next = { ...state }
  for (const group of EXCLUSIVE_GROUPS) {
    const winner = group.find((key) => next[key] === true)
    for (const key of group) (next as Record<string, unknown>)[key] = key === winner
  }
  return next
}

export function writeState(state: AccessibilityState): void {
  const resolved = resolveGroups(state)
  window.localStorage.setItem(A11Y_KEY, JSON.stringify(resolved))
  applyState(resolved)
  window.dispatchEvent(new Event(A11Y_EVENT))
}

// Steps and flags become attributes; a step of 0 or a false flag removes it, so the
// stylesheet never sees a stale value.
export function applyState(state: AccessibilityState, root: HTMLElement = document.documentElement): void {
  for (const key of Object.keys(ATTRIBUTES) as (keyof AccessibilityState)[]) {
    const attribute = ATTRIBUTES[key]
    const value = state[key]
    if (value === false || value === 0 || value === null) root.removeAttribute(attribute)
    else root.setAttribute(attribute, String(value))
  }
}

export function subscribeAccessibility(callback: () => void): () => void {
  window.addEventListener(A11Y_EVENT, callback)
  window.addEventListener("storage", callback)
  return () => {
    window.removeEventListener(A11Y_EVENT, callback)
    window.removeEventListener("storage", callback)
  }
}

// useSyncExternalStore needs a stable reference: recompute only when the stored
// string actually changed, otherwise every render would look like a new snapshot.
let cache: { raw: string | null; value: AccessibilityState } = { raw: null, value: defaultState }

export function getAccessibilitySnapshot(): AccessibilityState {
  const raw = typeof window === "undefined" ? null : window.localStorage.getItem(A11Y_KEY)
  if (raw !== cache.raw) {
    let parsed: unknown = null
    try {
      parsed = raw ? JSON.parse(raw) : null
    } catch {
      parsed = null
    }
    cache = { raw, value: normalise(parsed) }
  }
  return cache.value
}

export function getAccessibilityServerSnapshot(): AccessibilityState {
  return defaultState
}

/** Toggle a switch, or set a text step, detaching from the preset that chose it. */
export function withToggle<K extends keyof AccessibilityState>(
  state: AccessibilityState,
  key: K,
  value?: AccessibilityState[K],
): AccessibilityState {
  const next = { ...state, profile: null, [key]: value ?? !state[key] } as AccessibilityState
  return resolveGroups(next)
}

/**
 * The inline script that re-applies stored choices to <html> before first paint.
 * Without it the page renders at the default size and contrast, then jumps.
 * Serialized from ATTRIBUTES so the script can never drift from the stylesheet.
 */
export function bootstrapScript(): string {
  const map = JSON.stringify(ATTRIBUTES)
  return `(function(){try{var raw=localStorage.getItem(${JSON.stringify(A11Y_KEY)});if(!raw)return;` +
    `var s=JSON.parse(raw);if(!s)return;var map=${map};var el=document.documentElement;` +
    `for(var k in map){var v=s[k];if(v===true)el.setAttribute(map[k],"");` +
    `else if(typeof v==="number"&&v>0)el.setAttribute(map[k],String(v));` +
    `else if(typeof v==="string"&&v)el.setAttribute(map[k],v)}}catch(e){}})();`
}
