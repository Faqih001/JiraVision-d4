import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import PlannerClient from "./planner-client"

export const dynamic = "force-dynamic"

function PlannerSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  )
}

export default function PlannerPage() {
  return (
    <Suspense fallback={<PlannerSkeleton />}>
      <PlannerClient />
    </Suspense>
  )
}
