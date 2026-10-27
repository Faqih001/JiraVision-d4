import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"

const repo = path.resolve(__dirname, "..", "..")
const route = () => readFileSync(path.join(repo, "app/api/dashboard/ai-recommendation/route.ts"), "utf8")

/** Comment-stripped: a guard about the route cannot be satisfied by a sentence in a comment. */
function codeOnly(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/^\s*\/\/.*$/gmu, "")
}

describe("the AI scrum master recommendation route", () => {
  it("is gated on a session", () => {
    expect(route()).toMatch(/await getSession\(\)/u)
    expect(route()).toMatch(/status: 401/u)
  })

  it("no longer carries the five canned strings it used to pick at random", () => {
    const body = codeOnly(route())
    expect(body).not.toMatch(/reducing the sprint commitment by 15%/u)
    expect(body).not.toMatch(/delivering 20% more story points/u)
    expect(body).not.toMatch(/redistributing 2-3 tasks from Alex/u)
    expect(body).not.toMatch(/allocating 20% of the next sprint/u)
    expect(body).not.toMatch(/retrospective focused on work-life balance/u)
    expect(body).not.toMatch(/Math\.random\(\)/u)
  })

  it("goes through the one module that knows the provider", () => {
    expect(route()).toMatch(/from "@\/lib\/ai\/gemini"/u)
    expect(route()).toMatch(/await geminiText\(/u)
    expect(route()).not.toMatch(/generativelanguage\.googleapis\.com/u)
  })

  it("reads the sprint's own rows and refuses to guess when there are none", () => {
    expect(route()).toMatch(/from\(sprints\)/u)
    expect(route()).toMatch(/from\(tasks\)/u)
    expect(route()).toMatch(/if \(!sprint\) throw new Error\("Sprint not found"\)/u)
    expect(route()).toMatch(/throw new Error\("Sprint has no tasks to analyze"\)/u)
  })

  it("feeds the model real numbers and forbids invented ones", () => {
    expect(route()).toMatch(/Never invent a metric, a name or a date\./u)
    expect(route()).toMatch(/\$\{totalPoints\} points across \$\{sprintTasks\.length\} tasks/u)
    expect(route()).toMatch(/const totalPoints = sprintTasks\.reduce/u)
  })

  it("reports a provider failure honestly instead of dressing it up as advice", () => {
    expect(route()).toMatch(/error instanceof GeminiError/u)
    expect(route()).toMatch(/status: 503/u)
    expect(route()).toMatch(/status: 422/u)
  })

  it("names the rule engine in every fallback, so the caller knows there is a non-AI way forward", () => {
    const kinds = ["auth", "quota", "timeout", "blocked", "transport", "badjson"]
    for (const kind of kinds) {
      const line = route().match(new RegExp(`^\\s*${kind}: ".*"`, "mu"))?.[0]
      expect(line, `${kind} has no fallback message`).toBeTruthy()
      expect(line).toMatch(/rule engine/u)
    }
  })

  it("still stores a client-computed recommendation verbatim, because the rule engine stays primary", () => {
    const body = codeOnly(route())
    expect(body).toMatch(/if \(!insightDescription\) \{/u)
    expect(body).toMatch(/insightDescription = generated\.description/u)
    expect(body).toMatch(/description: insightDescription!/u)
  })

  it("expires the insight, so stale advice does not sit in the dashboard forever", () => {
    expect(route()).toMatch(/expiresAt: new Date\(Date\.now\(\) \+ 7 \* 24 \* 60 \* 60 \* 1000\)/u)
  })
})
