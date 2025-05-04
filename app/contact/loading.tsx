import { Skeleton } from "@/components/ui/skeleton"

export default function ContactLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="h-16 border-b bg-background/95 backdrop-blur"></div>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-24 md:py-32 relative">
          <div className="container relative">
            <div className="max-w-3xl mx-auto text-center">
              <Skeleton className="h-16 w-full max-w-xl mx-auto mb-6" />
              <Skeleton className="h-6 w-full max-w-2xl mx-auto" />
            </div>
          </div>
        </section>

        {/* Contact Form Section */}
        <section className="py-16">
          <div className="container">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
              {/* Contact Form */}
              <div>
                <Skeleton className="h-[600px] w-full rounded-xl" />
              </div>

              {/* Contact Information */}
              <div className="space-y-8">
                <div>
                  <Skeleton className="h-10 w-64 mb-6" />
                  <Skeleton className="h-4 w-full max-w-md mb-8" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-40 w-full rounded-xl" />
                  ))}
                </div>

                <div className="mt-8">
                  <Skeleton className="h-6 w-40 mb-4" />
                  <Skeleton className="h-[300px] w-full rounded-xl" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <div className="bg-background border-t py-12"></div>
    </div>
  )
}
