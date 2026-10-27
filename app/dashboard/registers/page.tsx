import { Suspense } from "react"
import RegistersClient, { RegistersSkeleton } from "./registers-client"

export const dynamic = "force-dynamic"

export default function RegistersPage() {
  return (
    <Suspense fallback={<RegistersSkeleton />}>
      <RegistersClient />
    </Suspense>
  )
}
