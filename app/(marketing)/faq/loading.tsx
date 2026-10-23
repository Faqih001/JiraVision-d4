import { Skeleton } from "@/components/ui/skeleton"

export default function FAQLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="h-16 border-b bg-background/95 backdrop-blur"></div>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-24 md:py-32 relative">
          <div className="container relative">
            <div className="max-w-3xl mx-auto text-center">
              <Skeleton className="h-6 w-32 mx-auto mb-4" />
              <Skeleton className="h-16 w-full max-w-2xl mx-auto mb-6" />
              <Skeleton className="h-6 w-full max-w-xl mx-auto mb-8" />
              <Skeleton className="h-12 w-full max-w-xl mx-auto" />
            </div>
          </div>
        </section>

        {/* FAQ Categories */}
        <section className="py-12 border-b">
          <div className="container">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-xl" />
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Accordion */}
        <section className="py-24">
          <div className="container">
            <div className="max-w-3xl mx-auto">
              <Skeleton className="h-10 w-48 mb-8" />

              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-md" />
                ))}
              </div>

              <Skeleton className="h-10 w-48 mt-16 mb-8" />

              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-md" />
                ))}
              </div>

              <Skeleton className="h-10 w-48 mt-16 mb-8" />

              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-md" />
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <div className="bg-background border-t py-12"></div>
    </div>
  )
}
