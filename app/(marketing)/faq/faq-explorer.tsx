"use client"

// Client island for /faq: category chips + live search + grouped accordions.
// Initial values come from ?q= / ?category= (deep-links from the search
// palette); updates flow through history.replaceState so React state is only
// ever set from event handlers — never inside an effect (the repo's
// useSyncExternalStore/localStorage discipline in site-search.tsx, applied to
// URL state instead).

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { useMemo, useState } from "react"
import { ArrowRight, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FaqAccordion } from "@/components/sections/faq-accordion"
import { Section, SectionHeading } from "@/components/sections/section"
import {
  faqCategories,
  faqCategoryGuide,
  faqEntries,
  type FaqCategory,
} from "@/content/faq"
import { cn } from "@/lib/utils"

type CatFilter = FaqCategory | "All"

function categoryFromParam(raw: string | null): CatFilter {
  return faqCategories.includes(raw as FaqCategory) ? (raw as FaqCategory) : "All"
}

export function FaqExplorer() {
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(() => searchParams?.get("q") ?? "")
  const [category, setCategory] = useState<CatFilter>(() =>
    categoryFromParam(searchParams?.get("category") ?? null),
  )

  // Keep the URL shareable without triggering a router navigation: the page is
  // keyed on server-side searchParams, so history.replaceState is safe here.
  const syncUrl = (q: string, cat: CatFilter) => {
    const params = new URLSearchParams()
    const trimmed = q.trim()
    if (trimmed) params.set("q", trimmed)
    if (cat !== "All") params.set("category", cat)
    const next = params.toString() ? `/faq?${params.toString()}` : "/faq"
    window.history.replaceState(null, "", next)
  }

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    return faqEntries.filter((e) => {
      if (category !== "All" && e.category !== category) return false
      if (!q) return true
      return `${e.q} ${e.a}`.toLowerCase().includes(q)
    })
  }, [query, category])

  const groups = useMemo(
    () =>
      faqCategories
        .map((cat) => ({
          cat,
          items: matches.filter((e) => e.category === cat),
        }))
        .filter((g) => g.items.length > 0),
    [matches],
  )

  return (
    <Section id="faq" bg="band-sage">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <SectionHeading
          className="mb-0"
          eyebrow="Search & filter"
          title="Every question, filterable"
          intro="Search the full set or narrow by category. Deep links work too — /faq?q=your+question opens with the search applied."
        />
        <p className="font-mono text-xs text-muted-foreground" aria-live="polite">
          {matches.length} of {faqEntries.length} shown
        </p>
      </div>

      <div className="relative mb-6 max-w-xl">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <label htmlFor="faq-search" className="sr-only">
          Search frequently asked questions
        </label>
        <input
          id="faq-search"
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            syncUrl(e.target.value, category)
          }}
          placeholder="Search answers — try “approval”, “burnout”, “annual billing”…"
          className="w-full rounded-full border border-input bg-background py-2.5 pl-10 pr-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="mb-10 flex flex-wrap gap-2" role="group" aria-label="Filter questions by category">
        {(["All", ...faqCategories] as const).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => {
              setCategory(cat)
              syncUrl(query, cat)
            }}
            aria-pressed={category === cat}
            className={cn(
              "min-h-[40px] rounded-full border px-4 text-sm transition-colors",
              category === cat
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:border-foreground/30",
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <div className="max-w-xl rounded-lg border bg-card p-6 shadow-soft">
          <h3 className="font-display text-lg font-medium tracking-tight">
            No answer matches “{query.trim()}”
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Try a shorter phrase, or widen the category. If it genuinely isn't here,
            it isn't invented either — ask a human and you'll get a direct answer.
          </p>
          <Button asChild size="sm" className="mt-4 rounded-full">
            <Link href="/contact">
              Ask the team
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-12">
          {groups.map((group) => (
            <div key={group.cat}>
              <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h3 className="font-display text-xl font-medium tracking-tight">{group.cat}</h3>
                <p className="text-xs text-muted-foreground">
                  {group.items.length} {group.items.length === 1 ? "question" : "questions"}
                </p>
              </div>
              <FaqAccordion items={group.items.map((e) => ({ q: e.q, a: e.a }))} />
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Related
                </span>
                {faqCategoryGuide[group.cat].links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-full border bg-card px-3 py-1 text-xs font-medium transition-colors hover:border-primary hover:text-primary"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  )
}
