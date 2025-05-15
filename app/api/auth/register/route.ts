import { NextResponse } from "next/server"
import { signup } from "@/lib/auth-actions"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    
    // Auto-set confirmPassword to be the same as password for the API endpoint
    const password = formData.get("password") as string;
    if (password) {
      formData.set("confirmPassword", password);
    }
    
    const result = await signup(formData)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "An unexpected error occurred",
      },
      { status: 500 },
    )
  }
}
