import { existsSync } from "node:fs"
import { describe, expect, it } from "vitest"

import {
  blogCategories,
  blogList,
  blogPosts,
  blogSlugs,
  formatDate,
  getPost,
  postsByCategory,
  postNeighbours,
  readingMinutes,
  relatedPosts,
  searchPosts,
} from "@/content/blog"
import { getDoc } from "@/content/documentation"
import { searchIndex } from "@/content/search-index"
import { parseMarkdown, sectionsOf, slugifyHeading, wordCount } from "@/lib/markdown-lite"

/** Marketing routes live under app/(marketing); signed-in routes under app/dashboard. */
function routeDirExists(route: string) {
  const segments = route.split("/").filter(Boolean)
  if (segments[0] === "dashboard") {
    return existsSync(["app/dashboard", ...segments.slice(1)].join("/"))
  }
  return existsSync(["app/(marketing)", ...segments].join("/"))
}

/** Everything a reader can see: card copy plus the article body. */
function renderedCopy(slug: string) {
  const post = blogPosts[slug]!
  return [post.title, post.excerpt, post.content, JSON.stringify(post.author ?? "")].join("\n")
}

const LEGACY_SLUGS = [
  "ai-scrum-master-guide",
  "ai-transforming-agile",
  "ethical-ai-project-management",
  "gamification-science",
  "improve-team-wellbeing",
  "preventing-burnout-guide",
]

describe("blog catalogue integrity", () => {
  it("keeps every slug the old pages published", () => {
    expect(blogSlugs().sort()).toEqual([...LEGACY_SLUGS].sort())
  })

  it("keys the record by each post's own slug", () => {
    for (const [key, post] of Object.entries(blogPosts)) {
      expect(post.slug).toBe(key)
    }
    expect(new Set(blogSlugs()).size).toBe(blogSlugs().length)
    expect(blogList).toHaveLength(Object.keys(blogPosts).length)
  })

  it("gives every post a real body, an excerpt and a dated publication", () => {
    for (const post of blogList) {
      expect(post.title.trim().length).toBeGreaterThan(10)
      expect(post.excerpt.trim().length).toBeGreaterThan(40)
      expect(post.publishedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(post.image).toMatch(/^https:\/\/images\.unsplash\.com\/photo-/)
      expect(post.imageAlt.trim().length).toBeGreaterThan(10)
      expect(wordCount(post.content)).toBeGreaterThanOrEqual(500)
    }
  })

  it("opens each article with an h1 that matches its title", () => {
    for (const post of blogList) {
      const [first] = parseMarkdown(post.content)
      expect(first?.kind).toBe("heading")
      if (first?.kind !== "heading") continue
      expect(first.level).toBe(1)
      expect(slugifyHeading(first.text)).toBe(slugifyHeading(post.title))
    }
  })

  it("features exactly one post, first in the list", () => {
    const featured = blogList.filter((post) => post.featured)
    expect(featured).toHaveLength(1)
    expect(blogList[0]?.featured).toBe(true)
  })

  it("uses only categories the index renders filter chips for", () => {
    for (const post of blogList) {
      expect(blogCategories.map((item) => item.id)).toContain(post.category)
    }
    for (const category of blogCategories) {
      expect(postsByCategory(category.id).length).toBeGreaterThan(0)
    }
  })
})

describe("blog honesty rules", () => {
  it("credits no invented byline until the owner supplies one", () => {
    for (const post of blogList) {
      expect(post.author, `${post.slug} names an author the owner has not confirmed`).toBeUndefined()
    }
  })

  const LEGACY_BYLINES = /Sarah Johnson|Michael Chen|Jessica Taylor|David Wilson/i
  const figure = /\b\d{1,3}%|\d\.\d\s*\/\s*5/
  const attributedQuote = /[“"][^”"]{20,}[”"]\s*(says|notes|concludes|—)/i

  it("publishes no legacy byline, result figure or attributed quote", () => {
    for (const post of blogList) {
      const copy = renderedCopy(post.slug)
      expect(copy, `${post.slug} names a legacy author`).not.toMatch(LEGACY_BYLINES)
      expect(copy, `${post.slug} quotes a figure we cannot measure`).not.toMatch(figure)
      expect(copy, `${post.slug} attributes a quote to a person`).not.toMatch(attributedQuote)
    }
  })

  it("carries no engagement theatre", () => {
    for (const post of blogList) {
      expect(JSON.stringify(post)).not.toMatch(/commentCount|"views"|"likes"|readCount/i)
    }
  })

  it("writes prose the markdown-lite parser can render, with no raw HTML", () => {
    for (const post of blogList) {
      expect(post.content, `${post.slug} embeds HTML`).not.toMatch(/<[a-z/]/i)
      const blocks = parseMarkdown(post.content)
      expect(blocks.length).toBeGreaterThan(10)
      expect(blocks.some((block) => block.kind === "ul" || block.kind === "ol")).toBe(true)
      expect(sectionsOf(post.content).length).toBeGreaterThan(3)
    }
  })
})

describe("every blog link resolves", () => {
  it("points relatedDocs at documents that exist", () => {
    for (const post of blogList) {
      expect(post.relatedDocs.length).toBeGreaterThan(0)
      for (const slug of post.relatedDocs) {
        expect(getDoc(slug), `${post.slug} → doc "${slug}"`).not.toBeNull()
      }
      expect(new Set(post.relatedDocs).size).toBe(post.relatedDocs.length)
    }
  })

  it("points relatedProduct and demoRoute at real routes", () => {
    for (const post of blogList) {
      if (post.relatedProduct) {
        expect(routeDirExists(post.relatedProduct), `${post.relatedProduct} missing`).toBe(true)
      }
      if (post.demoRoute) {
        expect(routeDirExists(post.demoRoute), `${post.demoRoute} missing`).toBe(true)
      }
    }
  })

  it("serves every slug from the dynamic route, with no legacy route files left", () => {
    expect(existsSync("app/(marketing)/resources/blog/[slug]/page.tsx")).toBe(true)
    for (const slug of LEGACY_SLUGS) {
      expect(existsSync(`app/(marketing)/resources/blog/${slug}/page.tsx`), `${slug} still static`).toBe(false)
    }
    expect(existsSync("app/(marketing)/resources/blog/template-server.tsx")).toBe(false)
    // A loading.tsx returning null still creates a streaming boundary.
    expect(existsSync("app/(marketing)/resources/blog/loading.tsx")).toBe(false)
  })

  it("lists every post in the site search index", () => {
    const hrefs = searchIndex.filter((entry) => entry.group === "Blog").map((entry) => entry.href)
    expect(hrefs.sort()).toEqual(blogSlugs().map((slug) => `/resources/blog/${slug}`).sort())
  })
})

describe("derived values", () => {
  it("computes reading time from the word count rather than stating it", () => {
    for (const post of blogList) {
      expect(readingMinutes(post)).toBe(Math.max(1, Math.round(wordCount(post.content) / 200)))
      expect(readingMinutes(post)).toBeGreaterThanOrEqual(3)
    }
  })

  it("formats the publication date for display", () => {
    expect(formatDate("2026-10-24")).toContain("2026")
    expect(formatDate("2026-10-24")).toContain("October")
  })
})

describe("relatedPosts and postNeighbours", () => {
  it("never returns the post itself and prefers its own category", () => {
    for (const post of blogList) {
      const related = relatedPosts(post.slug)
      expect(related.some((item) => item.slug === post.slug)).toBe(false)
      expect(related.length).toBeLessThanOrEqual(3)
      expect(related.length).toBeGreaterThan(0)
      const sameCategory = related.filter((item) => item.category === post.category).length
      expect(related.slice(0, sameCategory).every((item) => item.category === post.category)).toBe(true)
    }
  })

  it("walks the published order without gaps", () => {
    expect(postNeighbours(blogList[0]!.slug).previous).toBeUndefined()
    expect(postNeighbours(blogList[blogList.length - 1]!.slug).next).toBeUndefined()
    for (const post of blogList) {
      const { previous, next } = postNeighbours(post.slug)
      const index = blogList.findIndex((item) => item.slug === post.slug)
      expect(previous?.slug).toBe(blogList[index - 1]?.slug)
      expect(next?.slug).toBe(blogList[index + 1]?.slug)
    }
    expect(postNeighbours("does-not-exist")).toEqual({})
  })
})

describe("searchPosts", () => {
  it("returns everything for an empty query", () => {
    expect(searchPosts("")).toHaveLength(blogList.length)
    expect(searchPosts("   ")).toHaveLength(blogList.length)
  })

  it("matches article copy, not just titles", () => {
    expect(searchPosts("Goodhart").map((post) => post.slug)).toEqual(["gamification-science"])
    expect(searchPosts("overjustification").map((post) => post.slug)).toEqual([
      "gamification-science",
    ])
  })

  it("is case-insensitive", () => {
    expect(searchPosts("BURNOUT").map((post) => post.slug).sort()).toEqual([
      "improve-team-wellbeing",
      "preventing-burnout-guide",
    ])
  })

  it("returns nothing for nonsense", () => {
    expect(searchPosts("zzzzqqq")).toEqual([])
  })

  it("combines the query with the category filter", () => {
    expect(searchPosts("", "gamification")).toHaveLength(1)
    expect(searchPosts("override", "ethical-ai").length).toBeGreaterThan(0)
    expect(searchPosts("override", "gamification")).toEqual([])
  })
})

describe("getPost", () => {
  it("returns the post for a known slug and undefined otherwise", () => {
    expect(getPost("gamification-science")?.category).toBe("gamification")
    expect(getPost("nope")).toBeUndefined()
  })
})
