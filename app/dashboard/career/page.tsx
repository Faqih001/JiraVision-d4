import { Suspense } from "react"
import CareerClient from "./career-client"
import { CareerSkeleton } from "./readiness-panel"

export const dynamic = "force-dynamic"

export default function CareerPage() {
  return (
    <Suspense fallback={<CareerSkeleton />}>
      <CareerClient />
    </Suspense>
  )
}
