import { Skeleton } from "@/components/ui/skeleton"

export default function RetrosLoading() {
  return (
    <div className="container mx-auto py-4 px-2 sm:px-4 md:px-6 lg:px-8 space-y-4">
      <Skeleton className="h-96 w-full" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  )
}
