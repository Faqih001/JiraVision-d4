import { describe, expect, it } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import path from "node:path"

const repo = path.resolve(__dirname, "..", "..")

// Onboarding replaced its native controls: the industry field's <datalist> became a themed
// ComboboxInput, and every Radix select now opens under the field at the field's width. A native
// <select> hands its menu to the OS, so no dashboard page should keep one — it renders in the
// system appearance, at the system's own width, detached from the field it belongs to.
function tsxFilesIn(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const absolute = path.join(dir, entry)
    if (statSync(absolute).isDirectory()) out.push(...tsxFilesIn(absolute))
    else if (entry.endsWith(".tsx")) out.push(absolute)
  }
  return out
}

const files = tsxFilesIn(path.join(repo, "app", "dashboard")).map((file) => ({
  file: path.relative(repo, file),
  code: readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, ""),
}))

describe("dashboard dropdowns use the themed components", () => {
  it("no dashboard page renders a native <select>", () => {
    const offenders = files.filter(({ code }) => /<select\b/.test(code)).map(({ file }) => file)
    expect(offenders).toEqual([])
  })

  it("no dashboard page renders a native <datalist>", () => {
    const offenders = files.filter(({ code }) => /<datalist\b/.test(code)).map(({ file }) => file)
    expect(offenders).toEqual([])
  })

  it("the agent role-pack picker is a Select over the API's packs", () => {
    const agent = files.find(({ file }) => file.endsWith("agent/agent-client.tsx"))
    expect(agent, "app/dashboard/agent/agent-client.tsx must exist").toBeDefined()
    expect(agent!.code).toContain(
      'from "@/components/ui/select"',
    )
    expect(agent!.code).toMatch(/<Select value=\{packKey\} onValueChange=\{setPackKey\}>/)
    expect(agent!.code).toMatch(/<SelectItem key=\{pack\.packKey\} value=\{pack\.packKey\}>/)
  })

  it("a free-text field with suggestions uses ComboboxInput, not an OS list", () => {
    // `list=` on an Input is the <datalist> association attribute; nothing in the dashboard
    // should opt back into an OS-drawn suggestion list.
    const offenders = files
      .filter(({ code }) => /<Input\b[^>]*\blist="[^"]*"/.test(code))
      .map(({ file }) => file)
    expect(offenders).toEqual([])
  })
})
