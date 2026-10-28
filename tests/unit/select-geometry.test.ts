import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"

const repo = path.resolve(__dirname, "..", "..")
const select = readFileSync(path.join(repo, "components/ui/select.tsx"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/[^\n]*/g, "")

// The onboarding grid puts two selects side by side at 640px and stacks them below it. A popper
// that flips above the field or widens to its longest option is the wrong list for the field it
// belongs to, so the geometry is pinned here rather than discovered per breakpoint.
describe("Select dropdowns sit under the field at the field's width", () => {
  it("never flips away from the bottom", () => {
    expect(select).toMatch(/side="bottom"/)
    expect(select).toMatch(/avoidCollisions=\{false\}/)
  })

  it("is exactly as wide as its trigger when it is a popper", () => {
    expect(select).toContain("w-[var(--radix-select-trigger-width)]")
  })

  it("caps its height to the space left on screen instead of flipping", () => {
    expect(select).toContain("max-h-[min(24rem,var(--radix-select-content-available-height))]")
  })

  it("lets a long option truncate rather than widen the list", () => {
    expect(select).toMatch(/<SelectPrimitive\.ItemText[^>]*className="[^"]*\btruncate\b/)
  })

  it("leaves the viewport height to the content cap so the list scrolls", () => {
    // A fixed height here is a height on a flex child whose inline `flex: 1` wins anyway; it
    // only makes the rule look load-bearing.
    expect(select).not.toContain("h-[var(--radix-select-trigger-height)]")
  })
})
