// Landing-page CMS registry — PURE module (no db, no next/* imports).
// Safe to import from client components (the /admin/cms editor) and server
// code (lib/cms.ts resolver, API routes). Section ids mirror the export names
// in content/*.ts; field paths are dot-paths into those objects (array indices
// allowed, e.g. "items.0.title"). Only paths declared here are ever accepted
// by the API or applied by the merge — arbitrary jsonb keys are dropped.

import * as homeContent from "@/content/home"
import * as pricingContent from "@/content/pricing-page"
import * as aboutContent from "@/content/about"

export type CmsFieldType = "text" | "longtext" | "url" | "boolean" | "number"

export interface CmsField {
  path: string
  label: string
  type: CmsFieldType
}

export interface CmsSection {
  id: string
  label: string
  fields: CmsField[]
}

export interface CmsPage {
  id: string
  label: string
  route: string
  sections: CmsSection[]
}

const t = (path: string, label: string): CmsField => ({ path, label, type: "text" })
const lt = (path: string, label: string): CmsField => ({ path, label, type: "longtext" })
const u = (path: string, label: string): CmsField => ({ path, label, type: "url" })
const n = (path: string, label: string): CmsField => ({ path, label, type: "number" })

const home: CmsPage = {
  id: "home",
  label: "Homepage",
  route: "/",
  sections: [
    {
      id: "hero",
      label: "Hero",
      fields: [
        t("eyebrow", "Eyebrow"),
        t("title", "Headline"),
        lt("subtitle", "Subtitle"),
        t("primaryCta.label", "Primary CTA label"),
        u("primaryCta.href", "Primary CTA href"),
        t("secondaryCta.label", "Secondary CTA label"),
        u("secondaryCta.href", "Secondary CTA href"),
      ],
    },
    {
      id: "builtOn",
      label: "Built-on strip",
      fields: [
        t("statement", "Statement"),
        ...[0, 1, 2].flatMap((i) => [
          t(`items.${i}.name`, `Item ${i + 1} name`),
          t(`items.${i}.note`, `Item ${i + 1} note`),
        ]),
      ],
    },
    {
      id: "problem",
      label: "Problem / solution",
      fields: [
        t("title", "Title"),
        lt("intro", "Intro"),
        ...[0, 1, 2].flatMap((i) => [
          t(`items.${i}.title`, `Point ${i + 1} title`),
          lt(`items.${i}.body`, `Point ${i + 1} body`),
        ]),
      ],
    },
    {
      id: "pillars",
      label: "Product pillars",
      fields: [0, 1, 2, 3].flatMap((i) => [
        t(`${i}.title`, `Pillar ${i + 1} title`),
        lt(`${i}.summary`, `Pillar ${i + 1} summary`),
      ]),
    },
    {
      id: "howItWorks",
      label: "How it works",
      fields: [
        t("title", "Title"),
        t("intro", "Intro"),
        ...[0, 1, 2, 3].flatMap((i) => [
          t(`steps.${i}.title`, `Step ${i + 1} title`),
          lt(`steps.${i}.body`, `Step ${i + 1} body`),
        ]),
      ],
    },
    {
      id: "tour",
      label: "Product tour tabs",
      fields: [0, 1, 2, 3].flatMap((i) => [
        t(`${i}.label`, `Tab ${i + 1} label`),
        t(`${i}.title`, `Tab ${i + 1} title`),
        lt(`${i}.body`, `Tab ${i + 1} body`),
      ]),
    },
    {
      id: "integrations",
      label: "Integrations",
      fields: [
        t("title", "Title"),
        lt("intro", "Intro"),
        ...[0, 1, 2, 3, 4, 5].flatMap((i) => [
          t(`items.${i}.name`, `Integration ${i + 1} name`),
          t(`items.${i}.note`, `Integration ${i + 1} note`),
        ]),
      ],
    },
    {
      id: "responsibleAi",
      label: "Responsible AI",
      fields: [
        t("title", "Title"),
        lt("intro", "Intro"),
        ...[0, 1, 2, 3].flatMap((i) => [
          t(`points.${i}.title`, `Point ${i + 1} title`),
          lt(`points.${i}.body`, `Point ${i + 1} body`),
        ]),
        t("link.label", "Link label"),
      ],
    },
    {
      id: "useCases",
      label: "Use-case tabs",
      fields: [
        t("title", "Title"),
        ...[0, 1, 2].flatMap((i) => [
          t(`tabs.${i}.label`, `Tab ${i + 1} label`),
          t(`tabs.${i}.headline`, `Tab ${i + 1} headline`),
          lt(`tabs.${i}.body`, `Tab ${i + 1} body`),
        ]),
      ],
    },
    {
      id: "outcomes",
      label: "Outcomes",
      fields: [
        t("title", "Title"),
        lt("intro", "Intro"),
        ...[0, 1, 2].flatMap((i) => [
          lt(`qualitative.${i}`, `Observation ${i + 1}`),
          t(`stats.${i}.value`, `Stat ${i + 1} value`),
          t(`stats.${i}.label`, `Stat ${i + 1} label`),
        ]),
      ],
    },
    {
      id: "testimonials",
      label: "Testimonials",
      fields: [
        t("title", "Title"),
        ...[0, 1, 2].flatMap((i) => [
          lt(`items.${i}.quote`, `Quote ${i + 1}`),
          t(`items.${i}.name`, `Quote ${i + 1} attribution`),
          t(`items.${i}.role`, `Quote ${i + 1} context`),
        ]),
      ],
    },
    {
      id: "pricingTeaser",
      label: "Pricing teaser",
      fields: [
        t("title", "Title"),
        lt("intro", "Intro"),
        ...[0, 1, 2].flatMap((i) => [
          t(`plans.${i}.price`, `Plan ${i + 1} price`),
          lt(`plans.${i}.blurb`, `Plan ${i + 1} blurb`),
        ]),
        t("cta.label", "CTA label"),
        u("cta.href", "CTA href"),
      ],
    },
    {
      id: "seatModel",
      label: "Seat model (numbers)",
      fields: [
        n("annualDiscountPct", "Annual discount %"),
        n("trialDays", "Trial days"),
        n("perUserMonthly.Starter", "Starter $/user/mo"),
        n("perUserMonthly.Professional", "Professional $/user/mo"),
        n("perUserMonthly.Enterprise", "Enterprise $/user/mo"),
        n("defaultSeats", "Default seats"),
        n("minSeats", "Min seats"),
        n("maxSeats", "Max seats"),
      ],
    },
    {
      id: "faqTeaser",
      label: "FAQ teaser",
      fields: [
        t("title", "Title"),
        ...[0, 1, 2, 3, 4, 5].flatMap((i) => [
          t(`items.${i}.q`, `Question ${i + 1}`),
          lt(`items.${i}.a`, `Answer ${i + 1}`),
        ]),
        t("moreLink.label", "More-link label"),
      ],
    },
    {
      id: "finalCta",
      label: "Final CTA band",
      fields: [
        t("title", "Title"),
        lt("body", "Body"),
        t("primary.label", "Primary label"),
        u("primary.href", "Primary href"),
        t("secondary.label", "Secondary label"),
        u("secondary.href", "Secondary href"),
      ],
    },
  ],
}

const pricing: CmsPage = {
  id: "pricing",
  label: "Pricing",
  route: "/pricing",
  sections: [
    {
      id: "pricingHero",
      label: "Hero",
      fields: [
        t("eyebrow", "Eyebrow"),
        t("badge", "Badge"),
        t("title", "Headline"),
        lt("subtitle", "Subtitle"),
        ...[0, 1, 2].map((i) => t(`bullets.${i}`, `Bullet ${i + 1}`)),
        t("primary.label", "Primary CTA label"),
        u("primary.href", "Primary CTA href"),
        t("secondary.label", "Secondary CTA label"),
        u("secondary.href", "Secondary CTA href"),
      ],
    },
    {
      id: "pricingProblem",
      label: "Trust problem",
      fields: [
        t("eyebrow", "Eyebrow"),
        t("title", "Title"),
        lt("intro", "Intro"),
        ...[0, 1, 2].flatMap((i) => [
          t(`items.${i}.title`, `Point ${i + 1} title`),
          lt(`items.${i}.body`, `Point ${i + 1} body`),
        ]),
      ],
    },
    {
      id: "planCards",
      label: "Plan cards",
      fields: [0, 1, 2].flatMap((c) => [
        lt(`${c}.blurb`, `Card ${c + 1} blurb`),
        ...[0, 1, 2, 3].map((h) => t(`${c}.highlights.${h}`, `Card ${c + 1} highlight ${h + 1}`)),
        t(`${c}.cta.label`, `Card ${c + 1} CTA label`),
      ]),
    },
    {
      id: "includedEverywhere",
      label: "Included in every plan",
      fields: [t("eyebrow", "Eyebrow"), t("title", "Title"), lt("intro", "Intro")],
    },
    {
      id: "billingMethod",
      label: "Billing method",
      fields: [t("eyebrow", "Eyebrow"), t("title", "Title"), lt("intro", "Intro")],
    },
    {
      id: "trialSteps",
      label: "Trial steps",
      fields: [t("eyebrow", "Eyebrow"), t("title", "Title"), lt("intro", "Intro")],
    },
    {
      id: "seatEconomics",
      label: "Seat economics",
      fields: [t("eyebrow", "Eyebrow"), t("title", "Title")],
    },
    {
      id: "chooseAudience",
      label: "Choose your plan",
      fields: [t("eyebrow", "Eyebrow"), t("title", "Title"), lt("intro", "Intro")],
    },
    {
      id: "discounts",
      label: "Discounts",
      fields: [t("eyebrow", "Eyebrow"), t("title", "Title"), lt("intro", "Intro")],
    },
    {
      id: "pricingPrinciples",
      label: "Pricing principles",
      fields: [t("eyebrow", "Eyebrow"), t("title", "Title"), lt("intro", "Intro")],
    },
    { id: "pricingQuotes", label: "Buyer quotes", fields: [t("title", "Title")] },
    {
      id: "pricingFaq",
      label: "Pricing FAQ",
      fields: [t("title", "Title"), t("moreLabel", "More-link label")],
    },
    {
      id: "pricingRelated",
      label: "Related pages",
      fields: [t("eyebrow", "Eyebrow"), t("title", "Title")],
    },
    {
      id: "pricingCta",
      label: "Closing CTA",
      fields: [
        t("title", "Title"),
        lt("body", "Body"),
        t("primary.label", "Primary label"),
        t("secondary.label", "Secondary label"),
      ],
    },
  ],
}

const about: CmsPage = {
  id: "about",
  label: "About",
  route: "/about",
  sections: [
    {
      id: "hero",
      label: "Hero",
      fields: [
        t("eyebrow", "Eyebrow"),
        t("badge", "Badge"),
        t("title", "Headline"),
        lt("subtitle", "Subtitle"),
        ...[0, 1, 2].map((i) => t(`bullets.${i}`, `Bullet ${i + 1}`)),
        t("primary.label", "Primary CTA label"),
        t("secondary.label", "Secondary CTA label"),
        t("photoAlt", "Photo alt text"),
      ],
    },
    {
      id: "origin",
      label: "Origin",
      fields: [t("eyebrow", "Eyebrow"), t("title", "Title"), lt("intro", "Intro")],
    },
    {
      id: "story",
      label: "Story",
      fields: [
        t("part1.title", "Part 1 title"),
        lt("part1.body", "Part 1 body"),
        t("part2.title", "Part 2 title"),
        lt("part2.body", "Part 2 body"),
      ],
    },
    {
      id: "values",
      label: "Values",
      fields: [t("eyebrow", "Eyebrow"), t("title", "Title"), lt("intro", "Intro")],
    },
    {
      id: "howWeWork",
      label: "How we work",
      fields: [t("eyebrow", "Eyebrow"), t("title", "Title"), lt("intro", "Intro")],
    },
    {
      id: "team",
      label: "Team",
      fields: [t("eyebrow", "Eyebrow"), t("title", "Title"), lt("intro", "Intro")],
    },
    {
      id: "decisions",
      label: "Decisions",
      fields: [t("eyebrow", "Eyebrow"), t("title", "Title"), lt("intro", "Intro")],
    },
    {
      id: "transparency",
      label: "Transparency",
      fields: [t("eyebrow", "Eyebrow"), t("title", "Title"), lt("intro", "Intro")],
    },
    { id: "honestFit", label: "Honest fit", fields: [t("title", "Title")] },
    { id: "milestones", label: "Milestones", fields: [t("title", "Title")] },
    { id: "faq", label: "FAQ", fields: [t("title", "Title")] },
    {
      id: "related",
      label: "Related pages",
      fields: [t("eyebrow", "Eyebrow"), t("title", "Title")],
    },
    {
      id: "cta",
      label: "Closing CTA",
      fields: [
        t("title", "Title"),
        lt("body", "Body"),
        t("primary.label", "Primary label"),
        t("secondary.label", "Secondary label"),
      ],
    },
  ],
}

export const CMS_PAGES: CmsPage[] = [home, pricing, about]

export function findPage(pageId: string): CmsPage | undefined {
  return CMS_PAGES.find((p) => p.id === pageId)
}

export function findSection(pageId: string, sectionId: string): CmsSection | undefined {
  return findPage(pageId)?.sections.find((s) => s.id === sectionId)
}

export function findField(pageId: string, sectionId: string, path: string): CmsField | undefined {
  return findSection(pageId, sectionId)?.fields.find((f) => f.path === path)
}

function homeDefaults() {
  return {
    hero: homeContent.hero,
    builtOn: homeContent.builtOn,
    problem: homeContent.problem,
    pillars: homeContent.pillars,
    howItWorks: homeContent.howItWorks,
    tour: homeContent.tour,
    integrations: homeContent.integrations,
    responsibleAi: homeContent.responsibleAi,
    useCases: homeContent.useCases,
    outcomes: homeContent.outcomes,
    testimonials: homeContent.testimonials,
    pricingTeaser: homeContent.pricingTeaser,
    seatModel: homeContent.seatModel,
    faqTeaser: homeContent.faqTeaser,
    finalCta: homeContent.finalCta,
  }
}

function pricingDefaults() {
  return {
    pricingHero: pricingContent.pricingHero,
    pricingProblem: pricingContent.pricingProblem,
    planCards: pricingContent.planCards,
    includedEverywhere: pricingContent.includedEverywhere,
    billingMethod: pricingContent.billingMethod,
    trialSteps: pricingContent.trialSteps,
    seatEconomics: pricingContent.seatEconomics,
    chooseAudience: pricingContent.chooseAudience,
    discounts: pricingContent.discounts,
    pricingPrinciples: pricingContent.pricingPrinciples,
    pricingQuotes: pricingContent.pricingQuotes,
    pricingFaq: pricingContent.pricingFaq,
    pricingRelated: pricingContent.pricingRelated,
    pricingCta: pricingContent.pricingCta,
  }
}

function aboutDefaults() {
  return {
    hero: aboutContent.hero,
    origin: aboutContent.origin,
    story: aboutContent.story,
    values: aboutContent.values,
    howWeWork: aboutContent.howWeWork,
    team: aboutContent.team,
    decisions: aboutContent.decisions,
    transparency: aboutContent.transparency,
    honestFit: aboutContent.honestFit,
    milestones: aboutContent.milestones,
    faq: aboutContent.faq,
    related: aboutContent.related,
    cta: aboutContent.cta,
  }
}

export type HomeDefaults = ReturnType<typeof homeDefaults>
export type PricingDefaults = ReturnType<typeof pricingDefaults>
export type AboutDefaults = ReturnType<typeof aboutDefaults>

/** Fresh deep clone of the code-defined defaults for one page. */
export function buildDefaults(pageId: "home"): HomeDefaults
export function buildDefaults(pageId: "pricing"): PricingDefaults
export function buildDefaults(pageId: "about"): AboutDefaults
export function buildDefaults(pageId: string): Record<string, unknown>
export function buildDefaults(pageId: string): Record<string, unknown> {
  if (pageId === "home") return structuredClone(homeDefaults()) as unknown as Record<string, unknown>
  if (pageId === "pricing") return structuredClone(pricingDefaults()) as unknown as Record<string, unknown>
  if (pageId === "about") return structuredClone(aboutDefaults()) as unknown as Record<string, unknown>
  return {}
}

/** Dot-path getter; returns undefined when the path does not exist. */
export function getByPath(source: unknown, path: string): unknown {
  let cur: unknown = source
  for (const key of path.split(".")) {
    if (cur === null || typeof cur !== "object") return undefined
    cur = (cur as Record<string, unknown>)[key]
  }
  return cur
}

function setByPath(target: Record<string, unknown>, path: string, value: unknown): boolean {
  const keys = path.split(".")
  let cur: Record<string, unknown> = target
  for (let i = 0; i < keys.length - 1; i++) {
    const next = cur[keys[i]]
    if (next === null || typeof next !== "object") return false
    cur = next as Record<string, unknown>
  }
  const last = keys[keys.length - 1]
  if (!(last in cur)) return false // only override paths that exist in defaults
  cur[last] = value
  return true
}

/** Coerce a raw editor value to the declared field type; null = reject. */
export function coerceFieldValue(type: CmsFieldType, raw: unknown): string | number | boolean | null {
  if (type === "boolean") return raw === true || raw === "true"
  if (type === "number") {
    const num = typeof raw === "number" ? raw : Number.parseFloat(String(raw ?? ""))
    return Number.isFinite(num) ? num : null
  }
  if (typeof raw !== "string") return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (type === "url" && !/^(\/|#|https?:\/\/|mailto:)/.test(trimmed)) return null
  return trimmed
}

/**
 * Apply one section's override jsonb onto a defaults object, in place.
 * Unknown section ids and undeclared field paths are ignored.
 */
export function applySectionOverrides(
  pageId: string,
  content: Record<string, unknown>,
  sectionId: string,
  rawFields: unknown,
): void {
  const section = findSection(pageId, sectionId)
  if (!section || !(sectionId in content)) return
  let fields: Record<string, unknown>
  if (typeof rawFields === "string") {
    try {
      fields = JSON.parse(rawFields) as Record<string, unknown>
    } catch {
      return
    }
  } else if (rawFields && typeof rawFields === "object") {
    fields = rawFields as Record<string, unknown>
  } else {
    return
  }
  const sectionTarget = content[sectionId]
  if (sectionTarget === null || typeof sectionTarget !== "object") return
  for (const field of section.fields) {
    if (!(field.path in fields)) continue
    const value = coerceFieldValue(field.type, fields[field.path])
    if (value === null) continue
    setByPath(sectionTarget as Record<string, unknown>, field.path, value)
  }
}

/** Sanitize an editor payload down to declared, coerced fields only. */
export function sanitizeOverrideFields(
  pageId: string,
  sectionId: string,
  rawFields: unknown,
): Record<string, string | number | boolean> | null {
  const section = findSection(pageId, sectionId)
  if (!section) return null
  if (!rawFields || typeof rawFields !== "object" || Array.isArray(rawFields)) return null
  const input = rawFields as Record<string, unknown>
  const out: Record<string, string | number | boolean> = {}
  for (const field of section.fields) {
    if (!(field.path in input)) continue
    const value = coerceFieldValue(field.type, input[field.path])
    if (value === null) continue
    out[field.path] = value
  }
  return out
}
