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
      <section className="py-16 bg-gradient-to-b from-slate-50 to-white relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-slate-200 [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]" />
        <div className="container relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary mb-6">
              <BookOpen className="h-4 w-4" />
              <span>Documentation</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">JiraVision Documentation</h1>
            <p className="text-xl text-muted-foreground mb-8">
              Every guide describes a route, endpoint or setting that exists in the product
            </p>

            <div className="relative max-w-md mx-auto mb-6">
              <label htmlFor="docs-search" className="sr-only">
                Search documentation
              </label>
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <Input
                id="docs-search"
                type="search"
                placeholder="Search documentation..."
                className="pl-10 rounded-full"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              {docCategories.map((category) => (
                <Button key={category.id} variant="outline" className="rounded-full" size="sm" asChild>
                  <Link href={`#${category.id}`}>{category.title}</Link>
                </Button>
              ))}
              <Button variant="outline" className="rounded-full" size="sm" asChild>
                <Link href="#faq">FAQ</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Search results */}
      {searching ? (
        <section className="py-12 bg-white" id="search-results">
          <div className="container max-w-3xl">
            <h2 className="text-2xl font-bold mb-1">
              {results.length} {results.length === 1 ? "result" : "results"} for “{query}”
            </h2>
            <p className="text-muted-foreground mb-6 text-sm">
              Matching titles rank first, then descriptions, then body copy.
            </p>
            {results.length === 0 ? (
              <div className="rounded-xl border border-slate-200 p-6 text-center">
                <p className="mb-4">Nothing in the catalogue matches that yet.</p>
                <Button variant="outline" onClick={() => setQuery("")}>
                  Clear search
                </Button>
              </div>
            ) : (
              <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200">
                {results.map((doc) => (
                  <li key={doc.slug}>
                    <Link
                      href={`/resources/documentation/${doc.slug}`}
                      className="flex items-start gap-3 p-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">{doc.title}</p>
                        <p className="text-sm text-muted-foreground">{doc.description}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 mt-1 ml-auto shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ) : null}

      {/* Categories */}
      <section className="py-16 bg-white">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-2">Browse Documentation</h2>
            <p className="text-muted-foreground">Choose a category to get started</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {docCategories.map((category) => {
              const Icon = CATEGORY_ICONS[category.icon] ?? FileText
              const docs = docsByCategory(category.id)
              return (
                <div
                  key={category.id}
                  id={category.id}
                  className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow scroll-mt-24"
                >
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{category.title}</h3>
                  <p className="text-muted-foreground mb-4">{category.description}</p>
                  <ul className="space-y-2">
                    {docs.map((doc) => (
                      <li key={doc.slug}>
                        <Link
                          href={`/resources/documentation/${doc.slug}`}
                          className="text-primary hover:underline flex items-center gap-1 group"
                        >
                          <span>{doc.title}</span>
                          <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
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
      <section className="py-16 bg-slate-50" id="tutorials">
        <div className="container">
          <div className="mb-12">
            <h2 className="text-3xl font-bold mb-2">Featured Guides</h2>
            <p className="text-muted-foreground">The three documents most teams read first</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {FEATURED.map(({ slug, image, kind }) => {
              const doc = getDoc(slug)
              if (!doc) return null
              return (
                <div
                  key={slug}
                  className="group bg-white rounded-xl overflow-hidden shadow-md border border-slate-100"
                >
                  <div className="h-48 relative overflow-hidden">
                    <Image
                      src={image}
                      alt=""
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <span className="bg-primary/80 rounded-full px-2 py-0.5">{kind}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {readingTime(doc)} min read
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                      {doc.title}
                    </h3>
                    <p className="text-muted-foreground mb-4">{doc.description}</p>
                    <Link
                      href={`/resources/documentation/${doc.slug}`}
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      Read the guide <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="py-16 bg-white" id="integrations">
        <div className="container">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary mb-4">
              <Laptop className="h-4 w-4" />
              <span>Integrations</span>
            </div>
            <h2 className="text-3xl font-bold mb-2">Integration Documentation</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Seven connection cards, each with its own configuration schema. Two of them are
              configuration-only in this build and say so.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {INTEGRATIONS.map((integration) => (
              <Link
                key={integration.name}
                href="/resources/documentation/integrations"
                className="bg-white rounded-xl border border-slate-200 p-4 hover:border-primary hover:shadow-md transition-all"
              >
                <p className="font-medium mb-1">{integration.name}</p>
                <p className="text-xs text-muted-foreground">{integration.note}</p>
              </Link>
            ))}
            <div className="rounded-xl border border-dashed border-slate-300 p-4 flex flex-col justify-center">
              <p className="font-medium mb-1">Configure them</p>
              <p className="text-xs text-muted-foreground mb-2">
                Saved per user, with a test action and a publishable draft state.
              </p>
              <Link href="/dashboard/integrations" className="text-primary text-xs hover:underline">
                Open /dashboard/integrations
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-slate-50" id="faq">
        <div className="container">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-700 mb-4">
              <LifeBuoy className="h-4 w-4" />
              <span>FAQ</span>
            </div>
            <h2 className="text-3xl font-bold mb-2">Frequently Asked Questions</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              The most-opened questions from the full FAQ
            </p>
          </div>

          <div className="max-w-3xl mx-auto divide-y divide-slate-200">
            {faqs.map((faq) => {
              const open = openFaq === faq.id
              return (
                <div key={faq.id} className="py-5">
                  <button
                    type="button"
                    className="flex w-full justify-between items-start gap-4 text-left font-medium cursor-pointer"
                    aria-expanded={open}
                    aria-controls={`faq-panel-${faq.id}`}
                    onClick={() => setOpenFaq(open ? null : faq.id)}
                  >
                    <span className="text-lg font-semibold">{faq.q}</span>
                    <span className={`transition shrink-0 ${open ? "rotate-180" : ""}`}>
                      <ChevronDown className="h-5 w-5" />
                    </span>
                  </button>
                  {open ? (
                    <div id={`faq-panel-${faq.id}`} className="mt-3">
                      <p className="text-muted-foreground">{faq.a}</p>
                      {faq.relatedHref ? (
                        <Link
                          href={faq.relatedHref}
                          className="inline-flex items-center gap-1 mt-3 text-primary hover:underline text-sm"
                        >
                          Read more <ChevronRight className="h-4 w-4" />
                        </Link>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>

          <div className="text-center mt-12 flex flex-wrap justify-center gap-3">
            <Button variant="outline" asChild>
              <Link href="/faq">All {faqEntries.length} questions</Link>
            </Button>
            <Button asChild>
              <Link href="/contact">Contact Support</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Developer resources */}
      <section className="py-16 bg-white" id="api">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary mb-6">
                <Code className="h-4 w-4" />
                <span>For Developers</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Developer Resources</h2>
              <p className="text-lg text-muted-foreground mb-6">
                The API the dashboard itself uses: same-origin JSON routes, cookie-session auth, and no
                key management.
              </p>
              <div className="space-y-4">
                {[
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
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mt-0.5 shrink-0">
                      <ChevronRight className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{item.title}</h3>
                      <p className="text-muted-foreground">{item.body}</p>
                      <Link href={item.href} className="text-primary text-sm hover:underline">
                        Read the doc
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/resources/documentation/api-endpoints" className="flex items-center gap-2">
                    Endpoint reference <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/resources/documentation/api-overview">API overview</Link>
                </Button>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
              <div className="bg-slate-900 rounded-t-lg p-4 text-white font-mono text-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500" />
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <span className="text-slate-400 text-xs ml-2">Real request from a dashboard page</span>
                </div>
                <pre className="text-green-400">GET /api/tasks?page=1&pageSize=2&status=in_progress</pre>
                <pre className="text-slate-400 mt-2">Cookie: session_id=…; user_id=…</pre>
              </div>
              <div className="bg-white rounded-b-lg p-4 border-x border-b border-slate-200 font-mono text-sm">
                <pre className="text-slate-800 whitespace-pre-wrap">
                  {`{
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
}`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-primary/90 to-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
        <div className="container relative z-10">
          <div className="max-w-3xl mx-auto text-center text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to get started with JiraVision?</h2>
            <p className="text-white/80 text-lg mb-8">
              Create an account and follow the quick start — it uses only routes that exist.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" variant="secondary" asChild>
                <Link href="/signup">Create an account</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent text-white border-white hover:bg-white/10"
                asChild
              >
                <Link href="/resources/documentation/quick-start">Read the quick start</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
