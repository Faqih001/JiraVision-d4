// Server-side CMS resolver. getPageContent(pageId) returns the code-defined
// defaults for a landing page with every PUBLISHED override merged in.
// React cache() dedupes to one DB round-trip per request no matter how many
// sections call it. Never throws — a DB failure renders plain defaults.

import { cache } from "react"
import { sql } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  applySectionOverrides,
  buildDefaults,
  type AboutDefaults,
  type HomeDefaults,
  type PricingDefaults,
} from "@/lib/cms-registry"

async function resolve(pageId: string): Promise<Record<string, unknown>> {
  const content = buildDefaults(pageId)
  try {
    const rows = (await db.execute(sql`
      SELECT section_id, fields FROM cms_content_overrides
      WHERE page_id = ${pageId} AND is_published = TRUE
    `)) as unknown as { section_id: string; fields: unknown }[]
    for (const row of rows ?? []) {
      applySectionOverrides(pageId, content, row.section_id, row.fields)
    }
  } catch (error) {
    console.error(`CMS: failed to load overrides for "${pageId}", rendering defaults:`, error)
  }
  return content
}

const resolveCached = cache(resolve)

export function getPageContent(pageId: "home"): Promise<HomeDefaults>
export function getPageContent(pageId: "pricing"): Promise<PricingDefaults>
export function getPageContent(pageId: "about"): Promise<AboutDefaults>
export function getPageContent(pageId: string): Promise<Record<string, unknown>>
export function getPageContent(pageId: string): Promise<Record<string, unknown>> {
  return resolveCached(pageId)
}
