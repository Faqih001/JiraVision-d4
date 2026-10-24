import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
}

// Nearest not-found boundary for the marketing route group. Without it, a
// notFound() thrown from a page inside app/(marketing) renders an empty <main>
// instead of the root boundary.
export default function MarketingNotFound() {
  return (
    <section className="py-24">
      <div className="container max-w-3xl text-center">
        <p className="font-display text-sm tracking-[0.2em] text-muted-foreground uppercase">404</p>
        <h1 className="font-display text-4xl font-medium tracking-tight md:text-5xl">Page not found</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          We can&apos;t find the page you&apos;re looking for. It may have been moved or deleted, or the
          address may have been typed incorrectly.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-3 font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
          >
            Back to home
          </Link>
          <Link
            href="/resources/blog"
            className="inline-flex items-center justify-center rounded-md border border-border bg-surface px-5 py-3 font-medium text-foreground shadow-sm transition hover:bg-muted"
          >
            Browse the blog
          </Link>
        </div>
        <p className="mt-10 text-sm text-muted-foreground">
          Press <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">⌘</kbd>{" "}
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">K</kbd> (or{" "}
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">Ctrl</kbd>{" "}
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">K</kbd>) anywhere to
          search the site.
        </p>
      </div>
    </section>
  )
}
