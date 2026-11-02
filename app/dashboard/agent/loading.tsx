import { Skeleton } from "@/components/ui/skeleton"

export default function AgentLoading() {
  return (
    <div className="container mx-auto py-4 px-2 sm:px-4 md:px-6 lg:px-8 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    </div>
  )
}
