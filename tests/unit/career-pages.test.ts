import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")
const codeOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

describe("member career page", () => {
  const page = codeOnly(src("app/dashboard/career/page.tsx"))
  const disciplinePage = codeOnly(src("app/dashboard/career/[discipline]/page.tsx"))
  const client = codeOnly(src("app/dashboard/career/career-client.tsx"))
  const panel = codeOnly(src("app/dashboard/career/readiness-panel.tsx"))

  it("is a Suspense shell that never touches the database", () => {
    for (const source of [page, disciplinePage]) {
      expect(source).toMatch(/Suspense/)
      expect(source).toMatch(/CareerSkeleton/)
      expect(source).not.toMatch(/@\/lib\/db|drizzle/)
    }
  })

  it("passes the discipline through from the route param", () => {
    expect(disciplinePage).toMatch(/await params/)
    expect(disciplinePage).toMatch(/isLadderDiscipline\(discipline\)/)
    expect(disciplinePage).toMatch(/<CareerClient discipline=\{discipline\} \/>/)
  })

  it("reads the profile and submits requests through the API", () => {
    expect(client).toMatch(/fetch\(`\/api\/career\/me/)
    expect(client).toMatch(/fetch\("\/api\/career\/requests"/)
  })

  it("never recomputes the percentage in the browser", () => {
    expect(client).not.toMatch(/computeReadiness|countCareerSignals/)
    expect(panel).not.toMatch(/computeReadiness|countCareerSignals/)
    expect(panel).not.toMatch(/0\.7\s*\*|0\.3\s*\*/)
  })

  it("drills a signal down to the counted rows", () => {
    expect(panel).toMatch(/fetch\(`\/api\/career\/me\/evidence/)
    expect(panel).toMatch(/Nothing counted in this window/)
  })

  it("says the band is unpublished until a real range exists", () => {
    expect(panel).toMatch(/Band not published/)
    expect(panel).toMatch(/!band\.published/)
  })

  it("gates the admin link on the server's admin flag", () => {
    expect(client).toMatch(/\{data\.admin \?/)
    expect(client).toMatch(/href="\/admin\/career"/)
  })

  it("explains every request state", () => {
    expect(client).toMatch(/Awaiting review since/)
    expect(client).toMatch(/You are at the top of this ladder\./)
    expect(client).toMatch(/Request promotion to/)
    expect(client).toMatch(/latest\?\.status === "returned"/)
  })

  it("is reachable from the dashboard navigation", () => {
    const layout = codeOnly(src("components/dashboard-layout.tsx"))
    expect(layout).toMatch(/title: "Career"/)
    expect(layout).toMatch(/href: "\/dashboard\/career"/)
    expect(layout).toMatch(/pathname\.startsWith\("\/dashboard\/career\/"\)/)
  })
})

describe("admin career page", () => {
  const page = codeOnly(src("app/admin/career/page.tsx"))
  const ladder = codeOnly(src("app/admin/career/ladder-editor.tsx"))
  const placements = codeOnly(src("app/admin/career/placement-panel.tsx"))
  const queue = codeOnly(src("app/admin/career/review-queue.tsx"))

  it("reads the full ladder and shows the access wall on 401 and 403", () => {
    expect(page).toMatch(/fetch\("\/api\/career\/levels\?all=1"\)/)
    expect(page).toMatch(/res\.status === 401/)
    expect(page).toMatch(/res\.status === 403/)
    expect(page).toMatch(/Super-admin access required/)
  })

  it("renders the three panels", () => {
    expect(page).toMatch(/<LadderEditor levels=\{levels\} onSaved=\{handleSaved\} \/>/)
    expect(page).toMatch(/<PlacementPanel \/>/)
    expect(page).toMatch(/<ReviewQueue \/>/)
  })

  it("saves a rung through PATCH and repeats the server's error", () => {
    expect(ladder).toMatch(/method: "PATCH"/)
    expect(ladder).toMatch(/\/api\/career\/levels\/\$\{rung\.id\}/)
    expect(ladder).toMatch(/json\?\.error/)
    expect(ladder).toMatch(/Blank means unpublished/)
    expect(ladder).toMatch(/CAREER_SIGNALS\.map/)
    expect(ladder).toMatch(/isActive: draft\.isActive/)
  })

  it("places a member and ticks their checklist, showing who signed", () => {
    expect(placements).toMatch(/fetch\("\/api\/career\/placements"/)
    expect(placements).toMatch(/\/api\/career\/signoffs\?\$\{qs\.toString\(\)\}/)
    expect(placements).toMatch(/fetch\("\/api\/career\/signoffs"/)
    expect(placements).toMatch(/levelId: rung\.levelId/)
    expect(placements).toMatch(/tickedByName/)
    expect(placements).toMatch(/item\.status === "ticked"/)
    expect(placements).toMatch(/item\.status === "declined"/)
  })

  it("reviews the frozen snapshot without recomputing it", () => {
    expect(queue).toMatch(/fetch\("\/api\/career\/requests"\)/)
    expect(queue).toMatch(/\/api\/career\/requests\/\$\{row\.id\}\/\$\{action\}/)
    expect(queue).toMatch(/evidence\.readiness/)
    expect(queue).toMatch(/capReason/)
    expect(queue).toMatch(/refs\[signal\.key\]/)
    expect(queue).toMatch(/A note is required to return a request\./)
    expect(queue).not.toMatch(/computeReadiness|countCareerSignals/)
    expect(queue).not.toMatch(/0\.7\s*\*|0\.3\s*\*/)
  })
})
