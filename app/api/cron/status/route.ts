// GET /api/cron/status — when the hourly schedule last fired, and what it found.
//
// Session-gated, unlike its neighbour /api/cron/hourly: Vercel signs that one with a bearer secret,
// this one is read by a signed-in member on the reports, automation and email surfaces. The bearer
// header opens nothing here.
//
// `data: null` means the table is empty — the scheduler has never fired. A failed read answers 500
// instead, so the UI can tell "never" apart from "cannot answer".

import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { readHeartbeat } from "../_heartbeat"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await getSession()
  if (!session || typeof session.id !== "number") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
  }

  try {
    return NextResponse.json({ success: true, data: await readHeartbeat() })
  } catch (error) {
    console.error("Scheduler status read failed:", error)
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 })
  }
}