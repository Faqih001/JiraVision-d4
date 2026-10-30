import { Suspense } from "react"
import LogsClient, { LogsSkeleton } from "./logs-client"

export const dynamic = "force-dynamic"

export default function OpsLogsPage() {
  return (
    <Suspense fallback={<LogsSkeleton />}>
      <LogsClient />
    </Suspense>
  )
}
