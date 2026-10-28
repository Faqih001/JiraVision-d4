import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Heart, Sprout } from "lucide-react"

import { Section, SectionHeading, Reveal } from "@/components/sections/section"
import { CareersBoard } from "@/components/features/careers-board"
import { Button } from "@/components/ui/button"
import { careersBenefits, careersValues, jobOpenings } from "@/content/careers"

export const metadata: Metadata = {
  title: "Careers — JiraVision",
  description:
    "Join a remote-first team building calmer, fairer project management. See open roles or send a general application.",
  openGraph: {
    title: "Careers at JiraVision",
    description: "Remote-first, Kenya-rooted, humane by design. See open roles.",
    url: "https://jiravision.vercel.app/careers",
  },
}

export default function CareersPage() {
  return (
    <>
      <Section bg="grain" className="pt-20 md:pt-28">
        <div className="max-w-3xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-clay">Careers</p>
          <h1 className="font-display text-4xl font-medium tracking-tight md:text-5xl">
            Build calmer software — and live calmer work
          </h1>
          <p className="prose-body mt-4 max-w-2xl">
            We&rsquo;re a small remote-first team making project management humane: wellbeing-aware planning,
            explainable AI, fairness metrics. If that sounds like your kind of craft, we&rsquo;d like to meet you.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <a href="#openings">
                View open roles
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </a>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/about">How we work</Link>
            </Button>
          </div>
        </div>
      </Section>

      <Section bg="grid">
        <SectionHeading eyebrow="Why us" title="What we optimize for" />
        <div className="grid gap-6 md:grid-cols-3">
          {careersValues.map((v, i) => (
            <Reveal key={v.title}>
              <div className="h-full rounded-2xl border border-border bg-surface p-6">
                <span className="font-display text-2xl text-clay" aria-hidden="true">
                  0{i + 1}
                </span>
                <h3 className="mt-2 font-display text-lg font-medium">{v.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{v.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section bg="band-sage">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <Reveal>
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border">
              <Image
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80"
                alt="A small distributed team collaborating around a table"
                fill
                className="object-cover"
                sizes="(max-width: 1023px) 100vw, 50vw"
              />
            </div>
          </Reveal>
          <div>
            <SectionHeading eyebrow="Benefits" title="What we offer" />
            <ul className="space-y-4">
              {careersBenefits.map((b) => (
                <li key={b.title} className="flex items-start gap-3">
                  <Sprout className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <div>
                    <p className="font-medium">{b.title}</p>
                    <p className="text-sm text-muted-foreground">{b.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section id="openings" bg="contour">
        <SectionHeading
          eyebrow="Open roles"
          title="Current openings"
          intro="Filter by department or search for something specific. Every application gets a human read."
        />
        <div className="max-w-4xl">
          <CareersBoard jobs={jobOpenings} />
        </div>
      </Section>

      <Section bg="inverse" watermark="J" className="text-center">
        <Heart className="mx-auto h-6 w-6" aria-hidden="true" />
        <h2 className="mx-auto mt-4 max-w-xl font-display text-3xl font-medium tracking-tight">
          Not seeing your role? Say hello anyway
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          We hire for judgment and kindness as much as skills. The general application at the top of the
          board reaches the same inbox.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild variant="secondary" size="lg">
            <a href="#openings">Send a general application</a>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
          >
            <Link href="/contact">Contact the team</Link>
          </Button>
        </div>
      </Section>
    </>
  )
}
