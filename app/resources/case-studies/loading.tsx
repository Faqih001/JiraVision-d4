import { Skeleton } from "@/components/ui/skeleton"

export default function CaseStudiesLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Navbar Skeleton */}
      <div className="border-b">
        <div className="container h-16 flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
      </div>

      <main className="flex-1">
        {/* Hero Section Skeleton */}
        <section className="py-16 bg-gradient-to-b from-slate-50 to-white">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <Skeleton className="h-6 w-32 mx-auto mb-6" />
              <Skeleton className="h-12 w-full max-w-2xl mx-auto mb-4" />
              <Skeleton className="h-6 w-full max-w-xl mx-auto mb-8" />

              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <Skeleton className="h-10 w-full sm:w-64" />
                <Skeleton className="h-10 w-32" />
              </div>

              <div className="flex flex-wrap justify-center gap-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-8 w-24" />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Featured Case Study Skeleton */}
        <section className="py-16 bg-white">
          <div className="container">
            <div className="text-center mb-12">
              <Skeleton className="h-6 w-40 mx-auto mb-4" />
              <Skeleton className="h-10 w-full max-w-2xl mx-auto" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <Skeleton className="h-[400px] rounded-xl" />
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div>
                    <Skeleton className="h-5 w-32 mb-1" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mb-8">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i}>
                      <Skeleton className="h-4 w-20 mb-1" />
                      <Skeleton className="h-5 w-24" />
                    </div>
                  ))}
                </div>

                <div className="space-y-4 mb-8">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>

                <div className="flex flex-wrap gap-4">
                  <Skeleton className="h-10 w-40" />
                  <Skeleton className="h-10 w-48" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Case Studies Grid Skeleton */}
        <section className="py-16 bg-slate-50">
          <div className="container">
            <div className="flex flex-col md:flex-row gap-8 md:gap-4 justify-between items-start md:items-center mb-12">
              <div>
                <Skeleton className="h-10 w-48 mb-2" />
                <Skeleton className="h-5 w-64" />
              </div>
              <Skeleton className="h-9 w-32" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200">
                  <Skeleton className="h-48 w-full" />
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <Skeleton className="h-5 w-32" />
                    </div>
                    <Skeleton className="h-7 w-full mb-2" />
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-3/4 mb-4" />

                    <Skeleton className="h-5 w-32 mb-2" />
                    <div className="space-y-2 mb-4">
                      {[1, 2, 3].map((j) => (
                        <div key={j} className="flex items-start gap-2">
                          <Skeleton className="h-4 w-4 mt-0.5" />
                          <Skeleton className="h-4 w-full" />
                        </div>
                      ))}
                    </div>
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 text-center">
              <Skeleton className="h-10 w-48 mx-auto" />
            </div>
          </div>
        </section>

        {/* Footer Skeleton */}
        <div className="border-t">
          <div className="container py-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="h-6 w-24 mb-4" />
                  {[1, 2, 3, 4].map((j) => (
                    <Skeleton key={j} className="h-4 w-32" />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
