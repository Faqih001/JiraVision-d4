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
    expect(src("app/dashboard/worklog/dialogs.tsx")).not.toMatch(/SelectItem value=""/u)
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
    const sources = [client(), src("app/dashboard/worklog/sections.tsx"), src("app/dashboard/worklog/dialogs.tsx")]
      .join("")
    const names = [...sources.matchAll(/aria-label="([^"]+)"/gu)].map((found) => found[1])
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

describe("work log dialogs", () => {
  const dialogs = () => src("app/dashboard/worklog/dialogs.tsx")
  const client = () => src("app/dashboard/worklog/worklog-client.tsx")
  const sections = () => src("app/dashboard/worklog/sections.tsx")

  it("labels every field and never uses a native prompt", () => {
    const code = dialogs()
    const labelled = ["entry-title", "entry-body", "entry-day", "entry-minutes", "entry-kind", "entry-task", "entry-deliverable"]
    for (const id of labelled) {
      expect(code, `missing <Label htmlFor="${id}">`).toContain(`<Label htmlFor="${id}">`)
    }
    // An invalid field is announced, not just coloured: aria-describedby points at the message.
    expect(code).toMatch(/aria-describedby=\{errors\.title \? "entry-title-error"/u)
    expect(code).toMatch(/aria-invalid=\{errors\.minutes/u)
    // No native dialog decides an action. The one surviving `window.prompt` is copy-link's manual
    // fallback, which asks nothing of the log and only runs when the browser blocks the clipboard.
    expect(client()).not.toMatch(/window\.(confirm|alert)\(/u)
    expect(code).not.toMatch(/window\.(confirm|alert|prompt)\(/u)
  })

  it("sends a new row to POST and an existing one to PUT", () => {
    expect(client()).toMatch(/method: "POST"/u)
    expect(client()).toMatch(/`\$\{mutateBase\}\/\$\{value\.id\}`/u)
    expect(client()).toMatch(/method: "PUT"/u)
    expect(client()).toMatch(/`\$\{mutateBase\}\/\$\{entry\.id\}`/u)
    expect(client()).toMatch(/method: "DELETE"/u)
  })

  it("keeps a blank minutes field null instead of zero", () => {
    // A zero-minute entry claims the member logged no time; a null claims they did not say.
    expect(client()).toMatch(/minutes === "" \? null : Number\(minutes\)/u)
    // The two cross-field rules the server enforces are said here too, so the member reads them
    // beside the field instead of in a toast after the request.
    expect(dialogs()).toMatch(/A time entry needs minutes/u)
    expect(dialogs()).toMatch(/form\.kind === "deliverable" && form\.deliverableId === NONE/u)
  })

  it("clears an optional column with null, never an empty string", () => {
    // readEntryCreate rejects "" on a numeric id, and an empty body would be stored as one.
    expect(client()).toMatch(/value\.body\.trim\(\) === "" \? null : value\.body/u)
    expect(client()).toMatch(/taskId: value\.taskId === "none" \? null : Number\(value\.taskId\)/u)
    expect(client()).toMatch(/deliverableId: value\.deliverableId === "none" \? null : Number\(value\.deliverableId\)/u)
    expect(client()).toMatch(/discipline: value\.discipline === "all" \? null : value\.discipline/u)
  })

  it("converts a row through the bulk endpoint, in one transaction", () => {
    expect(client()).toMatch(/"\/api\/worklog\/entries\/bulk"/u)
    expect(client()).toMatch(/action: "convert-deliverable"/u)
    expect(client()).toMatch(/ids: \[entry\.id\]/u)
  })

  it("asks before destroying a row", () => {
    expect(client()).toMatch(/setPendingDelete/u)
    expect(dialogs()).toMatch(/AlertDialogAction/u)
    expect(dialogs()).toMatch(/Delete entry/u)
    // The action stays in the dialog: closing is the client clearing its own pending row.
    expect(dialogs()).toMatch(/if \(entry\) onConfirm\(entry\)/u)
  })

  it("turns the row controls on only where the client passes handlers", () => {
    expect(client()).toMatch(/onEdit: openEntry/u)
    expect(client()).toMatch(/onDelete: setPendingDelete/u)
    expect(client()).toMatch(/onConvert: \(entry\) => void convertEntry/u)
    expect(client()).toMatch(/onToggle: toggleSelect/u)
    // One actions object threaded through the bodies, so a new body cannot forget a control.
    expect(sections()).toMatch(/actions: RowActions/u)
    expect(sections()).toMatch(/onEdit=\{actions\.onEdit\}/u)
    expect(sections()).toMatch(/selected=\{actions\.selection\?\.includes\(entry\.id\) \?\? false\}/u)
  })

  it("gives the log a full-form capture next to quick add", () => {
    expect(client()).toMatch(/onAddDay=\{\(\) => openEntry\(null\)\}/u)
    expect(sections()).toMatch(/Add an entry/u)
    // The day seeded is the one the member is looking at, not the browser's guess of today.
    expect(client()).toMatch(/toDraft\(entry, entry\?\.workedOn \?\? state\.day\)/u)
  })

  it("seeds the form by remount and keeps the fetch in the client", () => {
    // key={} gives a fresh form per row, so the dialog never needs an effect to sync a lifted
    // draft — and typing re-renders the dialog, not the whole grid underneath it.
    expect(client()).toMatch(/key=\{draft\.id \?\? "new"\}/u)
    expect(client()).toMatch(/useState<EntryDraft \| null>\(null\)/u)
    expect(dialogs()).not.toMatch(/useEffect/u)
    expect(dialogs()).not.toMatch(/fetch\(/u)
    expect(dialogs()).not.toMatch(/onDraftChange/u)
  })
})

describe("bulk bar", () => {
  const client = () => src("app/dashboard/worklog/worklog-client.tsx")
  const sections = () => src("app/dashboard/worklog/sections.tsx")
  const dialogs = () => src("app/dashboard/worklog/dialogs.tsx")

  it("exists only while a selection exists", () => {
    expect(client()).toMatch(/selectedEntries\.length > 0 && \(\s*<BulkSection/u)
    expect(sections()).toMatch(/export function BulkSection/u)
  })

  it("offers every bulk action the API implements", () => {
    const code = sections()
    for (const action of ["delete", "set-task", "re-date", "set-kind", "convert-deliverable"]) {
      expect(code).toContain(`"${action}"`)
    }
    expect(code).toMatch(/type BulkAction/u)
  })

  it("offers only the kinds a bulk reclassify can actually apply", () => {
    // readBulkRequest refuses `time` (needs per-row minutes) and `deliverable` (needs a linked
    // deliverable row). A bar that offered them would offer a button that always toasts an error.
    // The row dialog can still offer all six, because it sends the companion field with them.
    const code = sections()
    expect(code).toMatch(/BULK_SETTABLE_KINDS\.map/u)
    expect(code).toMatch(/WORK_LOG_KINDS\.map/u) // the board keeps all six columns
  })

  it("posts the selection to the bulk route through one handler", () => {
    // The client's `mutate` is what calls fetch, so the guard reads the call site: one
    // path string, used by both applyBulk and confirmBulkDelete.
    expect(client()).toMatch(/onApply=\{applyBulk\}/u)
    expect(client()).toMatch(/const bulkUrl = "\/api\/worklog\/entries\/bulk"/u)
    expect(client()).toMatch(/body: JSON\.stringify\(\{ action, ids: selectedIds/u)
    // The batch delete sends the same list the bar shows, so a row a changed filter left behind
    // cannot be deleted without ever having been displayed.
    expect(client()).toMatch(/body: JSON\.stringify\(\{ action: "delete", ids: selectedIds/u)
    expect(client()).toMatch(/const selectedIds = useMemo/u)
  })

  it("asks before deleting a batch", () => {
    expect(client()).toMatch(/setPendingBulkDelete\(true\)/u)
    expect(dialogs()).toMatch(/export function ConfirmBulkDelete/u)
    expect(client()).not.toMatch(/window\.confirm\(/u)
  })

  it("exports the current selection as a real download", () => {
    const code = client()
    expect(code).toMatch(/entriesToCsv/u)
    expect(code).toMatch(/new Blob\(\[csv\], \{ type: "text\/csv;charset=utf-8" \}\)/u)
    expect(code).toMatch(/a\.download = `jiravision-worklog-\$\{range\.from\}-\$\{range\.to\}\.csv`/u)
    expect(code).toMatch(/URL\.revokeObjectURL\(url\)/u)
  })

  it("clears the selection after a successful action", () => {
    expect(client()).toMatch(/setSelection\(\[\]\)/u)
  })

  it("disables every control while a write is in flight", () => {
    expect(sections()).toMatch(/disabled=\{busy\}/u)
    // The action lives in the bar, so a stale dialog cannot fire a second write behind it.
    expect(dialogs()).toMatch(/disabled=\{busy \|\| count === 0\}/u)
  })

  it("shows the selection it was handed, not a copy of the grid's filtering", () => {
    // The client filters the loaded rows to the ids it will send, and the bar renders that exact
    // list. A bar that filtered again could show a minutes total for rows the write never touched.
    expect(client()).toMatch(/selected=\{selectedEntries\}/u)
    expect(client()).toMatch(/const selectedEntries = useMemo/u)
    const code = sections()
    expect(code).toMatch(/selected: EntryDto\[\]/u)
    expect(code).toMatch(/minutesTotal\(selected\)/u)
    expect(code).not.toMatch(/selected\.filter/u)
  })
})

describe("sections 6 to 11", () => {
  const client = () => src("app/dashboard/worklog/worklog-client.tsx")
  const sections = () => src("app/dashboard/worklog/sections.tsx")
  const dialogs = () => src("app/dashboard/worklog/dialogs.tsx")

  it("renders the eleven numbered sections in one order", () => {
    const code = client()
    for (const name of [
      "TotalsSection",
      "QuickAddSection",
      "FilterSection",
      "ViewToolbarSection",
      "LogSection",
      "DeliverablesSection",
      "TransitionsSection",
      "TimeByTaskSection",
      "DisciplineSplitSection",
      "KindMixSection",
      "CoverageSection",
    ]) {
      expect(code).toMatch(new RegExp(`<${name}\\b`, "u"))
    }
  })

  it("drives the deliverable buttons from the lifecycle map, not literals", () => {
    // The board only offers forward moves, so it reads the map directly. The dialog needs the
    // row's own state kept selectable (saving a name must not count as a move), which the shared
    // predicate gives it — so canMoveDeliverable belongs to dialogs.tsx, not here.
    const code = sections()
    expect(code).toMatch(/DELIVERABLE_NEXT\[d\.status\]/u)
    expect(code).not.toMatch(/status === "draft" \? "in_review"/u)
  })

  it("links a deliverable to its own edit and delete actions", () => {
    expect(sections()).toMatch(/onClick=\{\(\) => onEdit\(d\)\}/u)
    expect(sections()).toMatch(/onClick=\{\(\) => onDelete\(d\.id\)\}/u)
    // The client mutates through `mutate`, whose first argument is the path built from
    // `deliverableBase`, so the guard reads that string rather than a literal fetch.
    const code = client()
    expect(code).toMatch(/const deliverableBase = "\/api\/worklog\/deliverables"/u)
    expect(code).toMatch(/`\$\{deliverableBase\}\/\$\{value\.id\}`/u)
    expect(code).toMatch(/`\$\{deliverableBase\}\/\$\{d\.id\}`/u)
    expect(code).toMatch(/`\$\{deliverableBase\}\/\$\{id\}`/u)
  })

  it("colours charts from the shared maps", () => {
    const code = sections()
    expect(code).toMatch(/DISCIPLINE_COLOUR\[row\.discipline\]/u)
    expect(code).toMatch(/KIND_COLOUR\[k\.kind\]/u)
    expect(code).not.toMatch(/fill="#[0-9a-f]{3,6}"/iu)
  })

  it("never draws a bar from a number it worked out itself", () => {
    // Bucket minutes arrive computed by the summary route; a local re-add would be a second
    // arithmetic over the same rows, and the two would drift the day a kind stops counting.
    // The one shared addition is minutesTotal(), which is a call, not a loop.
    const code = sections()
    expect(code).toMatch(/disciplines: DisciplineBucket\[\]/u)
    expect(code).not.toMatch(/\.reduce\(/u)
  })

  it("surfaces a gap by name with a way to fill it", () => {
    const code = sections()
    expect(code).toMatch(/onPickDay/u)
    expect(code).toMatch(/gaps\.length === 0/u)
    expect(code).not.toMatch(/<EmptySection title="Coverage"\/>/u)
    // The cap is in the copy, not silent: a year-long filter shows it stopped counting.
    expect(code).toMatch(/gaps\.slice\(0, 21\)/u)
  })

  it("keeps every transition row honest about where it came from", () => {
    const code = sections()
    expect(code).toMatch(/SOURCE_LABEL\[t\.source\]/u)
    expect(code).toMatch(/captured automatically/u)
  })

  it("offers only the states the lifecycle allows from the row's own", () => {
    // pickDeliverableUpdates refuses an illegal jump, so a State select over all four statuses
    // would be a control that fails on save — the same trap as the bar's Reclassify.
    const code = dialogs()
    expect(code).toMatch(/statusOptions/u)
    expect(code).toMatch(/canMoveDeliverable\(draft\.status, option\)/u)
    expect(code).not.toMatch(/DELIVERABLE_STATUSES\.map/u)
  })

  it("accepts the links the server accepts", () => {
    // readLink takes an http(s) address *or* a root-relative path. A client rule of
    // "must start with https://" would reject a valid in-app link before the request is sent.
    const code = dialogs()
    expect(code).toMatch(/startsWith\("\/"\)/u)
    expect(code).toMatch(/link must be an http\(s\) address or a path/u)
  })

  it("has no dead control in the new sections", () => {
    const code = `${sections()}${client()}`
    expect(code).not.toMatch(/href="#"/u)
    expect(code).not.toMatch(/onClick=\{\(\) => \{\}\}/u)
    expect(code).not.toMatch(/console\.log/u)
  })

  it("gives every new input a label and seeds the dialog by remount", () => {
    const code = dialogs()
    expect(code).toMatch(/<Label htmlFor="deliverable-name"/u)
    expect(code).toMatch(/<Label htmlFor="deliverable-link"/u)
    expect(code).toMatch(/<Label htmlFor="deliverable-status"/u)
    expect(code).toMatch(/useState<DeliverableDraft>\(draft\)/u)
    expect(code).not.toMatch(/onDraftChange/u)
    expect(client()).toMatch(/key=\{deliverableDraft\.id \?\? "new"\}/u)
  })
})

describe("dashboard today strip", () => {
  const dash = () => src("app/dashboard/page.tsx")
  // The strip is one function inside a 1,200-line page whose inputs legitimately carry
  // `placeholder` hints. The "nothing invented here" rule is about the strip's own body, so it
  // is read from there — a file-wide assertion would pass only by accident.
  const strip = () => {
    const code = dash()
    const start = code.indexOf("function TodayStrip(")
    if (start === -1) return ""
    const end = code.indexOf("export default function", start)
    return code.slice(start, end === -1 ? undefined : end)
  }

  it("fetches the day through the shared summary endpoint", () => {
    // `v` is the key parseViewState reads; a `view=` param is silently ignored and would ask
    // the route for its default range instead of today.
    expect(dash()).toMatch(/fetch\("\/api\/worklog\/summary\?v=day"\)/u)
    // One Promise.all: a slow log endpoint cannot hold the sprint data behind it.
    expect(dash()).toMatch(/const \[ovRes, spRes, todayRes\] = await Promise\.all\(\[/u)
  })

  it("keeps the day on the server's calendar, not the browser's", () => {
    expect(dash()).toMatch(/localDay\(new Date\(\)/u)
    expect(dash()).not.toMatch(/new Date\(\)\.toISOString\(\)\.slice\(0, ?10\)/u)
    // The heading reads the summary's own resolved day, which the route took from users.timezone.
    expect(dash()).toMatch(/today\?\.range\.from \?\? localDay\(new Date\(\)\)/u)
  })

  it("degrades to a link when the summary call fails", () => {
    const code = dash()
    expect(code).toMatch(/setToday\(null\)/u)
    expect(code).toMatch(/\/dashboard\/worklog/u)
    expect(code).not.toMatch(/catch \{\s*\}/u)
    // A null summary is its own branch: zeros would be a claim about a day nobody read.
    expect(strip()).toMatch(/summary === null/u)
    expect(strip()).toMatch(/Could not read your log/u)
  })

  it("shows the three numbers the strip exists for", () => {
    const code = strip()
    expect(code).toMatch(/totals\.entries/u)
    expect(code).toMatch(/totals\.minutes/u)
    expect(code).toMatch(/streak\.current/u)
  })

  it("links every row it previews to the log filtered by that day", () => {
    expect(strip()).toMatch(
      /`\/dashboard\/worklog\?\$\{new URLSearchParams\(\{ v: "day", day: todayIso \}\)\}`/u,
    )
  })

  it("does not fake a section when there is nothing logged", () => {
    const code = strip()
    expect(code).toMatch(/EmptyNote/u)
    expect(code).toMatch(/Nothing logged today/u)
    expect(code).not.toMatch(/lorem|placeholder/iu)
    // The cap is stated, not silent: five rows shown of nine must not read as the whole day.
    expect(code).toMatch(/\.slice\(0, 5\)/u)
    expect(code).toMatch(/more in the work log/u)
  })
})
