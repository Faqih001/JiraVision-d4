import { Skeleton } from "@/components/ui/skeleton"
import { Loader, PulseLoader } from "@/components/ui/loader"

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

      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <Loader size="lg" className="mx-auto" />
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Loading Team Data</h3>
            <p className="text-sm text-muted-foreground">Fetching the latest team information</p>
          </div>
          <PulseLoader className="justify-center mt-4" />
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
