import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"

export function AssistantSkeleton() {
  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 h-[calc(100vh-12rem)]">
        {/* Sidebar skeleton */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-8 w-16" />
          </div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </Card>

        {/* Main skeleton */}
        <Card className="flex flex-col">
          <div className="p-4 border-b">
            <Skeleton className="h-7 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex-1 p-4">
            <div className="space-y-4">
              <Skeleton className="h-20 w-3/4" />
              <Skeleton className="h-20 w-2/3 ml-auto" />
              <Skeleton className="h-20 w-3/4" />
            </div>
          </div>
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-10" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
