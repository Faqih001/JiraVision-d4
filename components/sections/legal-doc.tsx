import Link from "next/link"
import { FileText, ArrowUp, ArrowRight } from "lucide-react"
import { Section } from "@/components/sections/section"
import { Button } from "@/components/ui/button"
import { PrintButton } from "@/components/features/print-button"
import type { BgVariant } from "@/components/sections/section-bg"
import type { LegalBullet, LegalSection } from "@/content/legal"
import { legalLastReviewed } from "@/content/legal"
import { cn } from "@/lib/utils"

export interface LegalDocProps {
  /** Anchor id of the document header, target of the "Back to top" link. Must be unique on the page. */
  topId: string
  /** Small badge label above the title, e.g. "Legal". */
  eyebrow: string
  title: string
  lastUpdated: string
  sections: LegalSection[]
  /** Friendly closing sentence shown above the contact CTA (may be empty). */
  closingNote?: string
  /** Cross-links to the other legal documents (this page's own link is filtered out). */
  related: { label: string; href: string }[]
  /** This page's own route, removed from the related-links list, e.g. "/terms". */
  selfHref: string
  /** Calm decorative variant for the header band. */
  bg?: BgVariant
  /** Same variant reused on the non-adjacent closing band (never adjacent to the header). */
  closingBg?: BgVariant
}

function Bullet({ bullet }: { bullet: LegalBullet }) {
  if (typeof bullet === "string") return <li>{bullet}</li>
  const externalProps = bullet.external
    ? { target: "_blank" as const, rel: "noopener noreferrer" }
    : {}
  return (
    <li>
      {bullet.text && (
        <>
          {bullet.text}{" "}
        </>
      )}
      <a
        href={bullet.href}
        className="text-primary underline underline-offset-4 hover:no-underline"
        {...externalProps}
      >
        {bullet.linkLabel ?? bullet.text}
      </a>
    </li>
  )
}

/**
 * Shared renderer for the five legal/utility documents: header band, sticky
 * table of contents at lg+, numbered anchored sections, cross-links, contact
 * band, print button and back-to-top anchor. Server component; the only client
 * island is the print button.
 */
export function LegalDoc({
  topId,
  eyebrow,
  title,
  lastUpdated,
  sections,
  closingNote,
  related,
  selfHref,
  bg,
  closingBg,
}: LegalDocProps) {
  const otherRelated = related.filter((r) => r.href !== selfHref)

  return (
    <>
      {/* Header band */}
      <Section bg={bg}>
        <div className="mx-auto max-w-3xl">
          <div
            id={topId}
            className="scroll-mt-28 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary"
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            <span>{eyebrow}</span>
          </div>
          <h1 className="font-display mt-4 text-4xl font-medium tracking-tight md:text-5xl">{title}</h1>
          <p className="prose-body mt-3 text-muted-foreground">Last updated: {lastUpdated}</p>
          {/* NOTE(PLACEHOLDER) lives in content/legal.ts — this line renders the owner-confirmed date only. */}
          <p className="mt-1 text-sm text-muted-foreground">Last reviewed: {legalLastReviewed}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3 print:hidden">
            <PrintButton />
          </div>
        </div>
      </Section>

      {/* TOC + body */}
      <Section>
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-14">
          <nav aria-label="Table of contents" className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:self-start lg:overflow-y-auto print:hidden">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">On this page</p>
            <ol className="mt-3 space-y-2 text-sm">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="block rounded-md px-2 py-1 leading-snug text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                  {i + 1}. {s.heading}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <article className="min-w-0 max-w-3xl">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} className="mb-10 scroll-mt-28 last:mb-0">
                <h2 className="font-display text-2xl font-medium tracking-tight">
                  {i + 1}. {s.heading}
                </h2>
                {s.paragraphs.map((p, pi) => (
                  <p key={pi} className="prose-body mt-3 whitespace-pre-line">
                    {p}
                  </p>
                ))}
                {s.bullets && (
                  <ul className="prose-body mt-3 list-disc space-y-1 pl-6 marker:text-clay">
                    {s.bullets.map((b, bi) => (
                      <Bullet key={bi} bullet={b} />
                    ))}
                  </ul>
                )}
                {s.subsections?.map((sub, si) => (
                  <div key={si} className="mt-5">
                    <h3 className="text-lg font-semibold">{sub.heading}</h3>
                    {sub.paragraphs.map((p, pi) => (
                      <p key={pi} className="prose-body mt-2 whitespace-pre-line">
                        {p}
                      </p>
                    ))}
                    {sub.bullets && (
                      <ul className="prose-body mt-2 list-disc space-y-1 pl-6 marker:text-clay">
                        {sub.bullets.map((b, bi) => (
                          <Bullet key={bi} bullet={b} />
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </section>
            ))}

            <p className="mt-10">
              <a
                href={`#${topId}`}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                <ArrowUp className="h-4 w-4" aria-hidden="true" />
                Back to top
              </a>
            </p>
          </article>
        </div>
      </Section>

      {/* Closing band: contact CTA + cross-links */}
      <Section bg={closingBg} className={cn("border-t border-border/60")}>
        <div className="mx-auto max-w-3xl">
          {closingNote ? (
            <p className="prose-body mb-6 text-muted-foreground">{closingNote}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/contact">
              <Button className="gap-2 rounded-full">
                Contact Us <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </Link>
          </div>

          {otherRelated.length > 0 && (
            <nav aria-label="Related legal documents" className="mt-10 border-t border-border/60 pt-6">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Related documents
              </p>
              <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                {otherRelated.map((r) => (
                  <li key={r.href}>
                    <Link
                      href={r.href}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {r.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
      </Section>
    </>
  )
}
