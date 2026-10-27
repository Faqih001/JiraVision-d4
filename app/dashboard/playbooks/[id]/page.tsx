import { Suspense } from "react"
import PlaybookEditor, { EditorSkeleton } from "./playbook-editor"

export const dynamic = "force-dynamic"

export default async function PlaybookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <PlaybookEditor id={id} />
    </Suspense>
  )
}
