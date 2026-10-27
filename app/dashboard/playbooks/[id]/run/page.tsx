import { Suspense } from "react"
import RunClient, { RunSkeleton } from "./run-client"

export const dynamic = "force-dynamic"

export default async function PlaybookRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <Suspense fallback={<RunSkeleton />}>
      <RunClient id={id} />
    </Suspense>
  )
}
