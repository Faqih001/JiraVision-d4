import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Section, SectionHeading } from "@/components/sections/section"
import { PhotoCard } from "@/components/sections/page-kit"
import {
  PageHero,
  ProblemSection,
  SplitFeature,
  MethodSection,
  FaqSection,
  RelatedSection,
  CtaSection,
} from "@/components/sections/page-kit"
import { FaqExplorer } from "./faq-explorer"
import {
  faqCategories,
  faqCategoryGuide,
  faqCountByCategory,
  faqEntries,
  faqPopularIds,
} from "@/content/faq"

export function generateMetadata(): Metadata {
  return {
    title: "FAQ — JiraVision",
    description:
      "Every question we can answer in the present tense: product, pricing, migration, company and security — searchable and filterable, with links to where you can verify each answer.",
    alternates: { canonical: "/faq" },
  }
}

// The explorer island keeps its own UI state; re-keying it on query-param
// navigation (category cards below) remounts it with the new initial values —
// no setState-in-effect needed, and useSearchParams stays inside Suspense.
export default async function FaqPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>
}) {
  const params = await searchParams
  const islandKey = `${params.q ?? ""}|${params.category ?? ""}`
  const popular = faqPopularIds
    .map((id) => faqEntries.find((e) => e.id === id))
    .filter((e): e is (typeof faqEntries)[number] => Boolean(e))
    .map((e) => ({ q: e.q, a: e.a }))

  return (
    <>
      <PageHero
        eyebrow="Support"
        title="Answers we can give in the present tense"
        subtitle="Every question collected from our product, pricing, security and company pages — searchable, filterable by category, and honest about what doesn't exist yet."
        bullets={[
          `${faqEntries.length} questions across ${faqCategories.length} categories`,
          "Live search plus deep links — /faq?q=… opens with the search applied",
          "Every category links out to where you can verify the answer",
        ]}
        primary={{ label: "Ask a new question", href: "/contact" }}
        secondary={{ label: "Browse by category", href: "#categories" }}
        badge="No invented answers"
      />

      <FaqSection
        title="The questions we hear most"
        items={popular}
        moreHref="#faq"
        moreLabel="Search and filter all questions"
        bg="dots"
      />

      <Section id="categories" bg="grain">
        <SectionHeading
          eyebrow="Browse by category"
          title="Five kinds of questions"
          intro="Each category below opens the filter with the questions that live there."
        />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {faqCategories.map((cat) => (
            <div key={cat} className="flex flex-col rounded-lg border bg-card p-6 shadow-soft">
              <h3 className="font-display text-lg font-medium tracking-tight">{cat}</h3>
              <p className="mt-1 font-mono text-xs text-clay">
                {faqCountByCategory[cat]} {faqCountByCategory[cat] === 1 ? "question" : "questions"}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {faqCategoryGuide[cat].blurb}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                {faqCategoryGuide[cat].links.slice(0, 3).map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:border-primary hover:text-primary"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
              <Link
                href={`/faq?category=${encodeURIComponent(cat)}#faq`}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                All {cat.toLowerCase()} questions
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          ))}
        </div>
      </Section>

      <Suspense
        fallback={
          <Section bg="band-sage">
            <SectionHeading eyebrow="Search & filter" title="Every question, filterable" />
            <p className="text-sm text-muted-foreground">Loading the question explorer…</p>
          </Section>
        }
      >
        <FaqExplorer key={islandKey} />
      </Suspense>

      <SplitFeature
        index="01"
        title="The question behind every question"
        body="Strip the wording and most FAQs ask the same thing: will this make my team worse off? Our answers keep pointing at the three defaults you can check yourself, on every product page, before you trust a single sentence here."
        bullets={[
          "Human approval is the only write path — reads are automated, writes are not",
          "Individual signals are aggregated to team level before anyone sees them",
          "Every metric card prints its formula, sources and exclusions",
        ]}
        visual={<PhotoCard photoId="photo-1531482615713-2afd69097998" alt="Two colleagues approving items on a shared screen" />}
        bg="grid"
      />

      <MethodSection
        title="How we answer the hard ones"
        intro="The rules this page was compiled under — the same ones the product pages follow."
        rows={[
          { label: "Present tense only", detail: "If it isn't shipped, we say planned. Jira is the live integration; GitHub, GitLab and Slack are roadmap items labelled as such on the product pages." },
          { label: "Receipts over claims", detail: "Security answers point at product defaults you can verify — approval gates, aggregation before display, formula-on-card — not badges we don't hold yet." },
          { label: "Numbers live in one place", detail: "Pricing answers here never quote figures we haven't published on /pricing. When terms aren't finalised, the answer says so instead of guessing." },
          { label: "A human finishes the loop", detail: "Anything this page can't answer goes to /contact, where it lands with the people who build the product — support and partnerships included." },
        ]}
        bg="contour"
      />

      <ProblemSection
        eyebrow="House rules"
        title="What this page won't do"
        items={[
          { title: "No imaginary forums", body: "We won't send you to a community we don't have. There's no self-serve user group yet — the route to other humans is /contact, and it reaches the team that builds the product." },
          { title: "No invented compliance badges", body: "SOC 2 and GDPR status is stated in the present tense, even when the honest answer is 'not yet, and here's what we do have instead'." },
          { title: "No benchmark fiction", body: "We'd rather show you your own trend with the formula visible than quote an industry number we made up to settle an argument." },
        ]}
        bg="hatch"
      />

      <Section bg="band-clay">
        <div className="flex flex-col items-start justify-between gap-6 rounded-lg border bg-card p-6 shadow-soft md:flex-row md:items-center">
          <div className="max-w-xl">
            <h2 className="font-display text-xl font-medium tracking-tight">Still stuck?</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              To be straight with you: there's no community forum to point you at — we're
              too small to pretend otherwise. What exists is a contact page where support,
              demos and quote requests all land with people who work on the product, and a
              status page you can watch instead of asking "is it me or is it you?".
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="rounded-full">
              <Link href="/contact">
                Contact the team
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/status">Service status</Link>
            </Button>
          </div>
        </div>
      </Section>

      <RelatedSection
        title="Verify the answers"
        items={[
          { title: "Changelog", href: "/changelog", summary: "Every release, written up newest-first — the real milestone list behind anything this page claims." },
          { title: "Status", href: "/status", summary: "Live service health for the site, dashboard, Jira sync and notifications." },
          { title: "Privacy policy", href: "/privacy", summary: "The retention terms the pricing and security answers defer to." },
          { title: "Documentation", href: "/resources/documentation", summary: "Setup, integration and data-handling detail for the technically curious." },
          { title: "About us", href: "/about", summary: "Who the team is, where it's based and how funding actually stands." },
          { title: "Contact", href: "/contact", summary: "Message, demo booking and quote request — three tabs, one real inbox." },
        ]}
        bg="shapes"
      />

      <CtaSection
        title="Question not covered? Ask the people who build it"
        body="The contact page has three tabs — plain message, book a demo, request a quote — and every one lands with the small team behind the product, not a ticket queue."
        primary={{ label: "Talk to us", href: "/contact" }}
        secondary={{ label: "See pricing", href: "/pricing" }}
        bg="inverse"
        watermark="Q"
      />
    </>
  )
}
