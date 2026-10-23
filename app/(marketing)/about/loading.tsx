import { Skeleton } from "@/components/ui/skeleton"

export default function AboutLoading() {
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
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-32" />
              </div>
            </div>
          </div>
        </section>

        {/* Our Story Section */}
        <section className="py-24">
          <div className="container">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
              <Skeleton className="h-[500px] w-full rounded-xl" />
              <div className="flex flex-col gap-8">
                <div>
                  <Skeleton className="h-6 w-32 mb-4" />
                  <Skeleton className="h-12 w-full mb-6" />
                  <Skeleton className="h-4 w-full mb-4" />
                  <Skeleton className="h-4 w-full mb-4" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-24 bg-muted/30">
          <div className="container">
            <div className="text-center mb-16">
              <Skeleton className="h-6 w-32 mx-auto mb-4" />
              <Skeleton className="h-12 w-full max-w-md mx-auto mb-4" />
              <Skeleton className="h-4 w-full max-w-xl mx-auto" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-64 w-full rounded-xl" />
              ))}
            </div>
          </div>
        </section>
      </main>

      <div className="bg-background border-t py-12"></div>
    </div>
  )
}
