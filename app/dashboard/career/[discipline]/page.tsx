import { Suspense } from "react"
import { notFound } from "next/navigation"
import { isLadderDiscipline } from "@/lib/career/ladder-seed"
import CareerClient from "../career-client"
import { CareerSkeleton } from "../readiness-panel"

export const dynamic = "force-dynamic"

export default async function CareerDisciplinePage({
  params,
}: {
  params: Promise<{ discipline: string }>
}) {
  const { discipline } = await params
  if (!isLadderDiscipline(discipline)) notFound()

  return (
    <Suspense fallback={<CareerSkeleton />}>
      <CareerClient discipline={discipline} />
    </Suspense>
  )
}
