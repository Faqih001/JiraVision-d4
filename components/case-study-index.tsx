"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  Building2,
  ChevronRight,
  ListChecks,
  Search,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react"

import { SectionBg } from "@/components/sections/section-bg"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  caseStudyTopics,
  searchCaseStudies,
  type CaseStudyFilter,
} from "@/content/case-studies"

export default function CaseStudyIndex() {
  const [query, setQuery] = useState("")
  const [topic, setTopic] = useState<CaseStudyFilter>("all")

  const results = useMemo(() => searchCaseStudies(query, topic), [query, topic])
  const filtering = query.trim().length > 0 || topic !== "all"

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-surface py-16 md:py-24">
        <SectionBg variant="shapes" />
        <div className="container relative">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 font-mono text-xs tracking-[0.18em] text-primary uppercase">
              <Building2 className="h-4 w-4" aria-hidden="true" />
              <span>Deployment scenarios</span>
            </p>
            <h1 className="font-display text-4xl font-medium tracking-tight md:text-5xl">
              How teams like yours set JiraVision up
            </h1>
            <p className="prose-body mx-auto mt-4 text-lg text-muted-foreground">
              Three worked scenarios: the situation, the settings to turn on in order, and the
              numbers worth watching — each one linking to the real route it configures.
            </p>
          </div>

          {/* Honesty banner */}
          <div className="mx-auto mt-10 max-w-3xl rounded-lg border border-clay/30 bg-clay/10 p-5">
            <p className="flex items-start gap-3 text-sm">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-clay" aria-hidden="true" />
              <span>
                <strong className="font-semibold">These are illustrative scenarios, not customer
                stories.</strong>{" "}
                Acme, GlobalTech and StartupX are fictitious teams. We publish no invented result
                percentages and no attributed quotes, because we have not yet been given permission
                to name a real customer. When we are, the reference appears here with its
                attribution — until then, everything below describes what the product does and where
                the numbers come from.
              </span>
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-md">
            <label htmlFor="case-study-search" className="sr-only">
              Search scenarios
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="case-study-search"
                type="search"
                placeholder="Search scenarios..."
                className="rounded-full bg-card pl-10"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>

          <div
            role="group"
            aria-label="Filter scenarios by topic"
            className="mt-6 flex flex-wrap justify-center gap-3"
          >
            {(["all", ...caseStudyTopics] as CaseStudyFilter[]).map((option) => (
              <Button
                key={option}
                variant={topic === option ? "default" : "outline"}
                className="rounded-full"
                size="sm"
                onClick={() => setTopic(option)}
                aria-pressed={topic === option}
              >
                {option === "all" ? "All topics" : option}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Scenarios */}
      <section className="py-16 md:py-24" id="scenarios">
        <div className="container">
          <div className="mb-10 md:mb-14">
            <h2 className="font-display text-3xl font-medium tracking-tight md:text-4xl">
              {filtering
                ? `${results.length} matching ${results.length === 1 ? "scenario" : "scenarios"}`
                : "All scenarios"}
            </h2>
            <p className="mt-3 text-muted-foreground">
              Each scenario names the settings, in the order they should be turned on.
            </p>
          </div>

          {results.length === 0 ? (
            <div className="mx-auto max-w-lg rounded-lg border bg-card p-8 text-center shadow-soft">
              <p className="mb-4">No scenario matches that search.</p>
              <Button
                variant="outline"
                onClick={() => {
                  setQuery("")
                  setTopic("all")
                }}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              {results.map((study) => (
                <article
                  key={study.slug}
                  className="group flex flex-col rounded-lg border bg-card p-6 shadow-soft transition-shadow hover:shadow-soft-md"
                >
                  <div className="mb-4 flex items-center gap-2">
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      {study.topic}
                    </span>
                  </div>

                  <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
                    {study.team}
                  </p>
                  <h3 className="mt-2 font-display text-xl font-medium transition-colors group-hover:text-primary">
                    {study.title}
                  </h3>
                  <p className="mt-2 mb-5 text-muted-foreground">{study.summary}</p>

                  <p className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium">
                    <ListChecks className="h-4 w-4 text-primary" aria-hidden="true" />
                    {study.setup.length} setup steps · {study.measures.length} measures
                  </p>
                  <ul className="mb-6 space-y-1.5 text-sm text-muted-foreground">
                    {study.situation.slice(0, 3).map((line) => (
                      <li key={line} className="flex items-start gap-2">
                        <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto">
                    <Button asChild>
                      <Link href={`/resources/case-studies/${study.slug}`}>
                        Read the scenario
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* What we will not claim */}
      <section className="bg-surface py-16 md:py-24" id="honesty">
        <div className="container">
          <div className="mb-10 md:mb-14">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-clay/10 px-3 py-1 font-mono text-xs tracking-[0.18em] text-clay uppercase">
              <ShieldAlert className="h-4 w-4" aria-hidden="true" />
              <span>What we will not claim</span>
            </p>
            <h2 className="font-display text-3xl font-medium tracking-tight md:text-4xl">
              The measurements we refuse to publish
            </h2>
            <p className="prose-body mt-3 text-muted-foreground">
              A case study is only worth reading if you can check it. These are the claims you will
              not find anywhere on this site.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              {
                title: "No result percentages",
                body: "No '35% productivity increase'. Every measure in these scenarios states where the number is computed and which events feed it, so you can reproduce it on your own workspace instead of trusting ours.",
              },
              {
                title: "No attributed quotes",
                body: "No named executive praising the product. QuotesSection elsewhere on the site carries a standing disclaimer for the same reason: we publish attributed testimonials only with permission.",
              },
              {
                title: "No surveillance metrics",
                body: "No lines of code, no per-person velocity, no keyboard-time or activity scores, and no default ranking of people against each other. The refusal list is a product decision, not a marketing line.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-lg border bg-card p-6 shadow-soft">
                <h3 className="font-display text-lg font-medium">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Button variant="outline" asChild>
              <Link href="/resources/documentation/ethical-metrics">
                Read the ethical metrics guide
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/products/ethical-metrics">See the product page</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Build your own */}
      <section className="py-16 md:py-24" id="plan">
        <div className="container">
          <div className="mx-auto grid max-w-4xl grid-cols-1 items-center gap-8 md:grid-cols-[1fr_auto]">
            <div>
              <h2 className="font-display text-2xl font-medium tracking-tight md:text-3xl">
                Work out your own rollout instead
              </h2>
              <p className="mt-3 text-muted-foreground">
                The fit quiz asks six questions and maps your team onto the modules worth turning on
                first. The migration planner estimates the import effort from your current tracker.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link href="/fit-quiz">
                  Take the fit quiz
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/migration">Migration planner</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary text-primary-foreground">
        <div className="container flex flex-col items-center gap-6 py-16 text-center md:py-20">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-medium tracking-tight md:text-4xl">
              Try the scenario on a real workspace
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-primary-foreground/80 md:text-base">
              Every route these scenarios link to is live in the product. Create an account and walk
              one of them yourself.
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
