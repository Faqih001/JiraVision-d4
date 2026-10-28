"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ListChecks,
  Play,
  Search,
  Users,
  Video,
} from "lucide-react"

import NewsletterForm from "@/components/newsletter-form"
import { SectionBg } from "@/components/sections/section-bg"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { searchWebinars, webinarTopics, type WebinarFilter } from "@/content/webinars"

const SELF_SERVE = [
  {
    title: "Find your fit quiz",
    body: "Six questions that map your team onto the parts of JiraVision worth turning on first.",
    href: "/fit-quiz",
    cta: "Start the quiz",
  },
  {
    title: "Board templates",
    body: "Starter boards for Scrum, Kanban, agency work and platform teams — each one opens in the product.",
    href: "/templates",
    cta: "Browse templates",
  },
  {
    title: "Quick start guide",
    body: "Account, team, first task, first sprint — ten minutes using only routes that exist.",
    href: "/resources/documentation/quick-start",
    cta: "Read the guide",
  },
  {
    title: "Product changelog",
    body: "What shipped, in date order, with the page each change landed on.",
    href: "/changelog",
    cta: "See the changelog",
  },
]

const HOSTING_STEPS = [
  "Send the topic and who it is for",
  "We reply about scheduling and support",
  "Published sessions get an outline page here",
]

export default function WebinarIndex() {
  const [query, setQuery] = useState("")
  const [topic, setTopic] = useState<WebinarFilter>("all")

  const results = useMemo(() => searchWebinars(query, topic), [query, topic])
  const filtering = query.trim().length > 0 || topic !== "all"

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-surface py-16 md:py-24">
        <SectionBg variant="dots" />
        <div className="container relative">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 font-mono text-xs tracking-[0.18em] text-primary uppercase">
              <Video className="h-4 w-4" aria-hidden="true" />
              <span>Session outlines</span>
            </p>
            <h1 className="font-display text-4xl font-medium tracking-tight md:text-5xl">
              JiraVision sessions
            </h1>
            <p className="prose-body mx-auto mt-4 text-lg text-muted-foreground">
              What each session walks through, in order — with links to the documentation and the
              live product pages that cover the same ground.
            </p>
            <p className="prose-body mx-auto mt-4 rounded-lg border bg-card p-4 text-sm text-muted-foreground shadow-soft">
              No recordings are published yet. Rather than advertise videos that do not exist, each
              session below is an outline you can follow yourself in the dashboard.
            </p>

            <div className="mx-auto mt-8 max-w-md">
              <label htmlFor="webinar-search" className="sr-only">
                Search sessions
              </label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="webinar-search"
                  type="search"
                  placeholder="Search sessions..."
                  className="rounded-full bg-card pl-10"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
            </div>

            <div
              role="group"
              aria-label="Filter sessions by topic"
              className="mt-6 flex flex-wrap justify-center gap-3"
            >
              {(["all", ...webinarTopics] as WebinarFilter[]).map((option) => (
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
        </div>
      </section>

      {/* Sessions */}
      <section className="py-16 md:py-24" id="sessions">
        <div className="container">
          <div className="mb-10 md:mb-14">
            <h2 className="font-display text-3xl font-medium tracking-tight md:text-4xl">
              {filtering
                ? `${results.length} matching ${results.length === 1 ? "session" : "sessions"}`
                : "All sessions"}
            </h2>
            <p className="mt-3 text-muted-foreground">
              Outlines run 35–45 minutes when delivered live. Every step links somewhere real.
            </p>
          </div>

          {results.length === 0 ? (
            <div className="mx-auto max-w-lg rounded-lg border bg-card p-8 text-center shadow-soft">
              <p className="mb-4">No session matches that search.</p>
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
              {results.map((webinar) => (
                <article
                  key={webinar.slug}
                  className="group flex flex-col rounded-lg border bg-card p-6 shadow-soft transition-shadow hover:shadow-soft-md"
                >
                  <div className="mb-4 flex items-center gap-2">
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      {webinar.topic}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                      {webinar.durationMinutes} min
                    </span>
                  </div>

                  <h3 className="font-display text-xl font-medium transition-colors group-hover:text-primary">
                    {webinar.title}
                  </h3>
                  <p className="mt-2 mb-5 text-muted-foreground">{webinar.description}</p>

                  <p className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium">
                    <ListChecks className="h-4 w-4 text-primary" aria-hidden="true" />
                    {webinar.outline.length} steps in the outline
                  </p>
                  <ul className="mb-6 space-y-1.5 text-sm text-muted-foreground">
                    {webinar.outline.slice(0, 3).map((item) => (
                      <li key={item.title} className="flex items-start gap-2">
                        <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>{item.title}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto">
                    <Button asChild>
                      <Link href={`/resources/webinars/${webinar.slug}`}>
                        View the outline
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

      {/* Self-serve */}
      <section className="bg-surface py-16 md:py-24" id="self-serve">
        <div className="container">
          <div className="mb-10 md:mb-14">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 font-mono text-xs tracking-[0.18em] text-primary uppercase">
              <Play className="h-4 w-4" aria-hidden="true" />
              <span>On your own time</span>
            </p>
            <h2 className="font-display text-3xl font-medium tracking-tight md:text-4xl">
              Rather click through it yourself?
            </h2>
            <p className="mt-3 text-muted-foreground">
              These are interactive and live in the product — no recording required.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {SELF_SERVE.map((item) => (
              <div
                key={item.href}
                className="flex flex-col rounded-lg border bg-card p-6 shadow-soft"
              >
                <h3 className="font-display text-lg font-medium">{item.title}</h3>
                <p className="mt-2 mb-4 text-sm text-muted-foreground">{item.body}</p>
                <Link
                  href={item.href}
                  className="mt-auto inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  {item.cta} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Host a session */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="mx-auto max-w-4xl overflow-hidden rounded-lg border bg-card shadow-soft">
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="p-8 md:p-10">
                <p className="mb-6 inline-flex items-center gap-2 rounded-full bg-clay/10 px-3 py-1 font-mono text-xs tracking-[0.18em] text-clay uppercase">
                  <Users className="h-4 w-4" aria-hidden="true" />
                  <span>Share your expertise</span>
                </p>
                <h2 className="font-display text-2xl font-medium tracking-tight md:text-3xl">
                  Propose a session
                </h2>
                <p className="mt-4 text-muted-foreground">
                  Running JiraVision somewhere interesting? Tell us what you would cover and we will
                  tell you honestly whether we can schedule it.
                </p>
                <ul className="mt-6 mb-8 space-y-3">
                  {HOSTING_STEPS.map((line) => (
                    <li key={line} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
                <Button asChild>
                  <Link href="/contact">
                    Contact us
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
              <div className="relative h-64 md:h-auto">
                <Image
                  src="https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=2070&auto=format&fit=crop"
                  alt="A team presenting to a room"
                  fill
                  className="object-cover"
                  sizes="(max-width: 767px) 100vw, 50vw"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary text-primary-foreground">
        <div className="container flex flex-col items-center gap-6 py-16 text-center md:py-20">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-medium tracking-tight md:text-4xl">
              Hear about new sessions
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-primary-foreground/80 md:text-base">
              One email when a session outline or a recording is published. No tracking pixels.
            </p>
          </div>
          <div className="w-full max-w-md">
            <NewsletterForm source="webinars" inverse showHeading={false} />
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
              <Link href="/resources/documentation">Read the documentation</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
