// Tests for lib/assistant/site-knowledge.ts
import { describe, it, expect } from "vitest"
import { getSiteKnowledge, getMappedRoutes } from "@/lib/assistant/site-knowledge"

describe("getSiteKnowledge", () => {
  it("returns knowledge for exact route match", () => {
    const result = getSiteKnowledge("/pricing")
    expect(result).toContain("pricing page")
  })

  it("returns knowledge for home page", () => {
    const result = getSiteKnowledge("/")
    expect(result).toContain("home page")
  })

  it("returns knowledge for about page", () => {
    const result = getSiteKnowledge("/about")
    expect(result).toContain("about page")
  })

  it("returns knowledge for products page", () => {
    const result = getSiteKnowledge("/products")
    expect(result).toContain("products page")
  })

  it("returns knowledge for solutions page", () => {
    const result = getSiteKnowledge("/solutions")
    expect(result).toContain("solutions page")
  })

  it("returns knowledge for FAQ page", () => {
    const result = getSiteKnowledge("/faq")
    expect(result).toContain("FAQ page")
  })

  it("returns knowledge for legal page", () => {
    const result = getSiteKnowledge("/legal")
    expect(result).toContain("legal page")
  })

  it("returns knowledge for blog index", () => {
    const result = getSiteKnowledge("/blog")
    expect(result).toContain("blog page")
  })

  it("returns knowledge for blog post via pattern match", () => {
    const result = getSiteKnowledge("/blog/my-post")
    expect(result).toContain("blog post")
  })

  it("returns knowledge for product page via pattern match", () => {
    const result = getSiteKnowledge("/products/ai-scrum-master")
    expect(result).toContain("product page")
  })

  it("returns knowledge for solution page via pattern match", () => {
    const result = getSiteKnowledge("/solutions/startups")
    expect(result).toContain("solution page")
  })

  it("returns knowledge for compare page via pattern match", () => {
    const result = getSiteKnowledge("/compare/jira-alternative")
    expect(result).toContain("comparison page")
  })

  it("returns knowledge for template page via pattern match", () => {
    const result = getSiteKnowledge("/templates/sprint-planning")
    expect(result).toContain("template page")
  })

  it("returns knowledge for case study via pattern match", () => {
    const result = getSiteKnowledge("/case-studies/acme-corp")
    expect(result).toContain("case study")
  })

  it("returns knowledge for docs via pattern match", () => {
    const result = getSiteKnowledge("/docs/getting-started")
    expect(result).toContain("documentation")
  })

  it("returns fallback message for unmapped route", () => {
    const result = getSiteKnowledge("/some-random-page")
    expect(result).toContain("I don't have specific facts about this page")
    expect(result).toContain("/some-random-page")
  })

  it("includes pathname in fallback message", () => {
    const result = getSiteKnowledge("/unknown/path")
    expect(result).toContain("/unknown/path")
  })
})

describe("getMappedRoutes", () => {
  it("returns array of mapped routes", () => {
    const routes = getMappedRoutes()
    expect(Array.isArray(routes)).toBe(true)
    expect(routes.length).toBeGreaterThan(0)
  })

  it("includes common routes", () => {
    const routes = getMappedRoutes()
    expect(routes).toContain("/")
    expect(routes).toContain("/pricing")
    expect(routes).toContain("/about")
    expect(routes).toContain("/faq")
  })

  it("does not include dynamic route patterns", () => {
    const routes = getMappedRoutes()
    expect(routes).not.toContain("/blog/*")
    expect(routes).not.toContain("/products/*")
  })
})
