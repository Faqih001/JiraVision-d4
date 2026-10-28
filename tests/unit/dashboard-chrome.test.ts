import { describe, expect, it } from "vitest"
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import path from "node:path"
import { flagForLanguage, splitGoogleLabel } from "@/lib/language-flags"

const repo = path.resolve(__dirname, "..", "..")
const read = (relative: string) => readFileSync(path.join(repo, relative), "utf8")

const layout = read("components/dashboard-layout.tsx")
const bell = read("components/notifications-bell.tsx")
const translate = read("components/layout/google-translate.tsx")
const launcher = read("components/accessibility/accessibility-launcher.tsx")
const widget = read("components/accessibility/accessibility-widget.tsx")
const chatbot = read("components/landing-chatbot.tsx")

/** Route groups like (marketing) are URL-invisible, so they are dropped. */
function pageFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const absolute = path.join(dir, entry)
    if (statSync(absolute).isDirectory()) out.push(...pageFiles(absolute))
    else if (/^page\.(tsx|jsx)$/.test(entry)) out.push(absolute)
  }
  return out
}

const pages = pageFiles(path.join(repo, "app")).map((file) => {
  const segments = path
    .relative(path.join(repo, "app"), path.dirname(file))
    .split(path.sep)
    .filter((segment) => segment && !/^\(.*\)$/.test(segment))
  return segments.join("/")
})

function isLiveRoute(href: string) {
  if (!href.startsWith("/")) return false
  return pages.includes(href.slice(1))
}

/** The five account actions, lifted out of the shared menu body. */
function accountMenuBody() {
  const body = /function AccountMenuContent\(\)[\s\S]*?\n\}/.exec(layout)
  if (!body) throw new Error("components/dashboard-layout.tsx must declare AccountMenuContent")
  return body[0]
}

function hrefsIn(source: string) {
  return [...source.matchAll(/href="([^"]+)"/g)].map((match) => match[1])
}

describe("dashboard account menu", () => {
  it("offers five actions", () => {
    const items = [...accountMenuBody().matchAll(/<DropdownMenuItem\b/g)]
    expect(items).toHaveLength(5)
  })

  it("sends the first one to the public homepage", () => {
    const [first] = hrefsIn(accountMenuBody())
    expect(first).toBe("/")
    expect(/href="\/"[\s\S]{0,120}?Home/.test(accountMenuBody())).toBe(true)
  })

  it("links only to routes that exist", () => {
    for (const href of [...hrefsIn(accountMenuBody()), ...hrefsIn(bell)]) {
      expect(href, `${href} is not a rendered route`).toSatisfy(isLiveRoute)
    }
  })

  it("shows one theme icon: the mode the click goes to", () => {
    const row = /<DropdownMenuItem onClick=\{\(\) => setTheme[\s\S]*?<\/DropdownMenuItem>/.exec(accountMenuBody())
    expect(row, "the account menu has no theme action").not.toBeNull()
    // Both faces live in the source because they sit in opposite branches of one
    // ternary; the old paired row dimmed the inactive half, which is what must not
    // come back.
    expect(row![0]).not.toContain("text-muted-foreground/60")
    expect((row![0].match(/<(?:Sun|Moon)\b/g) ?? [])).toHaveLength(2)
    // One icon each, so no wrapper span to hold a pair.
    expect(row![0]).not.toMatch(/<span[^>]*>\s*<(?:Sun|Moon)/)
    expect(row![0]).toContain('{isDark ? "Switch to light mode" : "Switch to dark mode"}')
  })
})

describe("dashboard top bar", () => {
  it("carries the theme switch, the language dropdown, the bell and the avatar", () => {
    const cluster = /<div className="flex items-center gap-2 sm:gap-2 md:gap-3">[\s\S]*?<\/header>/.exec(layout)
    expect(cluster, "the right-hand top bar cluster is missing").not.toBeNull()
    for (const control of ["<ThemeSwitch", "<GoogleTranslateSelect", "<NotificationsBell", "<Avatar"]) {
      expect(cluster![0]).toContain(control)
    }
  })

  it("gives the top bar controls visible borders", () => {
    const cluster = /<div className="flex items-center gap-2 sm:gap-2 md:gap-3">[\s\S]*?<\/header>/.exec(layout)![0]
    const bordered = (cluster.match(/border border-border/g) ?? []).length
    expect(bordered).toBeGreaterThanOrEqual(2)
    expect(read("components/theme-switch.tsx")).toContain("border border-border")
    expect(bell).toContain("rounded-full border border-border")
  })

  it("mounts the language dropdown in one place at a time", () => {
    expect(hrefsIn(layout)).not.toContain("#")
    expect(layout).toContain("{!isMobile && <GoogleTranslateSelect />}")
    expect(layout).toContain("{isMobile && (")
  })
})

describe("language picker", () => {
  it("replaces Google's wordy select with a searchable flag list", () => {
    expect(translate).toContain("<CommandInput")
    expect(translate).toContain("Search languages")
    expect(translate).toContain("flagForLanguage(")
    // The header control owns the vocabulary, so Google's select is only the engine.
    expect(translate).toContain('className="jv-translate-engine"')
    expect(read("app/globals.css")).toMatch(/\.jv-translate-engine\s*\{[^}]*clip-path: inset\(50%\)/)
  })

  it("keeps Google's widget out of the accessibility tree, and the credit in it", () => {
    expect(translate).toMatch(/<span id=\{HEADER_ELEMENT_ID\}[^>]*aria-hidden="true"/)
    expect(translate).toContain("Translation by Google Translate")
  })

  it("holds its own labels back from the translator", () => {
    // The panel is portalled to the body, so the wrapper's notranslate cannot reach it.
    expect(translate).toMatch(/<PopoverContent[^>]*notranslate/)
  })

  it("never hands an empty value to a Radix select", () => {
    // Google's own "show original" option is the empty string, which crashes
    // SelectItem at render; the picker names it "original" instead.
    expect(translate).not.toContain("<SelectItem")
    expect(translate).toContain('value="original"')
  })

  it("flags a language from its region and stays quiet without one", () => {
    expect(flagForLanguage("de")).toBe("🇩🇪")
    expect(flagForLanguage("pt-BR")).toBe("🇧🇷")
    expect(flagForLanguage("eo")).toBeNull()
    expect(flagForLanguage(null)).toBeNull()
  })

  it("splits Google's label into the language and its native name", () => {
    expect(splitGoogleLabel("Spanish - Español")).toEqual({ english: "Spanish", native: "Español" })
    expect(splitGoogleLabel("English")).toEqual({ english: "English", native: null })
  })
})

describe("translator placement", () => {
  const publicFiles = ["components/layout/navbar.tsx", "components/auth/auth-shell.tsx"]
  const signedInFiles = [
    "components/dashboard-layout.tsx",
    "app/onboarding/onboarding-wizard.tsx",
    "app/admin/cms/page.tsx",
    "app/admin/career/page.tsx",
    "app/admin/packs/page.tsx",
  ]
  const mounts = (relative: string) => (read(relative).match(/<GoogleTranslateSelect\b/g) ?? []).length

  it("sits in the site header, and the footer no longer carries one", () => {
    expect(read("components/layout/navbar.tsx")).toContain("<GoogleTranslateSelect lazy />")
    expect(read("components/layout/footer.tsx")).not.toContain("GoogleTranslate")
  })

  it("is on every surface's own header, so one Google Translate covers the app", () => {
    for (const file of [...publicFiles, ...signedInFiles]) {
      expect(mounts(file), `${file} has no translator`).toBeGreaterThan(0)
    }
  })

  it("mounts one container per page, the id Google writes into having to stay unique", () => {
    // The workspace's two are opposite branches of one isMobile test: top bar, or drawer.
    for (const file of [...publicFiles, ...signedInFiles]) {
      if (file === "components/dashboard-layout.tsx") continue
      expect(mounts(file), `${file} mounts the translator twice`).toBe(1)
    }
    expect(mounts("components/dashboard-layout.tsx")).toBe(2)
  })

  it("asks a public page to wait for a click before Google is contacted", () => {
    for (const file of publicFiles) expect(read(file)).toContain("<GoogleTranslateSelect lazy />")
    for (const file of signedInFiles) expect(read(file)).toContain("<GoogleTranslateSelect />")
    expect(translate).toContain("const active = !lazy || requested || language !== null")
    expect(translate).toContain("if (next) setRequested(true)")
  })

  it("waits for Google's option list, not just its empty <select>", () => {
    // The element arrives before Google fills it, and a snapshot taken in between
    // leaves the picker showing only the Original row.
    expect(translate).toContain("combo.options.length > 1")
    expect(translate).toContain("if (options.length === 0) return")
  })
})

describe("theme switch", () => {
  it("shows both icons and animates the change", () => {
    const source = read("components/theme-switch.tsx")
    expect(source).toContain("<Sun")
    expect(source).toContain("<Moon")
    expect(source).toContain('data-jv-anim={animation ?? undefined}')
    const css = read("app/globals.css")
    expect(css).toContain("@keyframes jv-theme-to-dark")
    expect(css).toContain("@keyframes jv-theme-to-light")
    expect(css).toContain("@keyframes jv-theme-pop")
  })

  it("is the only theme control in the top bar, which stays clear of disableTransitionOnChange", () => {
    expect(read("app/layout.tsx")).toContain("disableTransitionOnChange")
    // A transition would be frozen for exactly the frames the knob moves, so the
    // motion must be declared as an animation.
    expect(read("components/theme-switch.tsx")).not.toContain("transition-transform")
  })
})

describe("accessibility entry point", () => {
  it("sits bottom-right of the workspace", () => {
    expect(launcher).toContain("right-4")
    expect(launcher).toContain("bottom-[calc(5.25rem+env(safe-area-inset-bottom))]")
    expect(layout).toContain("<AccessibilityLauncher")
  })

  it("uses the same bottom-right corner on the public site", () => {
    expect(widget).toContain("fixed right-4")
    expect(widget).not.toContain("fixed left-4")
    // Both launchers clear the assistant pill, which owns bottom-4 right-4 at h-12.
    expect(widget).toContain("bottom-[calc(5.25rem+env(safe-area-inset-bottom))]")
  })

  it("leaves the floating controls out of the footer", () => {
    const footer = read("components/layout/footer.tsx")
    expect(footer).not.toContain("Accessibility settings")
    expect(footer).not.toContain("OPEN_A11Y_EVENT")
    // One line from xl up: nothing in the compliance row wraps under another.
    expect(footer).toContain("xl:flex-row xl:items-center xl:justify-between")
  })

  it("asks the root panel to open instead of mounting a second one", () => {
    expect(launcher).toContain("OPEN_A11Y_EVENT")
    expect(widget).toContain("OPEN_A11Y_EVENT")
    expect(widget).toContain('pathname.startsWith("/dashboard")')
  })
})

describe("assistant trigger", () => {
  it("is labelled with text, not only an icon", () => {
    expect(chatbot).toContain(">Assistant</span>")
    expect(chatbot).toContain('aria-label="Open JiraVision assistant"')
  })
})

describe("notifications panel", () => {
  it("reads, filters and clears against the real endpoints", () => {
    expect(bell).toContain("/api/notifications?limit=20")
    expect(bell).toContain('method: "PATCH"')
    expect(bell).toContain('body: JSON.stringify({ all: true })')
    expect(bell).toContain('setOnlyUnread(true)')
  })

  it("does not hide the panel behind a menu that closes on every row", () => {
    // DropdownMenuItem unmounts the feed the moment a row is opened, which is why
    // the modernised panel is a Popover.
    expect(bell).toContain("<Popover")
    expect(bell).not.toContain("DropdownMenuItem")
  })

  it("links its footer to routes that exist", () => {
    expect(existsSync(path.join(repo, "app/dashboard/activity/page.tsx"))).toBe(true)
    expect(existsSync(path.join(repo, "app/dashboard/settings/page.tsx"))).toBe(true)
  })
})
