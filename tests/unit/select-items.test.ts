import { describe, expect, it } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import path from "node:path"

const repo = path.resolve(__dirname, "..", "..")

// Radix throws `A <Select.Item /> must have a value prop that is not an empty
// string` from inside ItemDescriptor, which is mounted as soon as the Select is.
// An empty value is therefore not a bad selection — it is a render crash that
// takes the whole route into the error boundary. "" is reserved for the Root,
// where it means "show the placeholder"; "no sprint"/"no assignee" need a
// non-empty sentinel (see BACKLOG in app/dashboard/page.tsx).
function tsxFilesIn(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const absolute = path.join(dir, entry)
    if (statSync(absolute).isDirectory()) out.push(...tsxFilesIn(absolute))
    else if (entry.endsWith(".tsx")) out.push(absolute)
  }
  return out
}

const sources = ["app", "components"]
  .flatMap((dir) => tsxFilesIn(path.join(repo, dir)))
  .map((file) => ({
    file: path.relative(repo, file),
    // A JSX attribute is code; the same string can legitimately appear in prose.
    code: readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, ""),
  }))

describe("Select items never carry an empty value", () => {
  it("no <SelectItem> is written with value=\"\"", () => {
    const offenders = sources
      .filter(({ code }) => /<SelectItem\b[^>]*value=""/.test(code))
      .map(({ file }) => file)
    expect(offenders).toEqual([])
  })

  it("no <SelectItem> is written with value=''", () => {
    const offenders = sources
      .filter(({ code }) => /<SelectItem\b[^>]*value=''/.test(code))
      .map(({ file }) => file)
    expect(offenders).toEqual([])
  })

  it("a Select Root is never fed a value known to be empty", () => {
    // value="" on the Root is legal, so this only guards the hardcoded case
    // where a trigger can never fall back to its placeholder label.
    const offenders = sources
      .filter(({ code }) => /<Select\b[^>]*\bvalue=""/.test(code))
      .map(({ file }) => file)
    expect(offenders).toEqual([])
  })

  it("the backlog sentinel used for 'no sprint' is a non-empty literal", () => {
    const source = readFileSync(path.join(repo, "app/dashboard/page.tsx"), "utf8")
    const declaration = /const BACKLOG = "([^"]*)"/.exec(source)
    expect(declaration, "app/dashboard/page.tsx must declare a BACKLOG sentinel").not.toBeNull()
    expect(declaration![1]).not.toBe("")
    expect(source).toContain("<SelectItem value={BACKLOG}>")
  })
})
