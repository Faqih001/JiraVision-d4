import { Suspense } from "react"
import { WorklogSkeleton } from "./sections"
import WorklogClient from "./worklog-client"

export const dynamic = "force-dynamic"

export default function WorklogPage() {
  return (
    <Suspense fallback={<WorklogSkeleton />}>
      <WorklogClient />
    </Suspense>
  )
}
