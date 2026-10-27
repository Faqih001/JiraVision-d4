import { Suspense } from "react"
import PlaybooksClient, { PlaybooksSkeleton } from "./playbooks-client"

export const dynamic = "force-dynamic"

export default function PlaybooksPage() {
  return (
    <Suspense fallback={<PlaybooksSkeleton />}>
      <PlaybooksClient />
    </Suspense>
  )
}
