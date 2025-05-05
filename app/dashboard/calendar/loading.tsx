import { Skeleton } from "@/components/ui/skeleton"

export default function CalendarLoading() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      {/* Calendar Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-9 w-9" />
        </div>
        <Skeleton className="h-9 w-48" />
      </div>

      {/* Calendar Grid Skeleton */}
      <div className="grid grid-cols-7 gap-1">
        {/* Day Headers */}
        {Array(7)
          .fill(0)
          .map((_, i) => (
            <Skeleton key={`header-${i}`} className="h-8 w-full" />
          ))}

        {/* Calendar Days */}
        {Array(35)
          .fill(0)
          .map((_, i) => (
            <Skeleton key={`day-${i}`} className="h-[100px] w-full" />
          ))}
      </div>

      {/* Upcoming Events Skeleton */}
      <div>
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(3)
            .fill(0)
            .map((_, i) => (
              <Skeleton key={`event-${i}`} className="h-[200px] w-full" />
            ))}
        </div>
      </div>

      {/* Team Availability Skeleton */}
      <div>
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    </div>
  )
}
