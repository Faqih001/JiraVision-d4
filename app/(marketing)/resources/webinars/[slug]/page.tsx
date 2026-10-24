import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarClock,
  ChevronRight,
  ExternalLink,
  Video,
} from "lucide-react"

import NewsletterForm from "@/components/newsletter-form"
import { SectionBg } from "@/components/sections/section-bg"
import { Button } from "@/components/ui/button"
import { getDoc } from "@/content/documentation"
import { getWebinar, relatedWebinars, webinarSlugs } from "@/content/webinars"

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return webinarSlugs().map((slug) => ({ slug }))
}

export const dynamicParams = false

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const webinar = getWebinar(slug)
  if (!webinar) return { title: "Session not found", robots: { index: false, follow: true } }
  return {
    title: webinar.title,
    description: webinar.description,
    alternates: { canonical: `/resources/webinars/${slug}` },
    openGraph: {
      title: webinar.title,
      description: webinar.description,
      type: "article",
      url: `/resources/webinars/${slug}`,
    },
  }
}

export default async function WebinarPage({ params }: Props) {
  const { slug } = await params
  const webinar = getWebinar(slug)
  if (!webinar) notFound()

  const docs = webinar.relatedDocs
    .map((docSlug) => getDoc(docSlug))
    .filter((doc): doc is NonNullable<typeof doc> => Boolean(doc))
  const others = relatedWebinars(slug)

  return (
    <>
      {/* Header */}
      <section className="relative overflow-hidden bg-surface py-12 md:py-16">
        <SectionBg variant="contour" />
        <div className="container relative">
          <nav aria-label="Breadcrumb" className="mb-6">
            <Link
              href="/resources/webinars"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              All sessions
            </Link>
          </nav>

          <div className="max-w-3xl">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 font-mono text-xs tracking-[0.18em] text-primary uppercase">
              <Video className="h-4 w-4" aria-hidden="true" />
              <span>{webinar.topic}</span>
            </p>
            <h1 className="font-display text-4xl font-medium tracking-tight md:text-5xl">
              {webinar.title}
            </h1>
            <p className="prose-body mt-4 text-lg text-muted-foreground">{webinar.description}</p>
            <p className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarClock className="h-4 w-4" aria-hidden="true" />
              {webinar.durationMinutes} minutes · {webinar.outline.length} steps
            </p>
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="py-12 md:py-16">
        <div className="container">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
            <div className="lg:col-span-2">
              {webinar.videoUrl ? (
                <div className="mb-10 aspect-video overflow-hidden rounded-lg border bg-card shadow-soft">
                  <iframe
                    src={webinar.videoUrl}
                    className="h-full w-full"
                    title={`${webinar.title} recording`}
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="mb-10 rounded-lg border bg-card p-6 shadow-soft">
                  <h2 className="font-display text-lg font-medium">No recording published</h2>
                  <p className="mt-2 text-muted-foreground">
                    We are not going to embed a video that does not exist. What follows is the
                    outline the session works through, in order — every step names a page or a
                    setting you can open yourself. When a recording is published it appears above
                    this note.
                  </p>
                  {webinar.demoRoute ? (
                    <Button className="mt-5" asChild>
                      <Link href={webinar.demoRoute}>
                        Follow it in the dashboard
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </Button>
                  ) : null}
                </div>
              )}

              <h2 className="font-display text-2xl font-medium tracking-tight md:text-3xl">
                Session outline
              </h2>
              <p className="mt-2 text-muted-foreground">
                What the session covers, step by step.
              </p>

              <ol className="mt-8 space-y-6">
                {webinar.outline.map((step, index) => (
                  <li key={step.title} className="flex gap-4">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-sm text-primary">
                      {index + 1}
                    </span>
                    <div className="rounded-lg border bg-card p-5 shadow-soft">
                      <h3 className="font-display text-lg font-medium">{step.title}</h3>
                      <p className="mt-2 leading-relaxed text-muted-foreground">{step.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <aside className="space-y-8 lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-lg border bg-card p-6 shadow-soft">
                <h2 className="mb-4 inline-flex items-center gap-2 font-display text-lg font-medium">
                  <BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />
                  Read the same ground
                </h2>
                <ul className="space-y-3">
                  {docs.map((doc) => (
                    <li key={doc.slug}>
                      <Link
                        href={`/resources/documentation/${doc.slug}`}
                        className="group block text-sm"
                      >
                        <span className="inline-flex items-center gap-1 font-medium text-primary group-hover:underline">
                          {doc.title}
                          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                        <span className="mt-0.5 block text-muted-foreground">{doc.description}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                {webinar.relatedProduct ? (
                  <Link
                    href={webinar.relatedProduct}
                    className="mt-5 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    Product page <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                ) : null}
              </div>

              <div className="rounded-lg border bg-card p-6 shadow-soft">
                <h2 className="font-display mb-4 text-lg font-medium">Other sessions</h2>
                <ul className="space-y-4">
                  {others.map((item) => (
                    <li key={item.slug}>
                      <Link
                        href={`/resources/webinars/${item.slug}`}
                        className="group block rounded-md p-2 -m-2 hover:bg-surface"
                      >
                        <span className="block font-medium group-hover:text-primary">{item.title}</span>
                        <span className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{item.topic}</span>
                          <span aria-hidden="true">·</span>
                          <span>{item.durationMinutes} min</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/resources/webinars"
                  className="mt-5 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  All sessions <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* Propose a session */}
      <section className="bg-surface py-16 md:py-20">
        <div className="container">
          <div className="mx-auto grid max-w-4xl grid-cols-1 items-center gap-8 md:grid-cols-[1fr_auto]">
            <div>
              <h2 className="font-display text-2xl font-medium tracking-tight md:text-3xl">
                Want a session on something else?
              </h2>
              <p className="mt-3 text-muted-foreground">
                Tell us what your team is stuck on and we will say honestly whether we can cover it.
              </p>
            </div>
            <Button size="lg" asChild>
              <Link href="/contact">
                Propose a session
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary text-primary-foreground">
        <div className="container flex flex-col items-center gap-6 py-16 text-center md:py-20">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-medium tracking-tight md:text-4xl">
              Get the outline by email
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-primary-foreground/80 md:text-base">
              One email when a session outline or a recording is published. No tracking pixels.
            </p>
          </div>
          <div className="w-full max-w-md">
            <NewsletterForm source={`webinar-${slug}`} inverse showHeading={false} />
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
