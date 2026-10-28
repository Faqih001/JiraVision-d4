import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")
const codeOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

const wizard = codeOnly(src("app/onboarding/onboarding-wizard.tsx"))
const combobox = codeOnly(src("components/ui/combobox-input.tsx"))

// A native <datalist> is painted by the OS, not the page, so on a dark desktop it opened as a
// black menu at its own width under a light form. The industry field keeps free text but gets a
// list the design system controls.
describe("the industry field uses a themed suggestion list", () => {
  it("no onboarding field falls back to a native datalist", () => {
    expect(wizard).not.toContain("<datalist")
    expect(wizard).not.toMatch(/\blist="industry-suggestions"/)
  })

  it("the primary industry field still accepts anything the user types", () => {
    expect(wizard).toMatch(/<ComboboxInput[\s\S]*?onValueChange=/)
    expect(combobox).toMatch(/onChange=\{\(event\) => \{[\s\S]*?onValueChange\(event\.target\.value\)/)
  })

  it("the list sits under the field at the field's width", () => {
    expect(combobox).toContain("absolute inset-x-0 top-full")
  })

  it("the list and its active row use the app's theme tokens", () => {
    expect(combobox).toContain("bg-popover")
    expect(combobox).toContain("text-popover-foreground")
    expect(combobox).toContain("bg-accent text-accent-foreground")
  })

  it("it is announced as a combobox with a list of options", () => {
    expect(combobox).toContain('role="combobox"')
    expect(combobox).toContain('role="listbox"')
    expect(combobox).toContain('role="option"')
    expect(combobox).toContain("aria-activedescendant")
  })

  it("the keyboard can reach and take a suggestion, and Escape closes", () => {
    expect(combobox).toContain('event.key === "ArrowDown"')
    expect(combobox).toContain('event.key === "ArrowUp"')
    expect(combobox).toContain('event.key === "Enter"')
    expect(combobox).toContain('event.key === "Escape"')
  })
})
