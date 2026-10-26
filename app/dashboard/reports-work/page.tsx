import { Suspense } from "react"
import { ReportsSkeleton } from "./sections"
import ReportsClient from "./reports-client"

export const dynamic = "force-dynamic"

export default function ReportsWorkPage() {
  return (
    <Suspense fallback={<ReportsSkeleton />}>
      <ReportsClient />
    </Suspense>
  )
}
