import { Suspense } from "react"
import ReportsClient, { ReportsSkeleton } from "./reports-client"

export const dynamic = "force-dynamic"

export default function OpsReportsPage() {
  return (
    <Suspense fallback={<ReportsSkeleton />}>
      <ReportsClient />
    </Suspense>
  )
}
