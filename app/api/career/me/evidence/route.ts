// /api/career/me/evidence — the rows behind one signal on the member's readiness meter
// (design §11). Readable by that member only; scoped by the session id, never by a query
// id. The total comes from the same counter the meter uses, so the list and the number
// cannot tell different stories.

import { NextResponse } from "next/server"
import { bad, careerSession } from "../../_shared"
import { collectCareerEvidence } from "@/lib/career/evidence"
import { countCareerSignals } from "@/lib/career/counts"
import { CAREER_WINDOW_DAYS, isCareerSignalKey } from "@/lib/career/signals"
import { isLadderDiscipline } from "@/lib/career/ladder-seed"
import { localDay, shiftDays } from "@/lib/worklog/local-day"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const member = await careerSession()
  if (!member) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const params = new URL(request.url).searchParams
  const signal = params.get("signal")
  const discipline = params.get("discipline")

  if (!isCareerSignalKey(signal)) return bad("Unknown career signal")
  if (discipline !== null && !isLadderDiscipline(discipline)) {
    return bad("Unknown career discipline")
  }

  const today = localDay(new Date(), member.timezone)
  const windowStart = shiftDays(today, -(CAREER_WINDOW_DAYS - 1))

  try {
    const [evidence, signals] = await Promise.all([
      collectCareerEvidence({
        userId: member.id,
        startDay: windowStart,
        timeZone: member.timezone,
        keys: [signal],
      }),
      countCareerSignals({
        userId: member.id,
        startDay: windowStart,
        timeZone: member.timezone,
      }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        signal,
        discipline,
        rows: evidence[signal].rows,
        truncated: evidence[signal].truncated,
        total: signals[signal],
        windowStart,
        windowDays: CAREER_WINDOW_DAYS,
        asOf: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("Career evidence error:", error)
    return NextResponse.json({ error: "Failed to load evidence" }, { status: 500 })
  }
}
