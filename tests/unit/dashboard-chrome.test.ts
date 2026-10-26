import { describe, expect, it } from "vitest"
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import path from "node:path"

const repo = path.resolve(__dirname, "..", "..")
const read = (relative: string) => readFileSync(path.join(repo, relative), "utf8")

const layout = read("components/dashboard-layout.tsx")
const bell = read("components/notifications-bell.tsx")
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
