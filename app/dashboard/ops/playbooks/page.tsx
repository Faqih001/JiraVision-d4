import { Suspense } from "react"
import OpsPlaybooksClient, { PlaybooksSkeleton } from "./playbooks-client"

export const dynamic = "force-dynamic"

export default function OpsPlaybooksPage() {
  return (
    <Suspense fallback={<PlaybooksSkeleton />}>
      <OpsPlaybooksClient />
    </Suspense>
  )
}
