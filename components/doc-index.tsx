"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  BarChart,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Clock,
  Code,
  FileText,
  KanbanSquare,
  Laptop,
  LifeBuoy,
  Search,
  Users,
} from "lucide-react"

import { SectionBg } from "@/components/sections/section-bg"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  docCategories,
  docsByCategory,
  getDoc,
  readingTime,
  searchDocs,
} from "@/content/documentation"
import { faqEntries, faqPopularIds } from "@/content/faq"

const CATEGORY_ICONS: Record<string, typeof FileText> = {
  FileText,
  Users,
  KanbanSquare,
  Code,
  BarChart,
  LifeBuoy,
}

/** Real integration cards from /dashboard/integrations — names only, no invented logos. */
const INTEGRATIONS = [
  { name: "Slack", note: "Incoming webhook, channel and subscribed events" },
  { name: "GitHub", note: "Repository, default branch and PR auto-linking" },
  { name: "Jira import", note: "Configuration-only in this build — use CSV" },
  { name: "Google Calendar", note: "Internal feed URL, due dates and sprints" },
  { name: "Webhooks", note: "Outbound endpoint with an optional signing secret" },
  { name: "CSV bulk tasks", note: "The real importer and exporter" },
  { name: "Zapier", note: "Catch-hook URL and trigger event" },
]

const FEATURED: { slug: string; image: string; kind: string }[] = [
  {
    slug: "quick-start",
    image: "https://images.unsplash.com/photo-1590402494610-2c378a9114c6?q=80&w=2070&auto=format&fit=crop",
    kind: "Walkthrough",
  },
  {
    slug: "ai-scrum-master-guide",
    image: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=2070&auto=format&fit=crop",
    kind: "Guide",
  },
  {
    slug: "data-export",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop",
    kind: "Reference",
  },
]

const DEV_RESOURCES = [
  {
    title: "Cookie-session REST API",
    body: "More than 120 route handlers under /api. No bearer tokens, no /v1 prefix, no API keys to rotate.",
    href: "/resources/documentation/api-authentication",
  },
  {
    title: "Realtime notifications",
    body: "A Server-Sent Events feed at /api/notifications/live pushes new rows to every open bell.",
    href: "/resources/documentation/notifications",
  },
  {
    title: "CSV and JSON export",
    body: "Any report dataset downloads as a file attachment from /api/reports/export.",
    href: "/resources/documentation/data-export",
  },
]

const SAMPLE_REQUEST = `GET /api/tasks?page=1&pageSize=2&status=in_progress
Cookie: session_id=…; user_id=…`

const SAMPLE_RESPONSE = `{
  "success": true,
  "data": [
    {
      "id": 482,
      "title": "Replace the login rate limiter",
      "status": "in_progress",
      "priority": "high",
      "storyPoints": 5,
      "assigneeId": 9,
      "sprintId": 3,
      "dueDate": "2026-11-04",
      "tags": ["tech-debt", "auth"],
      "createdAt": "2026-10-20T09:14:02Z",
      "updatedAt": "2026-10-23T16:41:55Z"
    }
  ],
  "pagination": { "page": 1, "pageSize": 2, "total": 18 }
}`

export default function DocIndex() {
  const [query, setQuery] = useState("")
  const [openFaq, setOpenFaq] = useState<string | null>(null)

  const results = useMemo(() => searchDocs(query), [query])
  const searching = query.trim().length > 0
  const faqs = useMemo(
    () =>
      faqPopularIds
        .map((id) => faqEntries.find((entry) => entry.id === id))
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
        .slice(0, 5),
    [],
  )

  return (
    <>
      {/* Hero + working search */}
      <section className="relative overflow-hidden bg-surface py-16 md:py-24">
        <SectionBg variant="grid" />
        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 font-mono text-xs tracking-[0.18em] text-primary uppercase">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              <span>Documentation</span>
            </p>
            <h1 className="font-display text-4xl font-medium tracking-tight md:text-5xl">
              JiraVision Documentation
            </h1>
            <p className="prose-body mx-auto mt-4 text-lg text-muted-foreground">
              Every guide describes a route, endpoint or setting that exists in the product.
            </p>

            <div className="relative mx-auto mt-8 max-w-md">
              <label htmlFor="docs-search" className="sr-only">
                Search documentation
              </label>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="docs-search"
                type="search"
                placeholder="Search documentation..."
                className="rounded-full bg-card pl-10"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>

            <nav aria-label="Jump to a documentation category" className="mt-6 flex flex-wrap justify-center gap-3">
              {docCategories.map((category) => (
                <Button key={category.id} variant="outline" className="rounded-full" size="sm" asChild>
                  <Link href={`#${category.id}`}>{category.title}</Link>
                </Button>
              ))}
              <Button variant="outline" className="rounded-full" size="sm" asChild>
                <Link href="#faq">FAQ</Link>
              </Button>
            </nav>
          </div>
        </div>
      </section>

      {/* Search results */}
      {searching ? (
        <section className="py-12 md:py-16" id="search-results">
          <div className="container max-w-3xl">
            <h2 className="font-display text-2xl font-medium tracking-tight md:text-3xl">
              {results.length} {results.length === 1 ? "result" : "results"} for “{query}”
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Matching titles rank first, then descriptions, then body copy.
            </p>
            {results.length === 0 ? (
              <div className="mt-6 rounded-lg border bg-card p-6 text-center shadow-soft">
                <p className="mb-4">Nothing in the catalogue matches that yet.</p>
                <Button variant="outline" onClick={() => setQuery("")}>
                  Clear search
                </Button>
              </div>
            ) : (
              <ul className="mt-6 divide-y divide-border overflow-hidden rounded-lg border bg-card shadow-soft">
                {results.map((doc) => (
                  <li key={doc.slug}>
                    <Link
                      href={`/resources/documentation/${doc.slug}`}
                      className="flex items-start gap-3 p-4 transition-colors hover:bg-surface focus-visible:bg-surface"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">{doc.title}</p>
                        <p className="text-sm text-muted-foreground">{doc.description}</p>
                      </div>
                      <ChevronRight
                        className="ml-auto mt-1 h-4 w-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ) : null}

      {/* Categories */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="mb-10 text-center md:mb-14">
            <h2 className="font-display text-3xl font-medium tracking-tight md:text-4xl">
              Browse documentation
            </h2>
            <p className="prose-body mx-auto mt-3 text-muted-foreground">
              Six categories, ordered the way teams actually adopt the product.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {docCategories.map((category) => {
              const Icon = CATEGORY_ICONS[category.icon] ?? FileText
              const docs = docsByCategory(category.id)
              return (
                <div
                  key={category.id}
                  id={category.id}
                  className="scroll-mt-24 rounded-lg border bg-card p-6 shadow-soft transition-shadow hover:shadow-soft-md"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
                  </div>
                  <h3 className="font-display text-xl font-medium">{category.title}</h3>
                  <p className="mt-2 mb-4 text-muted-foreground">{category.description}</p>
                  <ul className="space-y-2">
                    {docs.map((doc) => (
                      <li key={doc.slug}>
                        <Link
                          href={`/resources/documentation/${doc.slug}`}
                          className="group flex items-center gap-1 text-primary hover:underline"
                        >
                          <span>{doc.title}</span>
                          <ChevronRight
                            className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                            aria-hidden="true"
                          />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Featured guides */}
      <section className="bg-surface py-16 md:py-24" id="tutorials">
        <div className="container">
          <div className="mb-10 md:mb-14">
            <h2 className="font-display text-3xl font-medium tracking-tight md:text-4xl">
              Featured guides
            </h2>
            <p className="mt-3 text-muted-foreground">The three documents most teams read first.</p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {FEATURED.map(({ slug, image, kind }) => {
              const doc = getDoc(slug)
              if (!doc) return null
              return (
                <article
                  key={slug}
                  className="group overflow-hidden rounded-lg border bg-card shadow-soft transition-shadow hover:shadow-soft-md"
                >
                  <div className="relative h-48 overflow-hidden">
                    <Image
                      src={image}
                      alt=""
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-foreground/55" aria-hidden="true" />
                    <div className="absolute inset-x-4 bottom-4 text-background">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <span className="rounded-full bg-primary px-2 py-0.5 text-primary-foreground">
                          {kind}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" aria-hidden="true" />
                          {readingTime(doc)} min read
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="font-display text-xl font-medium transition-colors group-hover:text-primary">
                      {doc.title}
                    </h3>
                    <p className="mt-2 mb-4 text-muted-foreground">{doc.description}</p>
                    <Link
                      href={`/resources/documentation/${doc.slug}`}
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      Read the guide <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="py-16 md:py-24" id="integrations">
        <div className="container">
          <div className="mb-10 text-center md:mb-14">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 font-mono text-xs tracking-[0.18em] text-primary uppercase">
              <Laptop className="h-4 w-4" aria-hidden="true" />
              <span>Integrations</span>
            </p>
            <h2 className="font-display text-3xl font-medium tracking-tight md:text-4xl">
              Integration documentation
            </h2>
            <p className="prose-body mx-auto mt-3 text-muted-foreground">
              Seven connection cards, each with its own configuration schema. Two of them are
              configuration-only in this build and say so.
            </p>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {INTEGRATIONS.map((integration) => (
              <Link
                key={integration.name}
                href="/resources/documentation/integrations"
                className="rounded-lg border bg-card p-4 transition-all hover:border-primary hover:shadow-soft-md"
              >
                <p className="mb-1 font-medium">{integration.name}</p>
                <p className="text-xs text-muted-foreground">{integration.note}</p>
              </Link>
            ))}
            <div className="flex flex-col justify-center rounded-lg border border-dashed bg-card p-4">
              <p className="mb-1 font-medium">Configure them</p>
              <p className="mb-2 text-xs text-muted-foreground">
                Saved per user, with a test action and a publishable draft state.
              </p>
              <Link
                href="/dashboard/integrations"
                className="text-xs text-primary hover:underline"
              >
                Open /dashboard/integrations
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-surface py-16 md:py-24" id="faq">
        <div className="container">
          <div className="mb-10 text-center md:mb-14">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-clay/10 px-3 py-1 font-mono text-xs tracking-[0.18em] text-clay uppercase">
              <LifeBuoy className="h-4 w-4" aria-hidden="true" />
              <span>FAQ</span>
            </p>
            <h2 className="font-display text-3xl font-medium tracking-tight md:text-4xl">
              Frequently asked questions
            </h2>
            <p className="prose-body mx-auto mt-3 text-muted-foreground">
              The most-opened questions from the full FAQ.
            </p>
          </div>

          <div className="mx-auto max-w-3xl divide-y divide-border">
            {faqs.map((faq) => {
              const open = openFaq === faq.id
              return (
                <div key={faq.id} className="py-5">
                  <h3>
                    <button
                      type="button"
                      className="flex w-full cursor-pointer items-start justify-between gap-4 text-left"
                      aria-expanded={open}
                      aria-controls={`faq-panel-${faq.id}`}
                      onClick={() => setOpenFaq(open ? null : faq.id)}
                    >
                      <span className="text-lg font-medium">{faq.q}</span>
                      <span
                        className={`shrink-0 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
                        aria-hidden="true"
                      >
                        <ChevronDown className="h-5 w-5" />
                      </span>
                    </button>
                  </h3>
                  {open ? (
                    <div id={`faq-panel-${faq.id}`} className="mt-3">
                      <p className="text-muted-foreground">{faq.a}</p>
                      {faq.relatedHref ? (
                        <Link
                          href={faq.relatedHref}
                          className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          Read more <ChevronRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>

          <div className="mt-12 flex flex-wrap justify-center gap-3 text-center">
            <Button variant="outline" asChild>
              <Link href="/faq">All {faqEntries.length} questions</Link>
            </Button>
            <Button asChild>
              <Link href="/contact">Contact support</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Developer resources */}
      <section className="py-16 md:py-24" id="api">
        <div className="container">
          <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
            <div>
              <p className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 font-mono text-xs tracking-[0.18em] text-primary uppercase">
                <Code className="h-4 w-4" aria-hidden="true" />
                <span>For developers</span>
              </p>
              <h2 className="font-display text-3xl font-medium tracking-tight md:text-4xl">
                Developer resources
              </h2>
              <p className="prose-body mt-4 text-lg text-muted-foreground">
                The API the dashboard itself uses: same-origin JSON routes, cookie-session auth, and
                no key management.
              </p>
              <div className="mt-6 space-y-4">
                {DEV_RESOURCES.map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success/10">
                      <ChevronRight className="h-4 w-4 text-success" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="font-medium">{item.title}</h3>
                      <p className="text-muted-foreground">{item.body}</p>
                      <Link href={item.href} className="text-sm text-primary hover:underline">
                        Read the doc
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/resources/documentation/api-endpoints" className="flex items-center gap-2">
                    Endpoint reference <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/resources/documentation/api-overview">API overview</Link>
                </Button>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border bg-card shadow-soft">
              <p className="border-b bg-surface px-4 py-2 font-mono text-xs text-muted-foreground">
                Real request from a dashboard page
              </p>
              <pre className="overflow-x-auto bg-muted p-4 font-mono text-sm">
                <code>{SAMPLE_REQUEST}</code>
              </pre>
              <pre className="overflow-x-auto border-t bg-muted/40 p-4 font-mono text-sm">
                <code>{SAMPLE_RESPONSE}</code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary text-primary-foreground">
        <div className="container flex flex-col items-center gap-6 py-16 text-center md:py-20">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-medium tracking-tight md:text-4xl">
              Ready to get started with JiraVision?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-primary-foreground/80 md:text-base">
              Create an account and follow the quick start — it uses only routes that exist.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              size="lg"
              className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              asChild
            >
              <Link href="/signup">
                Create an account
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              asChild
            >
              <Link href="/resources/documentation/quick-start">Read the quick start</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
