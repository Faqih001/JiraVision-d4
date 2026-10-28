import { describe, expect, it } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import path from "node:path"

const repo = path.resolve(__dirname, "..", "..")

// Onboarding replaced its native controls: the industry field's <datalist> became a themed
// ComboboxInput, and every Radix select now opens under the field at the field's width. A native
// <select> hands its menu to the OS, so it renders in the system appearance at the system's own
// width, detached from the field — no product surface should keep one.
function tsxFilesIn(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const absolute = path.join(dir, entry)
    if (statSync(absolute).isDirectory()) out.push(...tsxFilesIn(absolute))
    else if (entry.endsWith(".tsx")) out.push(absolute)
  }
  return out
}

const files = ["app", "components"]
  .flatMap((dir) => tsxFilesIn(path.join(repo, dir)))
  .map((file) => ({
    file: path.relative(repo, file),
    // A JSX attribute is code; the same string can legitimately appear in prose.
    code: readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, ""),
  }))

const source = (relative: string) => files.find(({ file }) => file === relative)

describe("dropdowns use the themed components", () => {
  it("no page renders a native <select>", () => {
    const offenders = files.filter(({ code }) => /<select\b/.test(code)).map(({ file }) => file)
    expect(offenders).toEqual([])
  })

  it("no page renders a native <datalist>", () => {
    const offenders = files.filter(({ code }) => /<datalist\b/.test(code)).map(({ file }) => file)
    expect(offenders).toEqual([])
  })

  it("no free-text field opts back into an OS suggestion list", () => {
    // `list=` on an Input is the <datalist> association attribute.
    const offenders = files
      .filter(({ code }) => /<Input\b[^>]*\blist="[^"]*"/.test(code))
      .map(({ file }) => file)
    expect(offenders).toEqual([])
  })

  it("the agent role-pack picker is a Select over the API's packs", () => {
    const agent = source("app/dashboard/agent/agent-client.tsx")
    expect(agent, "app/dashboard/agent/agent-client.tsx must exist").toBeDefined()
    expect(agent!.code).toContain('from "@/components/ui/select"')
    expect(agent!.code).toMatch(/<Select value=\{packKey\} onValueChange=\{setPackKey\}>/)
    expect(agent!.code).toMatch(/<SelectItem key=\{pack\.packKey\} value=\{pack\.packKey\}>/)
  })

  it("the templates sort control keeps the pill and uses Select", () => {
    const library = source("app/(marketing)/templates/templates-library.tsx")
    expect(library, "the templates library must exist").toBeDefined()
    expect(library!.code).toContain('from "@/components/ui/select"')
    expect(library!.code).toMatch(/<SelectTrigger[^>]*rounded-full/)
    expect(library!.code).toContain('<SelectItem value="category">')
    expect(library!.code).toContain('<SelectItem value="title">')
  })

  it("the template request form uses a non-empty sentinel for 'not sure'", () => {
    const request = source("app/(marketing)/templates/template-request-form.tsx")
    expect(request, "the request form must exist").toBeDefined()
    expect(request!.code).toContain('const NOT_SURE = "not-sure"')
    expect(request!.code).toMatch(/<SelectItem value=\{NOT_SURE\}>/)
  })
})
