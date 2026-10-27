import { Suspense } from "react"
import { AssistantSkeleton } from "./components"
import AssistantClient from "./assistant-client"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "AI Assistant | JiraVision",
  description: "Ask questions about your work, tasks, and reports",
}

export default function AssistantPage() {
  return (
    <Suspense fallback={<AssistantSkeleton />}>
      <AssistantClient />
    </Suspense>
  )
}
