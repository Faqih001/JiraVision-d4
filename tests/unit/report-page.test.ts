import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"
import { CHART_UNIT } from "@/lib/reports/charts"
import { ROW_SECTIONS } from "@/lib/reports/row-sections"
import {
  CHART_KEYS,
  PROSE_SECTIONS,
  REPORT_SECTIONS,
  REPORT_TEMPLATES,
  SECTION_TITLE,
  TEMPLATE_CHARTS,
  TEMPLATE_METRICS,
  sectionsFor,
} from "@/lib/reports/templates"

const repo = path.resolve(__dirname, "..", "..")
const src = (relative: string) => readFileSync(path.join(repo, relative), "utf8")
const page = () => src("app/dashboard/reports-work/page.tsx")
const client = () => src("app/dashboard/reports-work/reports-client.tsx")
const sectionsFile = () => src("app/dashboard/reports-work/sections.tsx")
const dialogsFile = () => src("app/dashboard/reports-work/dialogs.tsx")
const overviewFile = () => src("app/dashboard/reports-work/overview.tsx")

/** Comment-stripped: a guard about the code cannot be satisfied by a sentence in a comment. */
function codeOnly(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/^\s*\/\/.*$/gmu, "")
}

describe("the reports-work page", () => {
  it("is reachable from the dashboard nav", () => {
    expect(src("components/dashboard-layout.tsx")).toMatch(/href: "\/dashboard\/reports-work"/u)
  })

  it("wraps the client in Suspense, because useSearchParams needs a render boundary", () => {
    expect(page()).toMatch(/<Suspense fallback=\{<ReportsSkeleton \/>\}/u)
    expect(page()).toMatch(/export const dynamic = "force-dynamic"/u)
  })

  it("has exactly one URL rewrite, and adopts the query before it writes", () => {
    // The phase-2 lesson: a third effect, or a rewrite compared against an un-stripped
    // location.search, re-renders in a loop and the back button stops working.
    expect(codeOnly(client()).match(/router\.replace/gu)).toHaveLength(1)
    expect(client()).toMatch(
      /serializeReportView\(parsed, todayIso\) !== serializeReportView\(prev, todayIso\)/u,
    )
    expect(client()).toMatch(/const current = window\.location\.search\.replace/u)
  })

  it("adopts the query before the first rewrite can fire", () => {
    // On a fresh deep-link load both effects run once with the initial state: the parse effect's
    // setState has not landed yet when the rewrite effect compares the default state against
    // ?v=build&r=2 and replaces the URL with the bare page — the report never reopens. The
    // rewrite waits until the first parse has adopted the query.
    expect(client()).toMatch(/const \[adopted, setAdopted\] = useState\(false\)/u)
    expect(client()).toMatch(/setAdopted\(true\)/u)
    expect(client()).toMatch(/if \(!adopted\) return/u)
  })

  it("shows the absent-report note only while the builder holds the missing id", () => {
    // Deleting the open draft leaves a stale refresh in flight: it 404s on the deleted row and
    // sets missingId, and the list-view refresh never clears it (the clear lives in the build
    // branch). The note explains the builder's empty state, so it is gated on the build view
    // rather than chasing the race through state.
    expect(client()).toMatch(/missingId=\{state\.view === "build" \? missingId : null\}/u)
  })

  it("takes the day from the server, not the browser clock", () => {
    expect(client()).toMatch(/const serverToday = listJson\.data\.today as string/u)
    // Identity matters as much as the value: `refresh` closes over `state` and an effect runs it
    // on `[refresh]`, so an updater that returns a new object with the same anchor rebuilds the
    // loader, re-runs the load, and re-paints the skeletons in a circle.
    expect(client()).toMatch(/setState\(\(prev\) => adoptServerAnchor\(prev, todayIso, serverToday\)\)/u)
    // toISOString().slice(0, 10) is yesterday for anyone west of UTC, and a report dated wrong
    // is worse than one dated late.
    expect(codeOnly(client())).not.toMatch(/toISOString\(\)\.slice\(0, *10\)/u)
    expect(codeOnly(sectionsFile())).not.toMatch(/toISOString\(\)\.slice\(0, *10\)/u)
  })

  it("never invents a period, and never re-runs the arithmetic", () => {
    // One home for the maths (lib/reports/aggregate.ts) and one home for the span
    // (lib/reports/view-state.ts). A card that totals its own rows is a second opinion.
    expect(client()).toMatch(/resolveReportPeriod\(state\)/u)
    expect(codeOnly(sectionsFile())).not.toMatch(/\.reduce\(|groupBy|aggregateReport\(/u)
  })

  it("renders the empty state instead of a spinner when there is nothing to show", () => {
    expect(sectionsFile()).toMatch(/No reports yet/u)
    expect(sectionsFile()).toMatch(/function ReportEmptyNote/u)
  })
})

describe("the overview strip and insight cards", () => {
  const slice = (from: string, to: string) => {
    const code = overviewFile()
    return code.slice(code.indexOf(from), code.indexOf(to))
  }

  it("summarises the list with five bordered tiles", () => {
    expect(overviewFile()).toMatch(/export function ReportsKpiStrip/u)
    expect(overviewFile()).toMatch(/xl:grid-cols-5/u)
    for (const label of ["Total reports", "Drafts", "Awaiting review", "Acknowledged", "Returned"]) {
      expect(overviewFile()).toContain(`label="${label}"`)
    }
    expect(overviewFile()).toMatch(/statusCounts\(reports\)/u)
  })

  it("draws the pipeline as a fixed donut with a centre total and a full legend", () => {
    const pipeline = slice("export function PipelineSection", "export function CadenceSection")
    expect(pipeline).toMatch(/<PieChart width=\{160\} height=\{160\}>/u)
    expect(pipeline).toMatch(/innerRadius=\{48\}\s+outerRadius=\{75\}/u)
    expect(pipeline).toMatch(/relative h-\[160px\] w-\[160px\] shrink-0/u)
    expect(pipeline).toMatch(/pointer-events-none absolute inset-0/u)
    expect(pipeline).toMatch(/self-stretch/u)
    expect(pipeline).toMatch(/fill=\{REPORT_STATUS_COLOR\[slice\.status\]\}/u)
    expect(pipeline).not.toMatch(/fill="#/u)
    expect(pipeline).toMatch(/flex h-full flex-col justify-between gap-4/u)
  })

  it("bars the creation cadence by week, with value labels over the bars", () => {
    const cadence = slice("export function CadenceSection", "export function TurnaroundSection")
    expect(cadence).toMatch(/cadenceWeeks\(reports, todayIso, timezone\)/u)
    expect(cadence).toMatch(/cadenceTotal\(weeks\)/u)
    expect(cadence).toMatch(/grid min-h-0 flex-1 grid-cols-8 grid-rows-1 items-end gap-2/u)
    expect(cadence).toMatch(/\{week\.count > 0 \? week\.count : ""\}/u)
    expect(cadence).toMatch(/flex h-full flex-col/u)
  })

  it("measures review turnaround from the lib, and says so when nothing is acked yet", () => {
    const turnaround = slice("export function TurnaroundSection", "export function ReportsKpiStrip")
    expect(turnaround).toMatch(/turnaroundStats\(reports\)/u)
    expect(turnaround).toContain('label="Avg time to ack"')
    expect(turnaround).toMatch(/no acknowledgements yet/u)
    expect(turnaround).toMatch(/grid grid-cols-2 gap-2/u)
  })

  it("keeps the overview presentational: no fetching, no state, no aggregation", () => {
    expect(codeOnly(overviewFile())).not.toMatch(/fetch\(|useState|useRouter|\.reduce\(/u)
  })

  it("renders the strip in both views and the trio in the list view", () => {
    expect(client()).toMatch(/<ReportsKpiStrip reports=\{reports\}/u)
    expect(client()).toMatch(/<PipelineSection reports=\{reports\}/u)
    expect(client()).toMatch(/<CadenceSection reports=\{reports\} todayIso=\{todayIso\} timezone=\{timezone\}/u)
    expect(client()).toMatch(/<TurnaroundSection reports=\{reports\}/u)
  })

  it("colours every status from the design tokens, in the list and the header", () => {
    expect(sectionsFile()).toMatch(/export function ReportStatusPill/u)
    expect(sectionsFile()).toMatch(
      /color-mix\(in srgb, \$\{REPORT_STATUS_COLOR\[status\]\} 15%, transparent\)/u,
    )
    expect(codeOnly(sectionsFile())).not.toMatch(
      /bg-blue-100|bg-green-100|bg-amber-100|border-amber-200|bg-amber-50/u,
    )
    expect(sectionsFile()).toMatch(/<ReportStatusPill status=\{report\.status\} \/>/u)
  })
})

describe("the builder's write path", () => {
  const dialogs = () => src("app/dashboard/reports-work/dialogs.tsx")

  it("sends the whole prose set on save, so a stored draft always has every section key", () => {
    expect(client()).toMatch(/PROSE_SECTIONS\.map\(\(key\) => \[key, \{ text: prose\[key\] \?\? "" \}\]/u)
    expect(client()).toMatch(/method: "PATCH"/u)
  })

  it("keeps one dirty comparison, in one place", () => {
    expect(client()).toMatch(/function serializeProse/u)
    expect((codeOnly(client()).match(/serializeProse\(/gu) ?? []).length).toBeGreaterThanOrEqual(2)
    expect(codeOnly(client())).not.toMatch(/JSON\.stringify\(prose\)/u)
  })

  it("resolves an auto template before creating a draft", () => {
    // The route only ever stores a real template id; `auto` is a UI choice, not a column value.
    expect(client()).toMatch(/effectiveTemplate\(state, aggregate\)/u)
    expect(dialogs()).toMatch(/TEMPLATE_LABEL/u)
  })

  it("refuses to save a report it has not loaded", () => {
    // Two plan guards could not match the shipped code and are corrected here: saveDraft
    // refuses with a braced block plus a toast (the toast is the point — the member is told
    // why), and the recompute call uses a template literal, not a quoted path. The one-line
    // `if (!report) return` form does exist, in recompute, where there is nothing to explain.
    expect(client()).toMatch(/if \(!report\) \{/u)
    expect(client()).toMatch(/if \(!report\) return/u)
    expect(client()).toMatch(/Nothing to save/u)
  })

  it("asks before deleting, and never deletes on a single click", () => {
    // The DELETE only exists inside the confirmed action; the button only sets pendingDelete.
    expect(client()).toMatch(/setPendingDelete\(report\)/u)
    expect(client()).toMatch(/if \(!pendingDelete\) return/u)
    expect(client()).toMatch(/method: "DELETE"/u)
    expect(dialogs()).toMatch(/ConfirmReportDelete/u)
  })

  it("disables the write buttons while a write is in flight", () => {
    expect(client()).toMatch(/onClick=\{\(\) => void saveDraft\(\)\} disabled=\{busy \|\| report\?\.status !== "draft"\}/u)
    expect(client()).toMatch(/disabled=\{busy \|\| report === null\}/u)
    expect(dialogs()).toMatch(/disabled=\{busy \|\| draft\.title\.trim\(\) === ""\}/u)
  })

  it("recomputes with a POST, not a page reload", () => {
    expect(client()).toMatch(/\/recompute`, \{ method: "POST" \}\)/u)
  })
})

describe("the six computed row cards", () => {
  it("gives every computed section a card in the build view", () => {
    for (const section of ROW_SECTIONS) expect(client()).toContain(`row("${section}")`)
  })

  it("makes the number on the card the length of the rows under it", () => {
    expect(sectionsFile()).toMatch(/const rows = aggregate \? rowsFor\(section, aggregate\) : \[\]/u)
    expect(sectionsFile()).toMatch(/total=\{rows\.length\}/u)
    expect(sectionsFile()).toMatch(/rows=\{shown\}/u)
  })

  it("keeps the drill-down in the URL, where a recipient can be sent to it", () => {
    expect(client()).toMatch(/expanded=\{state\.open === section\}/u)
    expect(client()).toMatch(/patchState\(\{ open: state\.open === section \? null : section \}\)/u)
    // sections.tsx is presentational: it holds no state of its own at all.
    expect(codeOnly(sectionsFile())).not.toMatch(/useState/u)
  })

  it("prints the ids behind the count only once the section is open", () => {
    expect(sectionsFile()).toMatch(/\{row\.ref\}/u)
    expect(sectionsFile()).toMatch(/expanded \? <p className="font-mono/u)
    expect(sectionsFile()).toMatch(/aria-expanded=\{expanded\}/u)
  })

  it("keeps the commentary inside the same card, so ten sections stay ten cards", () => {
    expect(sectionsFile()).toMatch(/<CommentField/u)
    expect(codeOnly(sectionsFile())).not.toMatch(
      /<ProseSection section="(completed|deliverables|inProgress|blocked|overdue|nextPeriod)"/u,
    )
  })

  it("links out only where the link is real", () => {
    expect(sectionsFile()).toMatch(/worklogHref\(period, section\)/u)
    expect(sectionsFile()).toMatch(/refHref\(row\.ref, period\)/u)
    // No invented routes: the planner page arrives with its own phase.
    expect(codeOnly(sectionsFile())).not.toMatch(
      /dashboard\/planner|dashboard\/tasks\/\$\{|dashboard\/deliverables/u,
    )
  })
})

describe("the metrics card", () => {
  it("completes the build view with the last two sections", () => {
    expect(client()).toMatch(/metrics: \(\n\s+<MetricsSection/u)
    expect(client()).toMatch(/notes: \(\n\s+<ProseSection\s+key="notes"/u)
    // Nothing shipped still waits on a later task.
    expect(client()).not.toMatch(/Tasks 1[0-9] add/u)
  })

  it("takes the strip from the template and the numbers from the aggregate", () => {
    expect(sectionsFile()).toMatch(/TEMPLATE_METRICS\[template\]\.map/u)
    expect(sectionsFile()).toMatch(/formatMetricValue\(key, metrics\[key\]\)/u)
    // One home for the arithmetic: the card renders the metrics it is handed.
    expect(codeOnly(sectionsFile())).not.toMatch(/\.reduce\(|aggregateReport\(/u)
  })

  it("separates a total from a count, and says so when the period was quiet", () => {
    expect(sectionsFile()).toMatch(/if \(count\.value === 0\) return "Nothing in this period"/u)
    // A count metric's value already *is* its row count, so repeating it under the number is noise;
    // a sum (minutes, story points) is the one case where the row count is information.
    expect(sectionsFile()).toMatch(/if \(!isSumMetric\(key\)\) return undefined/u)
    expect(sectionsFile()).toMatch(/\? "row" : "rows"/u)
  })

  it("draws each chart the template asks for, in the unit the module declares", () => {
    expect(sectionsFile()).toMatch(/TEMPLATE_CHARTS\[template\]\.map/u)
    expect(sectionsFile()).toMatch(/chartRows\(aggregate, chart\)/u)
    expect(sectionsFile()).toMatch(/const unit = CHART_UNIT\[chart\]/u)
    expect(sectionsFile()).toMatch(
      /unit === "time" \? formatMinutes\(Number\(value\)\) : String\(value\)/u,
    )
    expect(sectionsFile()).toMatch(/dataKey="value"/u)
    expect(sectionsFile()).toMatch(/fill=\{cell\.fill\}/u)
    // The strip and the charts both follow the template, so no template can lose its own figures.
    for (const template of REPORT_TEMPLATES) {
      expect(TEMPLATE_METRICS[template].length).toBeGreaterThan(0)
      expect(TEMPLATE_CHARTS[template].length).toBeGreaterThan(0)
    }
    // Every chart in the vocabulary has a declared measure, so a new ChartKey cannot draw a
    // tooltip with an undefined unit word.
    for (const chart of CHART_KEYS) expect(CHART_UNIT[chart]).toBeTruthy()
  })

  it("prints the ids behind a bar under one disclosure, like the row cards", () => {
    expect(sectionsFile()).toMatch(/<details/u)
    expect(sectionsFile()).toMatch(/\{datum\.refs\.join\(" · "\)\}/u)
    expect(sectionsFile()).toMatch(/\{datum\.label\} — \{datum\.display\}/u)
    expect(sectionsFile()).toMatch(/Which rows make these bars\?/u)
  })

  it("keeps the server-owned card free of a text box and names the source of its numbers", () => {
    // `metrics` is a server section: readContent refuses prose for it, so an editor here would be
    // a field that can be typed into and never saved.
    expect(codeOnly(sectionsFile())).not.toMatch(/<ProseSection section="metrics"/u)
    // Only the two computed cards state where their figures came from, and both of them must.
    expect(client().match(/sourceLabel=\{SOURCE_LABEL\[source\]\}/gu)).toHaveLength(2)
  })
})

describe("the list rows carry the lifecycle, like the work log", () => {
  const listSlice = () => {
    const code = sectionsFile()
    return code.slice(code.indexOf("export function MyReportsSection"), code.indexOf("export function Stat"))
  }

  it("gives a draft row Submit and Delete, and a filed row Revise", () => {
    const list = listSlice()
    expect(list).toMatch(/onSubmit: \(id: number\) => void/u)
    expect(list).toMatch(/onRevise: \(id: number\) => void/u)
    expect(list).toMatch(/onDelete: \(report: ReportDto\) => void/u)
    expect(list).toMatch(/report\.status === "draft" \?/u)
    expect(list).toMatch(/aria-label=\{`Submit \$\{report\.title\}`\}/u)
    expect(list).toMatch(/aria-label=\{`Delete \$\{report\.title\}`\}/u)
    expect(list).toMatch(/aria-label=\{`Revise \$\{report\.title\}`\}/u)
  })

  it("offers a first report from the empty state, but not from an empty search", () => {
    const list = listSlice()
    expect(list).toMatch(/Create your first report/u)
    expect(list).toMatch(/query\.trim\(\) === ""/u)
    expect(list).toMatch(/onCreate: \(\) => void/u)
  })

  it("routes every row action through the same write paths as the toolbar", () => {
    expect(client()).toMatch(/const \[submitTarget, setSubmitTarget\] = useState<ReportDto \| null>\(null\)/u)
    expect(client()).toMatch(
      /onSubmit=\{\(id\) => setSubmitTarget\(reports\.find\(\(item\) => item\.id === id\) \?\? null\)\}/u,
    )
    expect(client()).toMatch(/onRevise=\{\(id\) => void reviseReport\(id\)\}/u)
    expect(client()).toMatch(/onDelete=\{setPendingDelete\}/u)
    expect(client()).toMatch(/onCreate=\{\(\) => setNewOpen\(true\)\}/u)
  })

  it("revises by id and lands in the builder on the new draft", () => {
    expect(client()).toMatch(/const reviseReport = useCallback\(async \(id: number\)/u)
    expect(client()).toMatch(/patchState\(\{ view: "build", reportId: newReport\.id \}\)/u)
  })

  it("submits the row the member chose, not whichever report the builder holds", () => {
    expect(client()).toMatch(/if \(!submitTarget\) return/u)
    expect(client()).toMatch(/\/api\/reports\/work\/\$\{submitTarget\.id\}\/submit/u)
  })

  it("deleting a row that is not open leaves the builder alone", () => {
    expect(client()).toMatch(/if \(pendingDelete\.id === state\.reportId\)/u)
  })

  it("switches views with the shared labels, and the toolbar follows the view", () => {
    expect(client()).toMatch(/REPORT_VIEWS\.map\(\(view\) =>/u)
    expect(client()).toMatch(/REPORT_VIEW_LABEL\[view\]/u)
    expect(client()).toMatch(/patchState\(\{ view \}\)/u)
    // Once for the section grid, once for the toolbar: the list view must not carry five
    // disabled builder buttons.
    expect((codeOnly(client()).match(/state\.view === "build"/gu) ?? []).length).toBeGreaterThanOrEqual(2)
  })

  it("keeps the submit dialog on the shared Dialog primitive, and it never spins forever", () => {
    expect(dialogsFile()).toMatch(/export function SubmitReportDialog/u)
    expect(codeOnly(client())).not.toMatch(/function SubmitDialog/u)
    expect(dialogsFile()).toMatch(/from "@\/components\/ui\/checkbox"/u)
    const submit = dialogsFile().slice(dialogsFile().indexOf("export function SubmitReportDialog"))
    // The hand-rolled overlay's Promise.all had no catch: one failed fetch left the member
    // staring at skeletons with no way out but Cancel.
    expect(submit).toMatch(/catch/u)
    expect(submit).toMatch(/finally/u)
    expect(submit).toMatch(/No team members/u)
    expect(submit).toMatch(/<Checkbox/u)
  })
})

describe("the finished phase 3", () => {
  const pageSource = () =>
    ["page.tsx", "reports-client.tsx", "sections.tsx", "dialogs.tsx", "overview.tsx"]
      .map((name) => src(`app/dashboard/reports-work/${name}`))
      .join("\n")
  const routeSource = () =>
    [
      "app/api/reports/work/route.ts",
      "app/api/reports/work/preview/route.ts",
      "app/api/reports/work/[id]/route.ts",
      "app/api/reports/work/[id]/recompute/route.ts",
      "app/api/reports/work/_shared.ts",
    ]
      .map((name) => src(name))
      .join("\n")

  it("gives every section of every template a card", () => {
    for (const template of REPORT_TEMPLATES) {
      for (const key of sectionsFor(template)) {
        expect(client(), `sectionNodes has no ${key} entry`).toMatch(
          new RegExp(`^\\s+${key}: `, "mu"),
        )
      }
    }
    // …and nothing outside the declared vocabulary crept in.
    for (const section of REPORT_SECTIONS) expect(SECTION_TITLE[section.key]).toBeTruthy()
  })

  it("is twelve cards, which is the owner's 10-14 rule", () => {
    expect(client().match(/row\("/gu)).toHaveLength(6)
    for (const key of ["header", "summary", "metrics", "notes"])
      expect(client()).toMatch(new RegExp(`^\\s+${key}: \\($`, "mu"))
    expect(client()).toMatch(/<PeriodSection/u)
    expect(client()).toMatch(/<MyReportsSection/u)
    // Six card components serve ten sections: `ProseSection` twice, `RowSection` six times.
    expect(codeOnly(sectionsFile()).match(/<SectionCard/gu)).toHaveLength(6)
  })

  it("gives every editable section an editor", () => {
    expect(PROSE_SECTIONS).toHaveLength(8)
    for (const key of PROSE_SECTIONS) {
      const typed = new RegExp(`section="${key}"`, "u").test(client())
      const commented = client().includes(`row("${key}")`)
      expect(typed || commented, `${key} has no place to type`).toBe(true)
    }
  })

  it("exports no component that nothing renders", () => {
    // Phase 2's lesson: an exported card with no caller survives a review and dies a phase later.
    const names = [
      ...sectionsFile().matchAll(/^export function (\w+)/gmu),
      ...dialogsFile().matchAll(/^export function (\w+)/gmu),
      ...overviewFile().matchAll(/^export function (\w+)/gmu),
    ].map((match) => match[1])
    expect(names.length).toBeGreaterThan(10)
    const all = pageSource()
    for (const name of names) {
      const uses = (all.match(new RegExp(`\\b${name}\\b`, "gu")) ?? []).length
      expect(uses, `${name} is exported but never rendered`).toBeGreaterThan(1)
    }
  })

  it("leaves the later phases absent rather than half-built", () => {
    const code = codeOnly(pageSource() + routeSource())
    // Phase 5's CSV export and phase 9's prose AI.
    expect(code).not.toMatch(/gemini|Draft summary|Polish this section|responseSchema/iu)
    expect(code).not.toMatch(/application\/(pdf|xlsx|vnd\.openxmlformats)|jsPDF|toPdf/u)
    // The refusal is affirmative too: editing a non-draft is rejected, not ignored.
    expect(code).toMatch(/isDraft/u)
  })

  it("has no dead control and links only to pages that exist", () => {
    const code = codeOnly(pageSource())
    expect(code).not.toMatch(/href="#"/u)
    expect(code).not.toMatch(/onClick=\{\(\) => \{\s*\}\}/u)
    expect(code).not.toMatch(/console\.log|TODO|FIXME|window\.(alert|confirm|prompt)\s*\(/u)
    expect(codeOnly(routeSource())).not.toMatch(/console\.log|TODO|FIXME|Response\("stub/u)
    expect(code).not.toMatch(/dashboard\/planner|dashboard\/deliverables|dashboard\/tasks\/\$\{|reports-work\/inbox/u)
    // Every out-link from a report is a work-log filter built by one of the two helpers.
    expect(code).toMatch(/worklogHref\(period, section\)/u)
    expect(code).toMatch(/refHref\(row\.ref, period\)/u)
  })

  it("records this phase in the three docs and the spec", () => {
    expect(src("FEATURES.md")).toMatch(/## 9\. Period work reports \(phase 3, 2026-10-26\)/u)
    expect(src("DESIGN_SYSTEM.md")).toMatch(/## 12\. Period work reports.*phase 3 2026-10-26\)/u)
    expect(src("PLACEHOLDERS.md")).toMatch(/## 8\. Period work reports.*no new placeholder/u)
    const spec = src(
      "docs/superpowers/specs/2026-10-26-worklog-reports-planner-assistant-design.md",
    )
    expect(spec).toMatch(/3\. \*\*Reports\*\* \*\(shipped 2026-10-26\)\*/u)
    // The three sentences that pointed at this phase as future work are gone.
    expect(src("FEATURES.md")).not.toMatch(/"Group into report draft" \(phase 3\)/u)
    expect(src("PLACEHOLDERS.md")).not.toMatch(/No "Group into report draft" in the bulk bar/u)
    expect(spec).not.toMatch(/\*\*"group into a report draft" is phase 3/u)
    expect(spec).toMatch(/\*\*Lifecycle\*\* \*\(phase 4\)\*/u)
  })
})
