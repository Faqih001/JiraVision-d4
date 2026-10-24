import { existsSync } from "node:fs"
import { describe, expect, it } from "vitest"

import {
  caseStudies,
  caseStudyList,
  caseStudySlugs,
  caseStudyTopics,
  caseStudiesByTopic,
  getCaseStudy,
  relatedCaseStudies,
  searchCaseStudies,
} from "@/content/case-studies"
import { getDoc } from "@/content/documentation"

function routeDirExists(route: string) {
  const segments = route.split("/").filter(Boolean)
  if (segments[0] === "dashboard") {
    return existsSync(["app/dashboard", ...segments.slice(1)].join("/"))
  }
  return existsSync(["app/(marketing)", ...segments].join("/"))
}

describe("scenario catalogue integrity", () => {
  it("keeps the three slugs the old case-study pages published", () => {
    expect(caseStudySlugs().sort()).toEqual(
      ["acme-corp-transformation", "globaltech-wellbeing", "startupx-scaling"].sort(),
    )
  })

  it("keys the record by each entry's own slug", () => {
    for (const [key, entry] of Object.entries(caseStudies)) {
      expect(entry.slug).toBe(key)
    }
    expect(new Set(caseStudySlugs()).size).toBe(caseStudySlugs().length)
    expect(caseStudyList).toHaveLength(Object.keys(caseStudies).length)
  })

  it("gives every scenario a situation, an ordered setup and measures", () => {
    for (const entry of caseStudyList) {
      expect(entry.team).toContain(" — ")
      expect(entry.title.trim().length).toBeGreaterThan(0)
      expect(entry.summary.trim().length).toBeGreaterThan(40)
      expect(entry.shape.length).toBeGreaterThanOrEqual(2)
      expect(entry.situation.length).toBeGreaterThanOrEqual(3)
      expect(entry.setup.length).toBeGreaterThanOrEqual(5)
      expect(entry.measures.length).toBeGreaterThanOrEqual(3)
      for (const step of entry.setup) {
        expect(step.title.trim().length).toBeGreaterThan(0)
        expect(step.detail.trim().length).toBeGreaterThan(40)
      }
      for (const measure of entry.measures) {
        expect(measure.label.trim().length).toBeGreaterThan(0)
        expect(measure.how.trim().length).toBeGreaterThan(20)
      }
      // Titles are React keys in the reader.
      expect(new Set(entry.setup.map((step) => step.title)).size).toBe(entry.setup.length)
      expect(new Set(entry.situation).size).toBe(entry.situation.length)
      expect(new Set(entry.measures.map((measure) => measure.label)).size).toBe(
        entry.measures.length,
      )
    }
  })

  it("uses only topics the index renders filter chips for", () => {
    for (const entry of caseStudyList) {
      expect(caseStudyTopics).toContain(entry.topic)
    }
    for (const topic of caseStudyTopics) {
      expect(caseStudiesByTopic(topic).length).toBeGreaterThan(0)
    }
  })
})

describe("every scenario link resolves", () => {
  it("points setup steps and relatedDocs at documents that exist", () => {
    for (const entry of caseStudyList) {
      const docSlugs = [
        ...entry.setup.map((step) => step.doc),
        ...entry.relatedDocs,
      ].filter((slug): slug is string => Boolean(slug))
      expect(docSlugs.length).toBeGreaterThan(0)
      for (const slug of docSlugs) {
        expect(getDoc(slug), `${entry.slug} → doc "${slug}"`).not.toBeNull()
      }
    }
  })

  it("points every route at a real directory", () => {
    for (const entry of caseStudyList) {
      for (const step of entry.setup) {
        if (step.route) {
          expect(routeDirExists(step.route), `${entry.slug} → ${step.route}`).toBe(true)
        }
      }
      if (entry.relatedProduct) {
        expect(routeDirExists(entry.relatedProduct), entry.relatedProduct).toBe(true)
      }
    }
  })

  it("names no real customer until the owner provides one", () => {
    for (const entry of caseStudyList) {
      expect(entry.customer).toBeUndefined()
    }
  })

  it("asserts no result figures", () => {
    // The legacy pages published "35% productivity increase" and attributed quotes.
    const figure = /\b\d{1,3}%|\d\.\d\s*\/\s*5/
    const attributedQuote = /[“"][^”"]{20,}[”"]\s*(says|notes|concludes|—)/i
    for (const entry of caseStudyList) {
      const prose = [
        entry.title,
        entry.summary,
        ...entry.situation,
        ...entry.setup.flatMap((step) => [step.title, step.detail]),
        ...entry.measures.flatMap((measure) => [measure.label, measure.how]),
      ].join("\n")
      expect(prose, `${entry.slug} asserts a figure`).not.toMatch(figure)
      expect(prose, `${entry.slug} carries an attributed quote`).not.toMatch(attributedQuote)
    }
  })
})

describe("relatedCaseStudies", () => {
  it("never returns the scenario itself and returns every other one", () => {
    for (const entry of caseStudyList) {
      const others = relatedCaseStudies(entry.slug)
      expect(others.some((item) => item.slug === entry.slug)).toBe(false)
      expect(others).toHaveLength(caseStudyList.length - 1)
    }
  })

  it("returns the whole catalogue for an unknown slug", () => {
    expect(relatedCaseStudies("does-not-exist")).toHaveLength(caseStudyList.length)
  })
})

describe("searchCaseStudies", () => {
  it("returns everything for an empty query", () => {
    expect(searchCaseStudies("")).toHaveLength(caseStudyList.length)
    expect(searchCaseStudies("   ")).toHaveLength(caseStudyList.length)
  })

  it("matches setup copy, not just titles", () => {
    expect(searchCaseStudies("draft plan").map((entry) => entry.slug)).toEqual([
      "acme-corp-transformation",
    ])
  })

  it("matches the refusal list wording", () => {
    expect(searchCaseStudies("keyboard-time").map((entry) => entry.slug)).toEqual([
      "globaltech-wellbeing",
    ])
  })

  it("matches measure wording", () => {
    expect(searchCaseStudies("cycle time").map((entry) => entry.slug)).toEqual([
      "startupx-scaling",
    ])
  })

  it("is case-insensitive", () => {
    expect(searchCaseStudies("AFTER-HOURS DRIFT").map((entry) => entry.slug)).toEqual([
      "globaltech-wellbeing",
    ])
  })

  it("returns nothing for nonsense", () => {
    expect(searchCaseStudies("zzzzqqq")).toEqual([])
  })

  it("combines the query with the topic filter", () => {
    expect(searchCaseStudies("", "Scaling Delivery")).toHaveLength(1)
    expect(searchCaseStudies("burnout", "AI Scrum Master")).toEqual([])
    expect(searchCaseStudies("sprint", "AI Scrum Master").length).toBeGreaterThan(0)
  })
})

describe("getCaseStudy", () => {
  it("returns the entry for a known slug and null otherwise", () => {
    expect(getCaseStudy("startupx-scaling")?.topic).toBe("Scaling Delivery")
    expect(getCaseStudy("nope")).toBeNull()
  })
})
