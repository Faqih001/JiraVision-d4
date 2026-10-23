import { describe, expect, it } from "vitest"

import { searchIndex, type SearchGroup } from "@/content/search-index"

const VALID_GROUPS: SearchGroup[] = [
  "Pages",
  "Products",
  "Solutions",
  "Resources",
  "Blog",
  "FAQ",
  "Changelog",
]

describe("searchIndex integrity", () => {
  it("is a non-empty corpus", () => {
    expect(searchIndex.length).toBeGreaterThan(20)
  })

  it("every entry has a non-empty, non-placeholder href", () => {
    for (const entry of searchIndex) {
      expect(typeof entry.href).toBe("string")
      expect(entry.href.trim().length).toBeGreaterThan(0)
      expect(entry.href).not.toBe("#")
      expect(entry.href.startsWith("/")).toBe(true)
    }
  })

  it("every entry belongs to a documented group with non-empty title", () => {
    for (const entry of searchIndex) {
      expect(VALID_GROUPS).toContain(entry.group)
      expect(entry.title.trim().length).toBeGreaterThan(0)
      expect(entry.subtitle.trim().length).toBeGreaterThan(0)
    }
  })

  it("no (title, href) pair is duplicated", () => {
    const keys = searchIndex.map((e) => `${e.title}|${e.href}`)
    expect(new Set(keys).size).toBe(keys.length)
  })
})
