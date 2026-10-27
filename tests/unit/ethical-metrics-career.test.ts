import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")
const codeOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

const route = codeOnly(src("app/api/ethical-metrics/route.ts"))
const page = codeOnly(src("app/dashboard/ethical-metrics/page.tsx"))

describe("ethical metrics read one placement per member", () => {
  it("reads career_placement alongside the other live rows", () => {
    expect(route).toMatch(/careerPlacement/)
    expect(route).toMatch(/\.from\(careerPlacement\)/)
  })

  it("takes the highest rung when a member is placed in more than one discipline", () => {
    expect(route).toMatch(/const careerLevels = new Map<number, number>\(\)/)
    expect(route).toMatch(/Math\.max\(careerLevels\.get\(row\.userId\) \?\? 0, row\.level\)/)
  })

  it("hands the placement to seniorityTierOf as the third argument", () => {
    expect(route).toMatch(/seniorityTierOf\(m\.jobTitle, m\.role, careerLevel\)/)
  })

  it("reports which source decided the band in the payload", () => {
    expect(route).toMatch(/senioritySource: "placement" \| "job_title"/)
    expect(route).toMatch(/senioritySource: senioritySource\(careerLevel\)/)
  })
})

describe("ethical metrics page shows the band's source", () => {
  it("keeps the source on the wire type and on each matrix row", () => {
    expect(page).toMatch(/senioritySource: "placement" \| "job_title"/)
    expect(page).toMatch(/senioritySource: m\.senioritySource/)
  })

  it("prints ladder or job title next to the band", () => {
    expect(page).toMatch(
      /row\.senioritySource === "placement" \? "ladder" : "job title"/,
    )
  })

  it("explains the ladder in the chart note and the honesty notes", () => {
    expect(page).toMatch(/Bands come from the career ladder/)
    expect(page).toMatch(
      /a seniority band comes from the career ladder when an admin has placed the member/,
    )
    expect(page).toMatch(/career_placement/)
  })
})
