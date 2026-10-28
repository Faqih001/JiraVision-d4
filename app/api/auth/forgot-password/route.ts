import { forgotPassword } from "@/lib/auth-actions"
import { authResult, gate, serverError } from "../_respond"

// Five per hour is the ceiling on sending mail to an arbitrary address. The action still answers
// "if your email is registered..." so a blocked probe cannot confirm one.
export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const email = formData.get("email")

    const { blocked } = gate(request, "forgot-password", typeof email === "string" ? email : undefined)
    if (blocked) return blocked

    return authResult(await forgotPassword(formData))
  } catch (error) {
    console.error("Forgot password route error:", error)
    return serverError()
  }
}
