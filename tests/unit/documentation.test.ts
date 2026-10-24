import { describe, expect, it } from "vitest"

import {
  docCategories,
  docList,
  docSlugs,
  documentation,
  docsByCategory,
  getDoc,
  readingTime,
  relatedDocs,
  searchDocs,
  slugifyHeading,
} from "@/content/documentation"

describe("catalogue integrity", () => {
  it("has a doc for every category and no orphan category", () => {
    for (const category of docCategories) {
      expect(docsByCategory(category.id).length).toBeGreaterThan(0)
    }
    for (const doc of docList) {
      expect(docCategories.some((category) => category.id === doc.category)).toBe(true)
    }
  })

  it("keys the record by the doc's own slug", () => {
    for (const [key, doc] of Object.entries(documentation)) {
      expect(doc.slug).toBe(key)
    }
    expect(docSlugs()).toHaveLength(docList.length)
    expect(new Set(docSlugs()).size).toBe(docSlugs().length)
  })

  it("gives every doc a title, description and body", () => {
    for (const doc of docList) {
      expect(doc.title.trim().length).toBeGreaterThan(0)
      expect(doc.description.trim().length).toBeGreaterThan(0)
      expect(doc.content.trim().length).toBeGreaterThan(200)
    }
  })

  it("declares only real endpoints", () => {
    for (const doc of docList) {
      for (const endpoint of doc.endpoints ?? []) {
        expect(endpoint.path.startsWith("/api/")).toBe(true)
        expect(endpoint.description.trim().length).toBeGreaterThan(0)
      }
    }
  })

  it("never links to a doc that does not exist", () => {
    const offenders: string[] = []
    for (const doc of docList) {
      for (const match of doc.content.matchAll(/\/resources\/documentation\/([a-z0-9-]+)/g)) {
        if (!documentation[match[1]]) offenders.push(`${doc.slug} -> ${match[1]}`)
      }
    }
    expect(offenders).toEqual([])
  })
})

describe("slugifyHeading", () => {
  it("lowercases and hyphenates", () => {
    expect(slugifyHeading("What you get")).toBe("what-you-get")
  })

  it("drops punctuation but keeps digits", () => {
    expect(slugifyHeading("1. Create your account")).toBe("1-create-your-account")
    expect(slugifyHeading("Tasks — grid and list")).toBe("tasks-grid-and-list")
  })

  it("collapses runs of whitespace", () => {
    expect(slugifyHeading("API   overview")).toBe("api-overview")
  })
})

describe("relatedDocs", () => {
  it("returns existing docs and never the doc itself", () => {
    for (const doc of docList) {
      const related = relatedDocs(doc.slug)
      expect(related.length).toBeGreaterThan(0)
      expect(related.length).toBeLessThanOrEqual(4)
      expect(related.some((entry) => entry.slug === doc.slug)).toBe(false)
      for (const entry of related) expect(documentation[entry.slug]).toBeDefined()
    }
  })

  it("prefers the same category", () => {
    const doc = getDoc("task-fields")!
    const related = relatedDocs(doc.slug)
    expect(related.filter((entry) => entry.category === doc.category).length).toBeGreaterThan(0)
  })

  it("is empty for an unknown slug", () => {
    expect(relatedDocs("does-not-exist")).toEqual([])
  })
})

describe("searchDocs", () => {
  it("returns the whole catalogue for an empty query", () => {
    expect(searchDocs("")).toHaveLength(docList.length)
    expect(searchDocs("   ")).toHaveLength(docList.length)
  })

  it("ranks a title match above a body match", () => {
    const results = searchDocs("rate limits")
    expect(results[0]?.slug).toBe("api-rate-limits")
  })

  it("finds body copy", () => {
    expect(searchDocs("HttpOnly").map((doc) => doc.slug)).toContain("api-authentication")
  })

  it("returns nothing for a term that is not in the catalogue", () => {
    expect(searchDocs("zzzqqq-not-a-term")).toEqual([])
  })
})

describe("readingTime", () => {
  it("is at least a minute and scales with length", () => {
    for (const doc of docList) expect(readingTime(doc)).toBeGreaterThanOrEqual(1)
    const short = getDoc("contact-support")!
    const long = getDoc("api-endpoints")!
    expect(readingTime(long)).toBeGreaterThan(readingTime(short))
  })
})

describe("getDoc", () => {
  it("finds known slugs and returns null otherwise", () => {
    expect(getDoc("quick-start")?.title).toBe("Quick start")
    expect(getDoc("custom-fields")).toBeNull()
  })
})
