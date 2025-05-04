import { NextResponse } from "next/server"
import { forgotPassword } from "@/lib/auth-actions"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const result = await forgotPassword(formData)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Forgot password error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "An unexpected error occurred",
      },
      { status: 500 },
    )
  }
}
