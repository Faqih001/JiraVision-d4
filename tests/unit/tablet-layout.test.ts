import { describe, expect, it } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import path from "node:path"

const repo = path.resolve(__dirname, "..", "..")
const read = (relative: string) => readFileSync(path.join(repo, relative), "utf8")

const navbar = read("components/layout/navbar.tsx")
const bottomBar = read("components/layout/bottom-bar.tsx")
const marketingLayout = read("app/(marketing)/layout.tsx")
const layout = read("components/dashboard-layout.tsx")

function filesUnder(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const absolute = path.join(dir, entry)
    if (statSync(absolute).isDirectory()) filesUnder(absolute, out)
    else if (/\.(tsx|jsx)$/.test(entry)) out.push(absolute)
  }
  return out
}

const sources = [...filesUnder(path.join(repo, "app")), ...filesUnder(path.join(repo, "components"))]
const relativeOf = (file: string) => path.relative(repo, file)

/**
 * Tablet is its own zone here: 768-1279. It is wide enough for a page to breathe but it is
 * a touch surface, and the hover mega-menu plus five desktop controls do not fit the row.
 * These guards keep the two decisions that follow from that from quietly drifting back.
 */
describe("tablet zone (768-1279)", () => {
  it("renders no marketing header bar at all below xl", () => {
    // Not a CSS hide: the bar carries the language picker, and Google writes into one
    // container id per document, so the drawer's copy has to be the only one mounted.
    expect(navbar).toContain('const DESKTOP_NAV_QUERY = "(min-width: 1280px)"')
    expect(navbar).toContain("const desktopNav = useDesktopNav()")
    expect(navbar).toContain("useSyncExternalStore(subscribeDesktopNav, readDesktopNav, readDesktopNavOnServer)")
    expect(navbar).toContain("{desktopNav && (")
  })

  it("leaves no CSS-hidden nav row, hamburger or duplicate cluster to come back", () => {
    expect(navbar).not.toContain("xl:flex")
    expect(navbar).not.toContain("xl:hidden")
    expect(navbar).not.toContain("lg:flex")
    expect(navbar).not.toContain("SheetTrigger")
    expect(navbar).not.toContain('"Open menu"')
  })

  it("keeps the language picker reachable at every width, as one Google container", () => {
    // Two slots, but they are opposite branches of desktopNav: the bar above xl, the
    // drawer below it. Never both, or the id Google translates through is ambiguous.
    const drawer = navbar.slice(navbar.indexOf("<Sheet open="))
    expect(navbar.slice(0, navbar.indexOf("<Sheet open=")).match(/<GoogleTranslateSelect/g)).toHaveLength(1)
    expect(drawer.match(/<GoogleTranslateSelect/g)).toHaveLength(1)
    expect(navbar.slice(0, navbar.indexOf("<Sheet open="))).toContain("{desktopNav && (")
  })

  it("hands the whole zone below xl to the bottom tab bar", () => {
    // The header is gone there, so the tab bar is the only site chrome on screen and its
    // Menu tab the only way into the drawer. Everything fixed to the bottom edge follows.
    expect(bottomBar).toContain("bg-background/95 backdrop-blur xl:hidden")
    expect(bottomBar).toContain("hidden -translate-x-1/2 xl:block")
    expect(bottomBar).toContain("OPEN_MOBILE_NAV_EVENT")
    expect(marketingLayout).toContain("bg-surface xl:hidden")
  })

  it("lifts the right-edge stack over the bottom bar at the same breakpoint", () => {
    for (const relative of [
      "components/accessibility/accessibility-launcher.tsx",
      "components/accessibility/accessibility-widget.tsx",
      "components/landing-chatbot.tsx",
      "components/features/cookie-consent.tsx",
    ]) {
      const text = read(relative)
      expect(text, `${relative} still clears the bar at lg`).not.toMatch(/lg:bottom-\[calc/)
      expect(text, `${relative} no longer clears the bar at all`).toMatch(/xl:bottom-\[calc/)
    }
  })

  it("opens one drawer section at a time", () => {
    // One accordion, so the state is the Navbar's and each row is told if it is the open one.
    expect(navbar).toMatch(/const \[openGroup, setOpenGroup\] = useState<string \| null>\(null\)/)
    expect(navbar).toContain("open={openGroup === group.title}")
    expect(navbar).toContain("current === group.title ? null : group.title")
  })

  it("keeps the drawer rows stateless so a second row cannot open with the first", () => {
    const group = navbar.slice(navbar.indexOf("function MobileGroup"), navbar.indexOf("export function Navbar"))
    expect(group).not.toContain("useState")
    expect(group).toContain("open: boolean")
    expect(group).toContain("onToggle: () => void")
  })

  it("resets the accordion on every dismissal path", () => {
    expect(navbar).toContain("else setOpenGroup(null)")
    expect(navbar).toMatch(/const closeDrawer = \(\) => \{\s*setOpen\(false\)\s*setOpenGroup\(null\)/)
    expect(navbar).toContain("onNavigate={closeDrawer}")
    expect(navbar).not.toContain("onNavigate={() => setOpen(false)}")
  })

  it("slims the workspace top bar instead of dropping controls through tablet", () => {
    // The pill switch, the full language label and the first name are lg pay-offs; tablet
    // portrait keeps an icon switch, a truncating label and a bare avatar.
    expect(layout).toContain('<ThemeSwitch className="hidden lg:inline-flex" />')
    expect(layout).toContain('<ThemeToggle className="h-9 w-9 lg:hidden" />')
    expect(layout).toContain('<GoogleTranslateSelect className="w-[7.5rem] lg:w-auto" />')
    expect(layout).toContain('className="hidden text-sm lg:inline"')
  })

  it("keeps the workspace top bar inside a 768px tablet", () => {
    // Read the widths the row actually declares rather than trusting a comment. At md the
    // nav is a drawer, so the bar owns the whole viewport: the left cluster is the 36px menu
    // trigger, its 16px gap and the search field; the right cluster is four bordered controls
    // (36 icon switch, the language pill, 36 assistant, 36 bell, 44 avatar) with an 8px gap
    // between each pair; the header adds 16px of padding on both sides.
    const mdSearch = Number(layout.match(/ : "w-\[\d+px\] sm:w-\[(\d+)px\]/)?.[1] ?? 0)
    expect(mdSearch).toBeGreaterThan(0)
    const mdTranslate = Number(layout.match(/<GoogleTranslateSelect className="w-\[(\d+(?:\.\d+)?rem)\]/)?.[1].replace("rem", "")) * 16
    const focused = Number(layout.match(/searchFocused \? "w-\[\d+px\] sm:w-\[(\d+)px\]/)?.[1] ?? 0)
    const left = 36 + 16 + mdSearch
    const right = 36 + 8 + mdTranslate + 8 + 36 + 8 + 36 + 8 + 44
    expect(left + right + 32).toBeLessThanOrEqual(768)
    expect(left - mdSearch + focused + right + 32).toBeLessThanOrEqual(768)
  })

  it("holds the search field at its small width through tablet", () => {
    const field = layout.slice(layout.indexOf("relative flex items-center transition-all"))
    expect(field).toMatch(/w-\[150px\] sm:w-\[200px\] lg:w-\[300px\]/)
    expect(field).toMatch(/w-\[180px\] sm:w-\[240px\] lg:w-\[400px\]/)
    expect(field.slice(0, 400)).not.toContain("md:w-[")
  })

  it("keeps five-up strips down to three columns until the width is real", () => {
    // The workspace spends tablet and small-laptop widths on the drawer or the 250px rail,
    // so five cards only fit from xl. Two lg:grid-cols-5 grids are not card strips: billing
    // uses it as a 3+2 layout region and the marketing demo sandbox has a full-width page.
    const layoutGrids = ["app/dashboard/billing/page.tsx", "components/sections/demo-sandbox.tsx"]
    for (const file of sources) {
      const relative = relativeOf(file)
      if (layoutGrids.includes(relative)) continue
      const text = readFileSync(file, "utf8")
      expect(text, `${relative} packs five cards into a tablet width`).not.toMatch(/(?:md|lg):grid-cols-5/)
    }
    for (const relative of [
      "app/admin/cms/page.tsx",
      "app/dashboard/retros/page.tsx",
      "app/dashboard/team/page.tsx",
      "app/dashboard/automation/page.tsx",
      "app/dashboard/reports/page.tsx",
      "app/dashboard/email/page.tsx",
      "app/dashboard/kanban/page.tsx",
    ]) {
      expect(read(relative), relative).toContain("md:grid-cols-3 xl:grid-cols-5")
    }
  })

  it("sizes image sources from the layout the breakpoint actually renders", () => {
    // Tailwind's steps are min-width:768px / 1024px / 1280px, so a sizes attribute that tests
    // max-width:768px hands a 768px tablet the phone size while the page is already in columns.
    const offenders = sources
      .filter((file) => /sizes="\(max-width: (768|1024|1280)px\)/.test(readFileSync(file, "utf8")))
      .map(relativeOf)
    expect(offenders).toEqual([])
  })

  it("gives the tablet zone the page width the drawer leaves it", () => {
    // Below lg the workspace nav is a slide-over, so a tablet page keeps all 768px: five-up
    // and desktop-sized surfaces are the ones that would otherwise be squeezed.
    expect(layout).toContain("-translate-x-full lg:translate-x-0")
    expect(layout).toContain("fixed inset-y-0 left-0")
  })
})
