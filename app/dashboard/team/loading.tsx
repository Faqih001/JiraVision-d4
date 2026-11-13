import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="p-6 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-card border rounded-lg overflow-hidden">
            <div className="p-6">
              <div className="flex justify-center mb-4">
                <Skeleton className="h-20 w-20 rounded-full" />
              </div>
              <Skeleton className="h-5 w-24 mx-auto mb-2" />
              <Skeleton className="h-4 w-32 mx-auto mb-4" />
              <div className="flex justify-center gap-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </div>
            <div className="border-t p-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
