import { describe, expect, it } from "vitest"
import { searchIndex, type SearchGroup } from "@/content/search-index"

const groups: SearchGroup[] = ["Pages", "Products", "Solutions", "Resources", "Blog", "FAQ", "Changelog"]

describe("search index integrity", () => {
  it("has entries", () => {
    expect(searchIndex.length).toBeGreaterThan(40)
  })

  it("every entry has a title, a real href and a valid group", () => {
    for (const entry of searchIndex) {
      expect(entry.title.trim().length).toBeGreaterThan(0)
      expect(entry.href.startsWith("/")).toBe(true)
      expect(entry.href).not.toBe("#")
      expect(groups).toContain(entry.group)
    }
  })

  it("no duplicate title+href pairs", () => {
    const keys = searchIndex.map((e) => `${e.title}|${e.href}`)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it("FAQ deep links carry a query", () => {
    const faq = searchIndex.filter((e) => e.group === "FAQ")
    expect(faq.length).toBeGreaterThanOrEqual(30)
    expect(faq.every((e) => e.href.startsWith("/faq?q="))).toBe(true)
  })
})
