import { NextResponse } from "next/server"
import { resetPassword } from "@/lib/auth-actions"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const result = await resetPassword(formData)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Reset password error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "An unexpected error occurred",
      },
      { status: 500 },
    )
  }
}
