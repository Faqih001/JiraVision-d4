import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronRight,
  ExternalLink,
  Gauge,
  ListChecks,
  TriangleAlert,
} from "lucide-react"

import { SectionBg } from "@/components/sections/section-bg"
import { Button } from "@/components/ui/button"
import { caseStudySlugs, getCaseStudy, relatedCaseStudies } from "@/content/case-studies"
import { getDoc } from "@/content/documentation"

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return caseStudySlugs().map((slug) => ({ slug }))
}

export const dynamicParams = false

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const study = getCaseStudy(slug)
  if (!study) return { title: "Scenario not found", robots: { index: false, follow: true } }
  return {
    title: study.title,
    description: study.summary,
    alternates: { canonical: `/resources/case-studies/${slug}` },
    openGraph: {
      title: study.title,
      description: study.summary,
      type: "article",
      url: `/resources/case-studies/${slug}`,
    },
  }
}

export default async function CaseStudyPage({ params }: Props) {
  const { slug } = await params
  const study = getCaseStudy(slug)
  if (!study) notFound()

  // The setup steps and the related list can name the same doc; show each once.
  const referencedDocs = Array.from(
    new Set([...study.setup.map((step) => step.doc), ...study.relatedDocs]),
  )
    .filter((docSlug): docSlug is string => Boolean(docSlug))
    .map((docSlug) => getDoc(docSlug))
    .filter((doc): doc is NonNullable<typeof doc> => Boolean(doc))
  const others = relatedCaseStudies(slug)
  const teamName = study.team.split(" — ")[0]

  return (
    <>
      {/* Header */}
      <section className="relative overflow-hidden bg-surface py-12 md:py-16">
        <SectionBg variant="contour" />
        <div className="container relative">
          <nav aria-label="Breadcrumb" className="mb-6">
            <Link
              href="/resources/case-studies"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              All scenarios
            </Link>
          </nav>

          <div className="max-w-3xl">
            <p className="mb-3 inline-flex items-center rounded-full bg-primary/10 px-3 py-1 font-mono text-xs tracking-[0.18em] text-primary uppercase">
              {study.topic}
            </p>
            <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
              Illustrative scenario · {study.team}
            </p>
            <h1 className="mt-2 font-display text-4xl font-medium tracking-tight md:text-5xl">
              {study.title}
            </h1>
            <p className="prose-body mt-4 text-lg text-muted-foreground">{study.summary}</p>

            <dl className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {study.shape.map((item) => (
                <div key={item.label} className="rounded-lg border bg-card p-4 shadow-soft">
                  <dt className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
                    {item.label}
                  </dt>
                  <dd className="mt-1 text-sm">{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="py-12 md:py-16">
        <div className="container">
          <div className="mb-10 rounded-lg border border-clay/30 bg-clay/10 p-5">
            <p className="flex items-start gap-3 text-sm">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-clay" aria-hidden="true" />
              <span>
                <strong className="font-semibold">{teamName} is a fictitious team.</strong> This is
                not a customer story and contains no result figures or attributed quotes. What it
                does contain is real: every route below exists in the product, and every measure
                states where its number is computed.
              </span>
            </p>
          </div>

          <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <h2 className="font-display text-2xl font-medium tracking-tight md:text-3xl">
                Where it starts
              </h2>
              <ul className="mt-6 space-y-3">
                {study.situation.map((line) => (
                  <li
                    key={line}
                    className="flex items-start gap-3 rounded-lg border bg-card p-4 shadow-soft"
                  >
                    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-clay" aria-hidden="true" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>

              <h2 className="mt-12 inline-flex items-center gap-2 font-display text-2xl font-medium tracking-tight md:text-3xl">
                <ListChecks className="h-6 w-6 text-primary" aria-hidden="true" />
                What to turn on, in order
              </h2>
              <p className="mt-2 text-muted-foreground">
                Order matters — each step assumes the one before it is already in place.
              </p>

              <ol className="mt-8 space-y-6">
                {study.setup.map((step, index) => {
                  const doc = step.doc ? getDoc(step.doc) : null
                  return (
                    <li key={step.title} className="flex gap-4">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-sm text-primary">
                        {index + 1}
                      </span>
                      <div className="flex-1 rounded-lg border bg-card p-5 shadow-soft">
                        <h3 className="font-display text-lg font-medium">{step.title}</h3>
                        <p className="mt-2 leading-relaxed text-muted-foreground">{step.detail}</p>
                        <div className="mt-4 flex flex-wrap gap-3">
                          {step.route ? (
                            <Button size="sm" variant="outline" asChild>
                              <Link href={step.route}>
                                Open {step.route}
                                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                              </Link>
                            </Button>
                          ) : null}
                          {doc ? (
                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/resources/documentation/${doc.slug}`}>
                                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                                {doc.title}
                              </Link>
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ol>

              <h2 className="mt-12 inline-flex items-center gap-2 font-display text-2xl font-medium tracking-tight md:text-3xl">
                <Gauge className="h-6 w-6 text-primary" aria-hidden="true" />
                What to watch
              </h2>
              <p className="mt-2 text-muted-foreground">
                No target values. Each row says where the number is computed and what feeds it, so
                you can decide what good looks like on your own data.
              </p>

              <div className="mt-6 overflow-x-auto rounded-lg border bg-card shadow-soft">
                <table className="w-full text-sm">
                  <caption className="sr-only">
                    Measures and where each one is computed
                  </caption>
                  <thead className="bg-surface text-left">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Measure
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Where the number comes from
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {study.measures.map((measure) => (
                      <tr key={measure.label}>
                        <th scope="row" className="px-4 py-3 text-left align-top font-medium">
                          {measure.label}
                        </th>
                        <td className="px-4 py-3 align-top text-muted-foreground">{measure.how}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <aside className="space-y-8 lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-lg border bg-card p-6 shadow-soft">
                <h2 className="mb-4 inline-flex items-center gap-2 font-display text-lg font-medium">
                  <BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />
                  Documentation used here
                </h2>
                <ul className="space-y-3">
                  {referencedDocs.map((doc) => (
                    <li key={doc.slug}>
                      <Link
                        href={`/resources/documentation/${doc.slug}`}
                        className="group block text-sm"
                      >
                        <span className="inline-flex items-center gap-1 font-medium text-primary group-hover:underline">
                          {doc.title}
                          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                        <span className="mt-0.5 block text-muted-foreground">
                          {doc.description}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                {study.relatedProduct ? (
                  <Link
                    href={study.relatedProduct}
                    className="mt-5 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    Product page <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                ) : null}
              </div>

              <div className="rounded-lg border bg-card p-6 shadow-soft">
                <h2 className="mb-4 font-display text-lg font-medium">Other scenarios</h2>
                <ul className="space-y-4">
                  {others.map((item) => (
                    <li key={item.slug}>
                      <Link
                        href={`/resources/case-studies/${item.slug}`}
                        className="group -m-2 block rounded-md p-2 hover:bg-surface"
                      >
                        <span className="block font-medium group-hover:text-primary">
                          {item.title}
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {item.team} · {item.topic}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/resources/case-studies"
                  className="mt-5 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  All scenarios <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary text-primary-foreground">
        <div className="container flex flex-col items-center gap-6 py-16 text-center md:py-20">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-medium tracking-tight md:text-4xl">
              Walk this scenario on your own workspace
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-primary-foreground/80 md:text-base">
              Every route above is live. The fit quiz will tell you which of these scenarios is
              closest to your team before you start.
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
              <Link href="/fit-quiz">Take the fit quiz</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
