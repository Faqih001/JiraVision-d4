import type { Metadata } from "next"
import Link from "next/link"
import { LifeBuoy, Search } from "lucide-react"

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
}

// Root boundary: routes outside app/(marketing) have no other not-found, and
// none of their layouts render a <main>, so this one owns the landmark.
export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-6 py-16">
      <div className="w-full max-w-3xl text-center">
        <p className="font-display text-sm tracking-[0.2em] text-muted-foreground uppercase">404</p>
        <h1 className="font-display mt-4 text-4xl font-medium tracking-tight md:text-5xl">
          Page not found
        </h1>
        <p className="prose-body mx-auto mt-4 text-lg text-muted-foreground">
          We can&apos;t find the page you&apos;re looking for. It may have been moved or deleted, or
          the address may have been typed incorrectly.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-3 font-medium text-primary-foreground shadow-soft transition hover:bg-primary/90"
          >
            Back to home
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-card px-5 py-3 font-medium text-foreground shadow-soft transition hover:bg-muted"
          >
            <LifeBuoy className="h-4 w-4" aria-hidden="true" />
            Contact support
          </Link>
        </div>

        <p className="mt-10 text-sm text-muted-foreground">
          <Search className="mr-1 inline h-4 w-4 align-text-bottom" aria-hidden="true" />
          Press{" "}
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">
            ⌘
          </kbd>{" "}
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">
            K
          </kbd>{" "}
          (or{" "}
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">
            Ctrl
          </kbd>{" "}
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">
            K
          </kbd>
          ) anywhere to search the site.
        </p>
      </div>
    </main>
  )
}
