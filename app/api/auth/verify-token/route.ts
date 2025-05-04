import { NextResponse } from "next/server"
import { verifyResetToken } from "@/lib/auth-actions"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token") || ""
    const result = await verifyResetToken(token)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Verify token error:", error)
    return NextResponse.json(
      {
        valid: false,
        message: "An unexpected error occurred",
      },
      { status: 500 },
    )
  }
}
