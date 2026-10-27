import { Suspense } from "react"
import AgentClient, { AgentSkeleton } from "./agent-client"

export const dynamic = "force-dynamic"

export default function AgentPage() {
  return (
    <Suspense fallback={<AgentSkeleton />}>
      <AgentClient />
    </Suspense>
  )
}
