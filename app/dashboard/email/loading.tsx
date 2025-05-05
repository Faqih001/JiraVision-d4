import { Skeleton } from "@/components/ui/skeleton"

export default function EmailLoading() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-32" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Email Sidebar Skeleton */}
        <div className="md:col-span-1 space-y-4">
          <Skeleton className="h-10 w-full" />

          <div className="space-y-2">
            {Array(6)
              .fill(0)
              .map((_, i) => (
                <Skeleton key={`folder-${i}`} className="h-10 w-full" />
              ))}
          </div>

          <Skeleton className="h-1 w-full" />

          <div>
            <Skeleton className="h-5 w-24 mb-2" />
            <div className="space-y-2">
              {Array(5)
                .fill(0)
                .map((_, i) => (
                  <Skeleton key={`label-${i}`} className="h-10 w-full" />
                ))}
            </div>
          </div>
        </div>

        {/* Email Content Skeleton */}
        <div className="md:col-span-3">
          <div className="flex justify-between items-center mb-4">
            <Skeleton className="h-10 w-48" />
            <div className="flex items-center gap-2">
              {Array(3)
                .fill(0)
                .map((_, i) => (
                  <Skeleton key={`action-${i}`} className="h-9 w-9" />
                ))}
            </div>
          </div>

          <div className="space-y-4">
            {Array(4)
              .fill(0)
              .map((_, i) => (
                <Skeleton key={`email-${i}`} className="h-[150px] w-full" />
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
