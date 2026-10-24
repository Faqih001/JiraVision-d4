import { describe, expect, it } from "vitest"
import {
  CMS_PAGES,
  applySectionOverrides,
  buildDefaults,
  coerceFieldValue,
  findField,
  findPage,
  findSection,
  getByPath,
  sanitizeOverrideFields,
} from "@/lib/cms-registry"

describe("registry integrity", () => {
  it("every section id maps to a real key in that page's defaults", () => {
    for (const page of CMS_PAGES) {
      const defaults = buildDefaults(page.id)
      for (const section of page.sections) {
        expect(section.id in defaults, `${page.id}/${section.id} missing from defaults`).toBe(true)
      }
    }
  })

  it("every declared field path resolves in the defaults", () => {
    for (const page of CMS_PAGES) {
      const defaults = buildDefaults(page.id)
      for (const section of page.sections) {
        for (const field of section.fields) {
          const value = getByPath(defaults[section.id], field.path)
          expect(value !== undefined, `${page.id}/${section.id}.${field.path} is undefined`).toBe(true)
        }
      }
    }
  })

  it("sections and paths are unique within a page, and labels are non-empty", () => {
    for (const page of CMS_PAGES) {
      const sectionIds = page.sections.map((s) => s.id)
      expect(new Set(sectionIds).size).toBe(sectionIds.length)
      expect(page.label.trim().length).toBeGreaterThan(0)
      expect(page.route.startsWith("/")).toBe(true)
      for (const section of page.sections) {
        expect(section.label.trim().length, `${page.id}/${section.id} label`).toBeGreaterThan(0)
        const paths = section.fields.map((f) => f.path)
        expect(new Set(paths).size, `${page.id}/${section.id} duplicate path`).toBe(paths.length)
        for (const field of section.fields) {
          expect(field.label.trim().length, `${page.id}/${section.id}.${field.path} label`).toBeGreaterThan(0)
        }
      }
    }
  })

  it("lookups resolve and reject unknown ids", () => {
    expect(findPage("home")?.id).toBe("home")
    expect(findPage("nope")).toBeUndefined()
    expect(findSection("home", "hero")?.label).toBe("Hero")
    expect(findSection("home", "nope")).toBeUndefined()
    expect(findField("home", "hero", "title")?.type).toBe("text")
    expect(findField("home", "hero", "notDeclared")).toBeUndefined()
  })
})

describe("buildDefaults", () => {
  it("returns a fresh deep clone each call", () => {
    const a = buildDefaults("home")
    const b = buildDefaults("home")
    expect(a).not.toBe(b)
    expect(a.hero).not.toBe(b.hero)
    applySectionOverrides("home", a, "hero", { title: "mutated" })
    expect((b.hero as { title: string }).title).not.toBe("mutated")
    expect((buildDefaults("home").hero as { title: string }).title).not.toBe("mutated")
  })

  it("returns an empty object for unknown pages", () => {
    expect(buildDefaults("does-not-exist")).toEqual({})
  })
})

describe("coerceFieldValue", () => {
  it("trims strings and rejects blanks and non-strings", () => {
    expect(coerceFieldValue("text", "  hello  ")).toBe("hello")
    expect(coerceFieldValue("longtext", "   ")).toBeNull()
    expect(coerceFieldValue("text", "")).toBeNull()
    expect(coerceFieldValue("text", null)).toBeNull()
    expect(coerceFieldValue("text", 42)).toBeNull()
    expect(coerceFieldValue("text", { a: 1 })).toBeNull()
  })

  it("parses numbers and rejects non-finite input", () => {
    expect(coerceFieldValue("number", "19")).toBe(19)
    expect(coerceFieldValue("number", 12.5)).toBe(12.5)
    expect(coerceFieldValue("number", "12abc")).toBe(12)
    expect(coerceFieldValue("number", "abc")).toBeNull()
    expect(coerceFieldValue("number", "")).toBeNull()
    expect(coerceFieldValue("number", null)).toBeNull()
  })

  it("treats only true/'true' as boolean true", () => {
    expect(coerceFieldValue("boolean", true)).toBe(true)
    expect(coerceFieldValue("boolean", "true")).toBe(true)
    expect(coerceFieldValue("boolean", "TRUE")).toBe(false)
    expect(coerceFieldValue("boolean", false)).toBe(false)
    expect(coerceFieldValue("boolean", "1")).toBe(false)
  })

  it("accepts safe url schemes and blocks script/data urls", () => {
    expect(coerceFieldValue("url", "/pricing")).toBe("/pricing")
    expect(coerceFieldValue("url", "#top")).toBe("#top")
    expect(coerceFieldValue("url", "https://jiravision.app")).toBe("https://jiravision.app")
    expect(coerceFieldValue("url", "mailto:hi@example.com")).toBe("mailto:hi@example.com")
    expect(coerceFieldValue("url", "javascript:alert(1)")).toBeNull()
    expect(coerceFieldValue("url", "data:text/html,<script>")).toBeNull()
    expect(coerceFieldValue("url", "  javascript:alert(1)")).toBeNull()
  })
})

describe("sanitizeOverrideFields", () => {
  it("keeps only declared paths, coerced", () => {
    const out = sanitizeOverrideFields("home", "seatModel", {
      trialDays: "21",
      perUserMonthly: { Starter: 99 },
      undeclared: "x",
      "primaryCta.href": "javascript:alert(1)",
    })
    expect(out).toEqual({ trialDays: 21 })
  })

  it("rejects unknown sections and non-object payloads", () => {
    expect(sanitizeOverrideFields("home", "nope", { title: "x" })).toBeNull()
    expect(sanitizeOverrideFields("nope", "hero", { title: "x" })).toBeNull()
    expect(sanitizeOverrideFields("home", "hero", "nope")).toBeNull()
    expect(sanitizeOverrideFields("home", "hero", ["title"])).toBeNull()
    expect(sanitizeOverrideFields("home", "hero", null)).toBeNull()
  })

  it("returns an empty object when nothing survives validation", () => {
    expect(sanitizeOverrideFields("home", "hero", { evil: 1 })).toEqual({})
  })
})

describe("applySectionOverrides", () => {
  it("applies declared values onto defaults", () => {
    const content = buildDefaults("home")
    applySectionOverrides("home", content, "hero", { title: "New headline", "primaryCta.href": "/signup" })
    const hero = content.hero as { title: string; primaryCta: { href: string } }
    expect(hero.title).toBe("New headline")
    expect(hero.primaryCta.href).toBe("/signup")
  })

  it("accepts jsonb delivered as a string", () => {
    const content = buildDefaults("pricing")
    applySectionOverrides("pricing", content, "pricingQuotes", JSON.stringify({ title: "From a string" }))
    expect((content.pricingQuotes as { title: string }).title).toBe("From a string")
  })

  it("ignores malformed jsonb, unknown sections, and undeclared paths", () => {
    const content = buildDefaults("about")
    const before = JSON.stringify(content.story)
    applySectionOverrides("about", content, "story", "{not json")
    applySectionOverrides("about", content, "nope", { title: "x" })
    applySectionOverrides("about", content, "story", { "part1.secret": "x", title: "x" })
    expect(JSON.stringify(content.story)).toBe(before)
  })

  it("never invents structure for paths missing from defaults", () => {
    const content = buildDefaults("home")
    const pillars = content.pillars as Record<string, unknown>[]
    applySectionOverrides("home", content, "pillars", { "9.title": "ghost" } as Record<string, unknown>)
    expect(pillars).toHaveLength(4)
  })

  it("skips values that fail coercion instead of writing null", () => {
    const content = buildDefaults("home")
    const original = (content.hero as { title: string }).title
    applySectionOverrides("home", content, "hero", { title: "   " })
    expect((content.hero as { title: string }).title).toBe(original)
  })
})
