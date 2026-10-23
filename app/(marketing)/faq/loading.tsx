import { Skeleton } from "@/components/ui/skeleton"

// Streaming skeleton for the rebuilt /faq page — mirrors the new PageHero +
// explorer layout (the old one also nested a second <main>, which the
// marketing layout already provides).
export default function FAQLoading() {
  return (
    <div>
      <section className="border-b bg-surface">
        <div className="container grid items-center gap-12 py-16 md:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div>
            <Skeleton className="mb-4 h-4 w-40" />
            <Skeleton className="h-14 w-full max-w-xl" />
            <Skeleton className="mt-5 h-6 w-full max-w-lg" />
            <Skeleton className="mt-8 h-11 w-44 rounded-full" />
          </div>
        </div>
      </section>
      <section className="relative py-16 md:py-24">
        <div className="container">
          <Skeleton className="mb-4 h-5 w-36" />
          <Skeleton className="mb-8 h-10 w-72" />
          <Skeleton className="mb-6 h-11 w-full max-w-xl rounded-full" />
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full max-w-3xl rounded-lg" />
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
