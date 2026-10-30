import { Suspense } from "react"
import KpisClient, { KpisSkeleton } from "./kpis-client"

export const dynamic = "force-dynamic"

export default function OpsKpisPage() {
  return (
    <Suspense fallback={<KpisSkeleton />}>
      <KpisClient />
    </Suspense>
  )
}
