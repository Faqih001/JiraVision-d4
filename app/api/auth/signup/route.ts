import { NextResponse } from "next/server"
import { signup } from "@/lib/auth-actions"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const result = await signup(formData)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "An unexpected error occurred",
      },
      { status: 500 },
    )
  }
}
