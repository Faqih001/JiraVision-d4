import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"
import { assistantLink, dayQuestion, periodQuestion } from "@/lib/assistant/ask"

const repo = path.resolve(__dirname, "..", "..")
const src = (relative: string) => readFileSync(path.join(repo, relative), "utf8")

/** Comment-stripped: a guard about the wiring cannot be satisfied by a sentence in a comment. */
function codeOnly(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/^\s*\/\/.*$/gmu, "")
}

describe("the pre-scoped questions", () => {
  it("encodes the question, so a space or a question mark survives the URL", () => {
    expect(assistantLink("What did I do?")).toBe("/dashboard/assistant?q=What%20did%20I%20do%3F")
  })

  it("names the period and its span, because the assistant is not told which period is meant", () => {
    expect(periodQuestion("2026-W43", "2026-10-19", "2026-10-25")).toBe(
      "Summarise my work for 2026-W43 (2026-10-19 to 2026-10-25): the hours I logged, what I delivered, and what is still open.",
    )
  })

  it("collapses a one-day period to a single date rather than a range that repeats itself", () => {
    expect(periodQuestion("2026-10-27", "2026-10-27", "2026-10-27")).toContain("(2026-10-27)")
    expect(periodQuestion("2026-10-27", "2026-10-27", "2026-10-27")).not.toContain("to 2026-10-27")
  })

  it("asks about the day the member is looking at", () => {
    expect(dayQuestion("2026-10-27")).toBe(
      "What did I do on 2026-10-27? List the hours I logged, the deliverables and the tasks that moved.",
    )
  })

  it("never asks for a number the work log cannot supply", () => {
    for (const question of [periodQuestion("2026-W43", "2026-10-19", "2026-10-25"), dayQuestion("2026-10-27")]) {
      expect(question).not.toMatch(/predict|forecast|estimate how long/u)
    }
  })
})

describe("the assistant page's ?q= deep link", () => {
  const client = () => codeOnly(src("app/dashboard/assistant/assistant-client.tsx"))

  it("reads the question from the query string", () => {
    expect(client()).toMatch(/searchParams\.get\("q"\)/u)
  })

  it("asks it once, so a re-render of the effect cannot ask the same question twice", () => {
    expect(client()).toMatch(/autoSentRef\.current = true/u)
    expect(client()).toMatch(/if \(!question \|\| autoSentRef\.current\) return/u)
  })

  it("drops the param afterwards, so a refresh does not re-ask it", () => {
    expect(client()).toMatch(/router\.replace\("\/dashboard\/assistant", \{ scroll: false \}\)/u)
  })

  it("sends through the same path as a typed question", () => {
    expect(client()).toMatch(/const sendQuestion = useCallback\(/u)
    expect(client()).toMatch(/void sendQuestion\(question\)/u)
    // handleSend is the input's handler; it delegates rather than carrying its own fetch.
    expect(client().match(/fetch\("\/api\/assistant\/workspace"/gu)).toHaveLength(1)
  })
})

describe("the two entry points that pre-scope a question", () => {
  const reports = () => codeOnly(src("app/dashboard/reports-work/reports-client.tsx"))
  const worklog = () => codeOnly(src("app/dashboard/worklog/worklog-client.tsx"))

  it("builds the link with the shared helper rather than hand-encoding a query string", () => {
    for (const file of [reports(), worklog()]) {
      expect(file).toMatch(/assistantLink\(/u)
      expect(file).not.toMatch(/\/dashboard\/assistant\?q=/u)
    }
  })

  it("asks about the period the builder is showing, not the browser's idea of this week", () => {
    expect(reports()).toMatch(/periodQuestion\(shownPeriod\.label, shownPeriod\.start, shownPeriod\.end\)/u)
    expect(reports()).toMatch(/Ask the assistant about \{shownPeriod\.label\}/u)
  })

  it("asks about the day the work log is showing, which the URL already owns", () => {
    expect(worklog()).toMatch(/dayQuestion\(state\.day\)/u)
    expect(worklog()).toMatch(/Ask about this day/u)
  })
})
