import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"

const repo = path.resolve(__dirname, "..", "..")
const select = readFileSync(path.join(repo, "components/ui/select.tsx"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/[^\n]*/g, "")

// The onboarding grid puts two selects side by side at 640px and stacks them below it, and every
// filter bar on the dashboard needs its dropdown to read as that field's list. So the menu stays
// pinned below the field and at least as wide as it — but it hugs its longest option, because a
// closed list that reads "Recently updat…" is the one defect the narrow field cannot show.
describe("Select dropdowns sit under the field and show their whole option", () => {
  it("never flips away from the bottom", () => {
    expect(select).toMatch(/side="bottom"/)
    expect(select).toMatch(/avoidCollisions=\{false\}/)
  })

  it("is at least as wide as its trigger and as wide as its longest option", () => {
    expect(select).toContain("min-w-[max(8rem,var(--radix-select-trigger-width))]")
    expect(select).toContain("w-max")
  })

  it("is never wider than the screen can hold", () => {
    expect(select).toContain("max-w-[min(30rem,calc(100vw-3rem))]")
  })

  it("has no rule left that would pin the menu to the trigger width again", () => {
    expect(select).not.toMatch(/(^|[^-])\bw-\[var\(--radix-select-trigger-width\)\]/)
    expect(select).not.toContain("min-w-[var(--radix-select-trigger-width)]")
  })

  it("caps its height to the space left on screen instead of flipping", () => {
    expect(select).toContain("max-h-[min(24rem,var(--radix-select-content-available-height))]")
  })

  it("keeps every option on one line, in the menu and in the closed field", () => {
    expect(select).toMatch(/<SelectPrimitive\.ItemText[^>]*className="[^"]*\btruncate\b/)
    expect(select).toMatch(/whitespace-nowrap/)
    expect(select).toMatch(/\[&>span\]:truncate/)
    expect(select).not.toMatch(/line-clamp/)
  })

  it("never pushes the chevron out of the field to fit one long value", () => {
    expect(select).toMatch(/\[&_svg\]:shrink-0/)
  })

  it("leaves the viewport height to the content cap so the list scrolls", () => {
    // A fixed height here is a height on a flex child whose inline `flex: 1` wins anyway; it
    // only makes the rule look load-bearing.
    expect(select).not.toContain("h-[var(--radix-select-trigger-height)]")
  })
})
