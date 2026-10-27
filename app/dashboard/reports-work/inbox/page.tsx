import { Suspense } from "react"
import InboxClient from "./inbox-client"

export const dynamic = "force-dynamic"

function InboxSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="h-64 animate-pulse rounded border bg-muted" />
    </div>
  )
}

export default function InboxPage() {
  return (
    <Suspense fallback={<InboxSkeleton />}>
      <InboxClient />
    </Suspense>
  )
}
