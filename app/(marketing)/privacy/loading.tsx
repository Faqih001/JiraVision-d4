import { Skeleton } from "@/components/ui/skeleton"

export default function PrivacyLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="h-16 border-b bg-background/95 backdrop-blur"></div>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 bg-muted/30">
          <div className="container">
            <div className="max-w-3xl mx-auto">
              <Skeleton className="h-6 w-32 mb-4" />
              <Skeleton className="h-12 w-full max-w-md mb-6" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-12">
          <div className="container">
            <div className="max-w-3xl mx-auto">
              <div className="space-y-6">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />

                <Skeleton className="h-8 w-48 mt-8" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />

                <Skeleton className="h-6 w-40 mt-6" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />

                <Skeleton className="h-6 w-40 mt-6" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />

                <Skeleton className="h-8 w-48 mt-8" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>

              <div className="mt-12 border-t pt-8">
                <Skeleton className="h-4 w-full max-w-md mb-6" />
                <Skeleton className="h-10 w-32" />
              </div>
            </div>
          </div>
        </section>
      </main>

      <div className="bg-background border-t py-12"></div>
    </div>
  )
}
