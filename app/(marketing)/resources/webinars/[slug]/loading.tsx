import { Skeleton } from "@/components/ui/skeleton"

export default function WebinarLoading() {
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="mb-8">
        <Skeleton className="h-10 w-32" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Skeleton className="h-12 w-3/4 mb-4" />
          <Skeleton className="h-6 w-1/2 mb-6" />

          <div className="flex gap-2 mb-6">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
          </div>

          <div className="flex gap-4 mb-8">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-24" />
          </div>

          <Skeleton className="aspect-video w-full mb-8" />

          <div className="mb-4">
            <Skeleton className="h-10 w-72" />
          </div>

          <Skeleton className="h-64 w-full mb-8" />

          <Skeleton className="h-16 w-full" />
        </div>

        <div>
          <div>
            <Skeleton className="h-64 w-full mb-8" />
            <Skeleton className="h-48 w-full mb-8" />

            <Skeleton className="h-6 w-48 mb-4" />
            <div className="space-y-4">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
