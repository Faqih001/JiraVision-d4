import { describe, expect, it } from "vitest"
import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"

const repo = path.resolve(__dirname, "..", "..")
const src = (relative: string) => readFileSync(path.join(repo, relative), "utf8")

/** Every file under the given directories, so a new AI module cannot escape the guard. */
function filesUnder(relative: string): string[] {
  const out: string[] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(path.join(repo, dir))) {
      const child = path.join(dir, entry)
      if (statSync(path.join(repo, child)).isDirectory()) walk(child)
      else if (child.endsWith(".ts") || child.endsWith(".tsx")) out.push(child)
    }
  }
  walk(relative)
  return out
}

describe("AI configuration is documented", () => {
  const aiFiles = [
    ...filesUnder("lib/ai"),
    ...filesUnder("lib/assistant"),
    ...filesUnder("app/api/assistant"),
    ...filesUnder("app/api/planner"),
    ...filesUnder("app/api/ai"),
    "app/api/dashboard/ai-recommendation/route.ts",
  ]

  it("reads only environment variables that .env.example documents", () => {
    const example = src(".env.example")
    const used = new Set<string>()
    for (const file of aiFiles) {
      for (const match of src(file).matchAll(/process\.env\.([A-Z0-9_]+)/gu)) used.add(match[1])
    }
    expect(used.size).toBeGreaterThan(0)
    const undocumented = [...used].filter((name) => !new RegExp(`^${name}=`, "mu").test(example))
    expect(undocumented).toEqual([])
  })

  it("tells the operator where to get the key, not just that one is needed", () => {
    expect(src(".env.example")).toMatch(/https:\/\/aistudio\.google\.com\/apikey/u)
  })
})

describe("the README's AI section", () => {
  const readme = () => src("README.md")

  it("names the one module that talks to the provider", () => {
    expect(readme()).toMatch(/lib\/ai\/gemini\.ts/u)
  })

  it("lists every env var the AI code reads", () => {
    for (const name of ["GOOGLE_GEMINI_API_KEY", "GEMINI_MODEL", "AI_PUBLIC_DAILY_CAP"]) {
      expect(readme()).toContain(name)
    }
  })

  it("points at routes that exist", () => {
    for (const match of readme().matchAll(/(POST|GET) (\/api\/[a-z0-9\/-]+)/gu)) {
      const routePath = match[2].replace(/\/+$/u, "")
      expect(
        ["route.ts", "route.tsx"].some((file) => {
          try {
            src(`app${routePath}/${file}`)
            return true
          } catch {
            return false
          }
        }),
        `${match[1]} ${routePath} is documented but has no route file`,
      ).toBe(true)
    }
  })

  it("states the rule that keeps a machine answer from inventing numbers", () => {
    expect(readme()).toMatch(/No invented numbers/u)
    expect(readme()).toMatch(/503\/422/u)
  })

  it("names the legal section that carries the same promise to visitors", () => {
    expect(readme()).toContain("ai-assistant-answers")
    expect(src("content/legal.ts")).toContain('id: "ai-assistant-answers"')
  })
})
