import type { Metadata } from "next"
import Link from "next/link"
import { changelog } from "@/content/changelog"
import { Section } from "@/components/sections/section"

export const metadata: Metadata = {
  title: "Changelog — JiraVision",
  description: "What shipped in JiraVision, newest first.",
  alternates: { canonical: "/changelog" },
}

const categoryStyle = {
  Feature: "bg-primary/10 text-primary",
  Improvement: "bg-chart-moss/15 text-[hsl(var(--success))]",
  Fix: "bg-muted text-muted-foreground",
} as const

export default function ChangelogPage() {
  return (
    <>
      <Section bg="dots" className="border-b pb-12 pt-16 md:pb-16">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-clay">Changelog</p>
        <h1 className="font-display text-4xl font-medium tracking-tight md:text-5xl">What shipped</h1>
        <p className="prose-body mt-3 text-muted-foreground">
          Every notable change to JiraVision, newest first. No hype, just what changed.
        </p>
      </Section>

      <Section className="pt-12">
        <ol className="relative space-y-12 border-l pl-6 md:space-y-16 md:pl-8">
          {changelog.map((entry) => (
            <li key={`${entry.version}-${entry.title}`} className="relative">
              <span
                aria-hidden="true"
                className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full border-2 border-background bg-primary md:-left-[39px]"
              />
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <time dateTime={entry.date}>
                  {new Date(`${entry.date}T00:00:00`).toLocaleDateString("en", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
                <span className="rounded-full border px-2 py-0.5 font-medium">v{entry.version}</span>
                <span className={`rounded-full px-2 py-0.5 font-medium ${categoryStyle[entry.category]}`}>
                  {entry.category}
                </span>
              </div>
              <h2 className="mt-2 font-display text-xl font-medium tracking-tight md:text-2xl">{entry.title}</h2>
              <p className="prose-body mt-2 text-sm leading-relaxed text-muted-foreground md:text-base">{entry.body}</p>
            </li>
          ))}
        </ol>
        <p className="mt-14 text-sm text-muted-foreground">
          Looking for something older? <Link href="/contact" className="font-medium text-primary hover:underline">Ask us</Link>.
        </p>
      </Section>
    </>
  )
}
