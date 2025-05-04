import { NextResponse } from "next/server"
import { login } from "@/lib/auth-actions"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const result = await login(formData)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "An unexpected error occurred",
      },
      { status: 500 },
    )
  }
}
