import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import PlanEditorClient from "./plan-editor-client"

export const dynamic = "force-dynamic"

function PlanEditorSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  )
}

export default function PlanEditorPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<PlanEditorSkeleton />}>
      <PlanEditorClient params={params} />
    </Suspense>
  )
}
