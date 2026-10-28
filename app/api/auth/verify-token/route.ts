import { NextResponse } from "next/server"
import { verifyResetToken } from "@/lib/auth-actions"
import { authResult, gate } from "../_respond"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token") || ""

    const { blocked } = gate(request, "verify-token")
    if (blocked) return blocked

    return authResult(await verifyResetToken(token))
  } catch (error) {
    console.error("Verify token route error:", error)
    return NextResponse.json({ valid: false, message: "An unexpected error occurred" }, { status: 500 })
  }
}
