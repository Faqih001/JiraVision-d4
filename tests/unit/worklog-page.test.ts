import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"

const repo = path.resolve(__dirname, "..", "..")
const src = (relative: string) => readFileSync(path.join(repo, relative), "utf8")

describe("work log page shell", () => {
  const page = () => src("app/dashboard/worklog/page.tsx")

  it("wraps the search-param client in Suspense", () => {
    expect(page()).toMatch("<Suspense fallback={<WorklogSkeleton />}>")
    expect(page()).toMatch("<WorklogClient />")
    expect(page()).not.toMatch(/"use client"/u)
  })

  it("is dynamic so the member's own session is never cached", () => {
    expect(page()).toMatch(/export const dynamic = "force-dynamic"/u)
  })
})

describe("work log client", () => {
  const client = () => src("app/dashboard/worklog/worklog-client.tsx")

  it("mirrors every control into the query string", () => {
    expect(client()).toMatch(/useSearchParams/u)
    expect(client()).toMatch(/serializeViewState\(state, todayIso\)/u)
    expect(client()).toMatch("router.replace(target, { scroll: false })")
  })

  it("only rewrites the URL when the query actually differs", () => {
    // Without this the replace re-renders, the effect re-runs, and the page loops. The leading
    // `?` is stripped first: serializeViewState returns `v=week` and location.search returns
    // `?v=week`, so comparing them raw is always true and rewrites on every render. The `?` in
    // the pattern is escaped because a u-flagged regex cannot quantify an anchor.
    expect(client()).toMatch('window.location.search.replace(/^\\?/u, "")')
    expect(client()).toMatch(/next !== current/u)
  })

  it("adopts the URL only when it disagrees with local state", () => {
    // A router.replace pushes new search params back into this same effect; adopting them
    // unconditionally would overwrite a control the member just touched. Comparing the URL to
    // itself is not enough either: a shared `?v=week` link is already canonical, so that check
    // refuses to adopt it and then rewrites the URL back to the default view.
    expect(client()).toMatch(/serializeViewState\(parsed, todayIso\) !== serializeViewState\(prev, todayIso\)/u)
  })

  it("moves an unchosen day onto the server's clock", () => {
    // The browser's zone is a guess until the first response. If the guess is stale and nobody
    // picked a day, the stale one would be pinned into the URL as `?day=` the moment todayIso
    // shifts, and the member would open on yesterday.
    expect(client()).toMatch(/setState\(\(prev\) => \(prev\.day === todayIso \? \{ \.\.\.prev, day: serverToday \} : prev\)\)/u)
  })

  it("reads all four endpoints through one fetch set", () => {
    expect(client()).toMatch(/fetch\(`\/api\/worklog\/entries\?\$\{qs\}`\)/u)
    expect(client()).toMatch(/fetch\(`\/api\/worklog\/summary\?\$\{qs\}`\)/u)
    expect(client()).toMatch(/"\/api\/worklog\/deliverables"/u)
    // The tasks endpoint is read with an explicit page size; the default of 10 would make the
    // task filter offer ten rows and hide the rest.
    expect(client()).toMatch(/"\/api\/tasks\?pageSize=200"/u)
  })

  it("takes the member's day and timezone from the server, not the browser", () => {
    expect(client()).toMatch(/const serverToday = entriesJson\.data\.today/u)
    expect(client()).toMatch(/setTodayIso\(serverToday\)/u)
    expect(client()).toMatch(/setTimezone\(entriesJson\.data\.timezone/u)
    expect(client()).toMatch(/localDay\(new Date\(\), timezone\)/u)
  })

  it("reads the quick-add parse through the union it actually returns", () => {
    // parseQuickAdd answers { title, minutes, kind } or { error } — there is no `value` wrapper,
    // so `parsed.value.title` would be a runtime crash on the one line every member types first.
    expect(client()).toMatch('if ("error" in parsed)')
    expect(client()).not.toMatch(/parsed\.value/u)
    expect(client()).toMatch(/parsed\.title/u)
  })

  it("gives quick add's task link a control that can set it", () => {
    // taskId state existed without anything writing to it, so every quick-add row would have been
    // saved unlinked with no way to say otherwise — the spec asks for an optional task search.
    expect(client()).toMatch(/aria-label="Link to a task"/u)
    expect(client()).toMatch(/onValueChange=\{setTaskId\}/u)
  })

  it("has no dead affordances", () => {
    const code = client()
    expect(code).not.toMatch(/href="#"/u)
    expect(code).not.toMatch(/TODO|coming soon|not implemented/iu)
    expect(code).not.toMatch(/dispatchEvent\(new CustomEvent/u)
  })

  it("uses the repo's sentinel grammar for selects", () => {
    expect(client()).not.toMatch(/SelectItem value=""/u)
    expect(src("app/dashboard/worklog/sections.tsx")).not.toMatch(/SelectItem value=""/u)
  })

  it("narrows the 75 disciplines through the category picker", () => {
    const sections = src("app/dashboard/worklog/sections.tsx")
    expect(sections).toMatch(/disciplinesInCategory/u)
    expect(sections).toMatch(/DISCIPLINE_LABEL/u)
    expect(client()).toMatch(/<DisciplinePicker /u)
    // A flat 75-row select is unusable; the grouping is the control.
    expect(sections).not.toMatch(/WORK_DISCIPLINES\.map/u)
  })

  it("keeps presentation out of the client", () => {
    expect(src("app/dashboard/worklog/sections.tsx")).not.toMatch(/fetch\(/u)
  })

  it("gives every unlabelled control its own accessible name", () => {
    // These triggers have no <Label>, so aria-label is the only name a screen reader gets. Two
    // controls answering to "Entry kind" — the filter and the quick-add line — would read as one
    // control twice.
    const names = [...`${client()}${src("app/dashboard/worklog/sections.tsx")}`.matchAll(/aria-label="([^"]+)"/gu)]
      .map((found) => found[1])
      .sort()
    expect(new Set(names).size, `duplicate aria-label in ${names.join(", ")}`).toBe(names.length)
    expect(names.length).toBeGreaterThanOrEqual(6)
  })

  it("never paints a label in the series colour", () => {
    // A --chart-* token is 3:1 against its surface by design (WCAG 1.4.11 non-text), which is not
    // 4.5:1, so as 11px text it fails AA. The colour rides as a dot; the word keeps the badge's
    // own --foreground.
    const sections = src("app/dashboard/worklog/sections.tsx")
    expect(sections).not.toMatch(/color: KIND_COLOUR/u)
    expect(sections).toMatch("backgroundColor: KIND_COLOUR[kind]")
  })
})

describe("work log views", () => {
  const sections = () => src("app/dashboard/worklog/sections.tsx")
  const client = () => src("app/dashboard/worklog/worklog-client.tsx")

  it("renders the active view in one section slot", () => {
    expect(client()).toMatch(/<LogSection/u)
    expect(client()).toMatch(/view=\{state\.view\}/u)
    // One slot, one heading, and the heading comes from the same VIEW_LABEL the toolbar buttons
    // read, so a renamed view is renamed in both places at once.
    expect(sections()).toMatch(/VIEW_LABEL\[view\]/u)
  })

  it("builds all five bodies", () => {
    for (const name of ["DayBody", "WeekBody", "ListBody", "BoardBody", "HeatBody"]) {
      expect(sections()).toContain(`function ${name}(`)
    }
    // The switch is exhaustive over WorklogView: a sixth view with no body is a compile error,
    // not a blank card.
    expect(sections()).toMatch(/case "heat":/u)
  })

  it("lets a week or heat cell jump to that day", () => {
    expect(sections()).toMatch(/onPickDay\(bucket\.day\)/u)
    expect(client()).toMatch(/patchState\(\{ day, view: "day" \}\)/u)
  })

  it("keeps the day view on the picked day and the others on the member's today", () => {
    // The picker in section 4 is what the member navigated to; the highlight in week and heat
    // answers a different question — is this cell the day they are standing on.
    expect(client()).toMatch(/todayIso=\{state\.view === "day" \? state\.day : todayIso\}/u)
    expect(sections()).toMatch(/case "day":\n\s+return <DayBody days=\{days\} day=\{todayIso\}/u)
  })

  it("never encodes a value in colour alone", () => {
    const code = sections()
    // Every tinted cell also carries its number as text.
    expect(code).toMatch(/\{bucket\.count\}/u)
    expect(code).toMatch(/formatMinutes\(bucket\.minutes\)/u)
    expect(code).toMatch(/border-border\/60/u)
  })

  it("says what an empty range means instead of showing a blank card", () => {
    const code = sections()
    expect(code).toMatch(/Nothing logged on/u)
    expect(code).toMatch(/EmptyNote/u)
  })

  it("keeps presentation honest: no fetch, no page data", () => {
    expect(sections()).not.toMatch(/fetch\(/u)
    expect(sections()).not.toMatch(/useRouter/u)
  })
})
