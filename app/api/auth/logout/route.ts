import { NextResponse } from "next/server"
import { endSession } from "@/lib/session"

/**
 * POST /api/auth/logout — sign this device out.
 *
 * The row is marked revoked rather than deleted, so the account keeps the record that a device
 * was signed out, and a token lifted from a browser stops working at the same moment. A database
 * that cannot be reached never blocks a logout: the cookie goes either way, and revokeSession
 * swallows its own write failure.
 */
export async function POST() {
  await endSession()
  return NextResponse.json({ success: true })
}
