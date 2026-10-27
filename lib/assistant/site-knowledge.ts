// Site assistant knowledge mapping (design §7)
// Explicit route map: pathname → content file
// Loads relevant facts for the site assistant

import * as home from "@/content/home"
import * as pricing from "@/content/pricing-page"
import * as about from "@/content/about"
import * as products from "@/content/products"
import * as solutions from "@/content/solutions"
import * as faq from "@/content/faq"
import * as legal from "@/content/legal"
import * as blog from "@/content/blog"
import * as careers from "@/content/careers"
import * as changelog from "@/content/changelog"
import * as roadmap from "@/content/roadmap"
import * as status from "@/content/status"
import * as migration from "@/content/migration"
import * as compare from "@/content/compare"
import * as templates from "@/content/templates"
import * as webinars from "@/content/webinars"
import * as caseStudies from "@/content/case-studies"
import * as documentation from "@/content/documentation"

// Explicit route map
const ROUTE_MAP: Record<string, () => string> = {
  "/": () => extractFacts(home, "home page"),
  "/pricing": () => extractFacts(pricing, "pricing page"),
  "/about": () => extractFacts(about, "about page"),
  "/products": () => extractFacts(products, "products page"),
  "/solutions": () => extractFacts(solutions, "solutions page"),
  "/faq": () => extractFacts(faq, "FAQ page"),
  "/legal": () => extractFacts(legal, "legal page"),
  "/blog": () => extractFacts(blog, "blog page"),
  "/careers": () => extractFacts(careers, "careers page"),
  "/changelog": () => extractFacts(changelog, "changelog page"),
  "/roadmap": () => extractFacts(roadmap, "roadmap page"),
  "/status": () => extractFacts(status, "status page"),
  "/migration": () => extractFacts(migration, "migration page"),
  "/compare": () => extractFacts(compare, "compare page"),
  "/templates": () => extractFacts(templates, "templates page"),
  "/webinars": () => extractFacts(webinars, "webinars page"),
  "/case-studies": () => extractFacts(caseStudies, "case studies page"),
  "/docs": () => extractFacts(documentation, "documentation page"),
}

/**
 * Get site knowledge for a pathname.
 * Returns formatted text facts or a generic message if path not mapped.
 */
export function getSiteKnowledge(pathname: string): string {
  // Exact match first
  const exactMatch = ROUTE_MAP[pathname]
  if (exactMatch) {
    return exactMatch()
  }

  // Pattern matching for dynamic routes
  if (pathname.startsWith("/blog/")) {
    return extractFacts(blog, "blog post")
  }
  if (pathname.startsWith("/products/")) {
    return extractFacts(products, "product page")
  }
  if (pathname.startsWith("/solutions/")) {
    return extractFacts(solutions, "solution page")
  }
  if (pathname.startsWith("/compare/")) {
    return extractFacts(compare, "comparison page")
  }
  if (pathname.startsWith("/templates/")) {
    return extractFacts(templates, "template page")
  }
  if (pathname.startsWith("/case-studies/")) {
    return extractFacts(caseStudies, "case study")
  }
  if (pathname.startsWith("/docs/")) {
    return extractFacts(documentation, "documentation")
  }

  // Fallback: no specific knowledge for this path
  return `This is the ${pathname} page. I don't have specific facts about this page loaded, but I can answer general questions about JiraVision based on the pricing, features, and FAQ.`
}

/**
 * Extract key facts from a content module.
 * Returns formatted text suitable for Gemini context.
 */
function extractFacts(module: Record<string, unknown>, label: string): string {
  const facts: string[] = []

  facts.push(`Context: ${label}`)

  // Extract common patterns
  if ("hero" in module && module.hero) {
    const hero = module.hero as Record<string, unknown>
    if ("title" in hero) facts.push(`Title: ${hero.title}`)
    if ("subtitle" in hero) facts.push(`Subtitle: ${hero.subtitle}`)
    if ("bullets" in hero && Array.isArray(hero.bullets)) {
      facts.push(`Key points: ${hero.bullets.slice(0, 5).join("; ")}`)
    }
  }

  // Extract pricing-specific facts
  if ("plans" in module && Array.isArray(module.plans)) {
    const plans = module.plans as Array<Record<string, unknown>>
    facts.push(`Plans: ${plans.map((p) => p.name).join(", ")}`)
    plans.forEach((plan) => {
      if ("price" in plan) facts.push(`${plan.name}: ${plan.price}`)
      if ("blurb" in plan) facts.push(`${plan.name} description: ${plan.blurb}`)
    })
  }

  // Extract FAQ items
  if ("faqs" in module && Array.isArray(module.faqs)) {
    const faqs = module.faqs as Array<Record<string, unknown>>
    facts.push(`FAQ topics: ${faqs.map((f) => f.question).slice(0, 10).join("; ")}`)
  }

  // Extract features
  if ("features" in module && Array.isArray(module.features)) {
    const features = module.features as Array<Record<string, unknown>>
    facts.push(`Features: ${features.map((f) => f.title || f.name).slice(0, 10).join(", ")}`)
  }

  // Extract testimonials
  if ("testimonials" in module && Array.isArray(module.testimonials)) {
    facts.push(`Has ${module.testimonials.length} testimonials`)
  }

  // Extract stats
  if ("stats" in module && Array.isArray(module.stats)) {
    const stats = module.stats as Array<Record<string, unknown>>
    facts.push(`Stats: ${stats.map((s) => `${s.value} ${s.label}`).join(", ")}`)
  }

  // Generic extraction: look for any exported const with a title or name
  const exports = Object.keys(module).filter((k) => typeof module[k] === "object" && module[k] !== null)
  const interestingExports = exports.slice(0, 5)
  if (interestingExports.length > 0) {
    facts.push(`Sections: ${interestingExports.join(", ")}`)
  }

  return facts.join("\n")
}

/**
 * Get a list of all mapped routes (for testing/debugging).
 */
export function getMappedRoutes(): string[] {
  return Object.keys(ROUTE_MAP)
}
