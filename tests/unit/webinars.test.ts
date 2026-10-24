import { existsSync } from "node:fs"
import { describe, expect, it } from "vitest"

import { getDoc } from "@/content/documentation"
import {
  getWebinar,
  relatedWebinars,
  searchWebinars,
  webinarList,
  webinarSlugs,
  webinarTopics,
  webinars,
  webinarsByTopic,
} from "@/content/webinars"

/** Marketing routes live under app/(marketing); signed-in routes under app/dashboard. */
function routeDirExists(route: string) {
  const segments = route.split("/").filter(Boolean)
  if (segments[0] === "dashboard") {
    return existsSync(["app/dashboard", ...segments.slice(1)].join("/"))
  }
  return existsSync(["app/(marketing)", ...segments].join("/"))
}

describe("webinar catalogue integrity", () => {
  it("keeps the three public slugs that the old pages published", () => {
    expect(webinarSlugs().sort()).toEqual(
      [
        "ai-scrum-master-introduction",
        "ethical-metrics-dashboard-demo",
        "gamification-for-developer-productivity",
      ].sort(),
    )
  })

  it("keys the record by each entry's own slug", () => {
    for (const [key, entry] of Object.entries(webinars)) {
      expect(entry.slug).toBe(key)
    }
    expect(new Set(webinarSlugs()).size).toBe(webinarSlugs().length)
    expect(webinarList).toHaveLength(Object.keys(webinars).length)
  })

  it("gives every session a real outline", () => {
    for (const entry of webinarList) {
      expect(entry.title.trim().length).toBeGreaterThan(0)
      expect(entry.description.trim().length).toBeGreaterThan(0)
      expect(entry.durationMinutes).toBeGreaterThanOrEqual(20)
      expect(entry.durationMinutes).toBeLessThanOrEqual(90)
      expect(entry.outline.length).toBeGreaterThanOrEqual(4)
      for (const step of entry.outline) {
        expect(step.title.trim().length).toBeGreaterThan(0)
        expect(step.detail.trim().length).toBeGreaterThan(20)
      }
      // Outline titles are React keys in the reader.
      expect(new Set(entry.outline.map((step) => step.title)).size).toBe(entry.outline.length)
    }
  })

  it("uses only topics the index renders filter chips for", () => {
    for (const entry of webinarList) {
      expect(webinarTopics).toContain(entry.topic)
    }
    for (const topic of webinarTopics) {
      expect(webinarsByTopic(topic).length).toBeGreaterThan(0)
    }
  })
})

describe("every webinar link resolves", () => {
  it("points relatedDocs at documents that exist", () => {
    for (const entry of webinarList) {
      expect(entry.relatedDocs.length).toBeGreaterThan(0)
      for (const slug of entry.relatedDocs) {
        expect(getDoc(slug), `${entry.slug} → doc "${slug}"`).not.toBeNull()
        expect(slug).not.toBe(entry.slug)
      }
      expect(new Set(entry.relatedDocs).size).toBe(entry.relatedDocs.length)
    }
  })

  it("points relatedProduct and demoRoute at real routes", () => {
    for (const entry of webinarList) {
      if (entry.relatedProduct) {
        expect(routeDirExists(entry.relatedProduct), `${entry.relatedProduct} missing`).toBe(true)
      }
      if (entry.demoRoute) {
        expect(routeDirExists(entry.demoRoute), `${entry.demoRoute} missing`).toBe(true)
      }
    }
  })

  it("embeds no fabricated recording", () => {
    // The legacy pages embedded a Rickroll and advertised attendee/like counts.
    for (const entry of webinarList) {
      if (entry.videoUrl) {
        expect(entry.videoUrl).not.toContain("dQw4w9WgXcQ")
        expect(entry.videoUrl).toMatch(/^https:\/\//)
      }
      expect(JSON.stringify(entry)).not.toMatch(/attendee|"likes"|transcript/i)
    }
  })
})

describe("relatedWebinars", () => {
  it("never returns the session itself and returns every other one", () => {
    for (const entry of webinarList) {
      const others = relatedWebinars(entry.slug)
      expect(others.some((item) => item.slug === entry.slug)).toBe(false)
      expect(others).toHaveLength(webinarList.length - 1)
    }
  })

  it("returns the whole catalogue for an unknown slug", () => {
    expect(relatedWebinars("does-not-exist")).toHaveLength(webinarList.length)
  })
})

describe("searchWebinars", () => {
  it("returns everything for an empty query", () => {
    expect(searchWebinars("")).toHaveLength(webinarList.length)
    expect(searchWebinars("   ")).toHaveLength(webinarList.length)
  })

  it("matches outline copy, not just titles", () => {
    const hits = searchWebinars("approval gate")
    expect(hits.map((entry) => entry.slug)).toEqual(["ai-scrum-master-introduction"])
  })

  it("finds the refusal list by its wording", () => {
    const hits = searchWebinars("refuse")
    expect(hits.map((entry) => entry.slug)).toEqual(["ethical-metrics-dashboard-demo"])
  })

  it("is case-insensitive", () => {
    expect(searchWebinars("SKILL TREES").map((entry) => entry.slug)).toEqual([
      "gamification-for-developer-productivity",
    ])
  })

  it("returns nothing for nonsense", () => {
    expect(searchWebinars("zzzzqqq")).toEqual([])
  })

  it("combines the query with the topic filter", () => {
    expect(searchWebinars("", "Ethical Metrics")).toHaveLength(1)
    expect(searchWebinars("sprint", "Gamification")).toEqual([])
    expect(searchWebinars("sprint", "AI Scrum Master").length).toBeGreaterThan(0)
  })
})

describe("getWebinar", () => {
  it("returns the entry for a known slug and null otherwise", () => {
    expect(getWebinar("ai-scrum-master-introduction")?.topic).toBe("AI Scrum Master")
    expect(getWebinar("nope")).toBeNull()
  })
})
