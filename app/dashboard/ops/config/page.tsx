import { Suspense } from "react"
import OpsConfigClient, { ConfigSkeleton } from "./config-client"

export const dynamic = "force-dynamic"

export default function OpsConfigPage() {
  return (
    <Suspense fallback={<ConfigSkeleton />}>
      <OpsConfigClient />
    </Suspense>
  )
}
