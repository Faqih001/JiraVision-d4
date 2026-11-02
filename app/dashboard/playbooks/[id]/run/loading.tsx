import { Skeleton } from "@/components/ui/skeleton"

export default function PlaybookRunLoading() {
  return (
    <div className="container mx-auto py-4 px-2 sm:px-4 md:px-6 lg:px-8 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-96 w-full" />
      <div className="flex gap-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  )
}
